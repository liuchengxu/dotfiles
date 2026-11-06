import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
  "@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { default: extension, dockTask } = await jiti.import(new URL("../extensions/bash-background.ts", import.meta.url).pathname);

test("a dock label is one line: edge newlines that pass validation are stripped from the description", () => {
  const task = { id: "bg-1", command: "sleep 1", description: "\nRun a short check\n", startedAt: 0, state: "running" };
  assert.deepEqual(dockTask(task), { id: "bg-1", label: "Run a short check", startedAt: 0, state: "running" });
});

test("the 30-character cut never leaves a lone surrogate half", () => {
  const task = { id: "bg-1", command: "sleep 1", description: "a".repeat(30) + "\u{1F600}", startedAt: 0, state: "running" };
  const label = dockTask(task).label;
  assert.equal(label, "a".repeat(30));
  assert.equal([...label].length, 30);
});

test("bg_wait for a background task is blocked with a clear reason", async () => {
  const s = session();
  try {
    const id = await s.background("sleep 60");
    const result = s.emit("tool_call", { toolName: "bg_wait", input: { id } });
    assert.equal(result?.block, true);
    assert.equal(result?.terminate, true);
    assert.match(result?.reason ?? "", /not a subagent run.*Do not call bg_wait/);
  } finally { s.shutdown(); }
});

test("bg_logs is allowed twice per cooldown, then blocked", () => {
  const s = session();
  try {
    const call = () => s.emit("tool_call", { toolName: "bg_logs", input: { id: "bg-1" } });
    assert.equal(call(), undefined, "first call passes");
    assert.equal(call(), undefined, "second call passes");
    const third = call();
    assert.equal(third?.block, true);
    assert.equal(third?.terminate, true);
    assert.match(third?.reason ?? "", /2 times.*Do other work or end your turn/);
  } finally { s.shutdown(); }
});

test("bg_status (list all) is rate-limited globally", () => {
  const s = session();
  try {
    const call = () => s.emit("tool_call", { toolName: "bg_status", input: {} });
    assert.equal(call(), undefined);
    assert.equal(call(), undefined);
    assert.equal(call(), undefined);
    const fourth = call();
    assert.equal(fourth?.block, true);
    assert.equal(fourth?.terminate, true);
    assert.match(fourth?.reason ?? "", /3 times.*Do other work or end your turn/);
  } finally { s.shutdown(); }
});

test("a task state change resets poll eligibility", async () => {
  const s = session();
  try {
    const id = await s.background("exit 0");
    const call = () => s.emit("tool_call", { toolName: "bg_logs", input: { id } });
    assert.equal(call(), undefined);
    assert.equal(call(), undefined);
    assert.equal(call()?.block, true, "third call blocked while running");
    await s.finish(id);
    assert.equal(call(), undefined, "completed task resets eligibility");
  } finally { s.shutdown(); }
});

test("the refusal text uses the task's actual state, not fabricated liveness", () => {
  const s = session();
  try {
    const call = () => s.emit("tool_call", { toolName: "bg_logs", input: { id: "bg-nonexistent" } });
    assert.equal(call(), undefined);
    assert.equal(call(), undefined);
    const third = call();
    assert.equal(third?.block, true);
    assert.match(third?.reason ?? "", /state: unknown/);
  } finally { s.shutdown(); }
});

test("bg_wait for an unknown task falls through to pi-subagents", () => {
  const s = session();
  try {
    assert.equal(s.emit("tool_call", { toolName: "bg_wait", input: { id: "run-999" } }), undefined);
  } finally { s.shutdown(); }
});

/** A loaded extension with helpers that replay pi's run events against it. */
function session() {
  const handlers = new Map();
  const tools = new Map();
  const sent = [];
  const renderers = [];
  extension({
    on(event, handler) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
    registerTool(tool) { tools.set(tool.name, tool); },
    sendMessage(message, options) { sent.push({ message, options }); },
    registerCommand() {}, registerMessageRenderer() {}, registerShortcut() {},
    registerToolRenderer(factory) { renderers.push(factory); },
  });
  const emit = (event, payload) => {
    let result;
    for (const handler of handlers.get(event) ?? []) result = handler(payload, {}) ?? result;
    return result;
  };
  const call = async (name, input, toolCallId = "call") => {
    const result = await tools.get(name).execute(toolCallId, input, undefined, undefined, { cwd: tmpdir() });
    return result.content[0].text;
  };
  return {
    emit,
    call,
    sent,
    renderer(toolName) { return renderers[0](toolName, () => undefined); },
    start() { emit("agent_start", { type: "agent_start" }); },
    async background(command) {
      return /bg-\d+/.exec(await this.backgroundText(command))[0];
    },
    backgroundText(command) { return call("bash", { command, description: `Run ${command}`, run_in_background: true }); },
    watch(command, pattern) { return call("bg_watch", { command, pattern, description: `Watch ${command}` }); },
    logs(id, toolCallId) { return call("bg_logs", { id }, toolCallId); },
    /** Waits for a task to finish. A nested call (a codemode script's) is
     * not seen by the model, so polling marks nothing as read. */
    async finish(id) {
      for (let i = 0; i < 200; i++) {
        if (/^\[\S+ (completed|failed|killed)/.test(await call("bg_logs", { id }, "script/1"))) return;
        await sleep(25);
      }
      throw new Error(`${id} did not finish`);
    },
    settle(overrides = {}) {
      return emit("agent_before_settle", { type: "agent_before_settle", entries: [], continue: false, outcome: "completed", context: { canContinue: false }, ...overrides });
    },
    settled(aborted = false) { emit("agent_settled", { type: "agent_settled", aborted }); },
    shutdown() { emit("session_shutdown", {}); },
  };
}

test("a background start tells the agent to keep working or end the turn, not to wait or poll", async () => {
  const pi = session();
  const text = await pi.backgroundText("true");
  assert.match(text, /You will be woken when it completes\. Meanwhile do other work, or end the turn if nothing else is left\./);
  assert.match(text, /Do not call bg_wait or poll bg_status\/bg_logs\./);
  assert.match(text, /continue the task it belongs to/);
  assert.doesNotMatch(text, /Use bg_status to list tasks/);
  await pi.finish(/bg-\d+/.exec(text)[0]);
});

test("a completion during a run is steered mid-run exactly once, however the agent reads the log", async () => {
  const s = session();
  try {
    s.start();
    const id = await s.background("exit 0");
    await s.finish(id);
    assert.equal(s.sent.length, 1);
    assert.deepEqual(s.sent[0].options, { triggerTurn: false, deliverAs: "steer" });
    assert.match(s.sent[0].message.content, /<summary>completed successfully<\/summary>/);
    assert.match(await s.logs(id), new RegExp(`^\\[${id} completed, exit 0\\]`));
    assert.equal(s.settle(), undefined, "nothing is held for settle");
    s.settled();
    assert.equal(s.sent.length, 1, "reading the log changes nothing; settle does not re-deliver");
  } finally { s.shutdown(); }
});

test("completions during a run are steered as they happen, never held for settle", async () => {
  const s = session();
  try {
    s.start();
    const failed = await s.background("exit 3");
    const passed = await s.background("exit 0");
    await s.finish(failed);
    await s.finish(passed);
    assert.equal(s.sent.length, 2, "each completion steered mid-run");
    for (const notice of s.sent) assert.deepEqual(notice.options, { triggerTurn: false, deliverAs: "steer" });
    assert.deepEqual(s.sent.map((notice) => notice.message.details.state).sort(), ["completed", "failed"]);
    assert.match(s.sent.map((notice) => notice.message.content).join("\n"), /<exit>3<\/exit>/);
    assert.equal(s.settle(), undefined);
    s.settled();
    assert.equal(s.sent.length, 2, "delivered once, not again after settle");
  } finally { s.shutdown(); }
});

test("a result read only inside a codemode script does not change delivery", async () => {
  const s = session();
  try {
    s.start();
    const id = await s.background("exit 3");
    await s.finish(id);
    await s.logs(id, "codemode-call/2");
    assert.equal(s.sent.length, 1);
    assert.equal(s.sent[0].message.details.state, "failed");
    assert.equal(s.settle(), undefined);
  } finally { s.shutdown(); }
});

test("a watch match is steered even when the agent read the finished log", async () => {
  const s = session();
  try {
    s.start();
    const id = /bg-\d+/.exec(await s.watch("echo ready", "ready"))[0];
    await s.finish(id);
    assert.match(await s.logs(id), /completed, exit 0/);
    const summaries = s.sent.map((notice) => notice.message.details.summary);
    assert.equal(summaries.length, 2, "match and exit are both steered; the log read drops nothing");
    assert.match(summaries[0], /output matched/);
    assert.match(summaries[1], /completed after "ready" matched/);
    assert.equal(s.settle(), undefined);
  } finally { s.shutdown(); }
});

test("a watch match does not suppress the later exit notification", async () => {
  const s = session();
  try {
    s.start();
    const id = /bg-\d+/.exec(await s.watch("echo ready; sleep 0.2; exit 3", "ready"))[0];
    await s.finish(id);
    const summaries = s.sent.map((notice) => notice.message.details.summary);
    assert.equal(summaries.length, 2, "match and exit are both steered mid-run");
    assert.match(summaries[0], /output matched/);
    assert.match(summaries[1], /failed with exit code 3/);
  } finally { s.shutdown(); }
});

test("a matched watch that exits 0 reports a consistent outcome", async () => {
  const s = session();
  try {
    s.start();
    const id = /bg-\d+/.exec(await s.watch("echo ready", "ready"))[0];
    await s.finish(id);
    const summaries = s.sent.map((notice) => notice.message.details.summary);
    assert.equal(summaries.length, 2);
    assert.match(summaries[0], /output matched/);
    assert.match(summaries[1], /completed after "ready" matched/);
  } finally { s.shutdown(); }
});

test("killOnMatch delivers the match and the kill outcome", async () => {
  const s = session();
  try {
    s.start();
    const id = /bg-\d+/.exec(await s.call("bg_watch", {
      command: "echo ready; sleep 60", pattern: "ready", killOnMatch: true, description: "Watch and kill",
    }))[0];
    await s.finish(id);
    const summaries = s.sent.map((notice) => notice.message.details.summary);
    assert.equal(summaries.length, 2);
    assert.match(summaries[0], /output matched/);
    assert.match(summaries[1], /killed/);
  } finally { s.shutdown(); }
});

test("bg_kill on a settled task is blocked with its actual state", async () => {
  const s = session();
  try {
    const id = await s.background("exit 0");
    await s.finish(id);
    const result = s.emit("tool_call", { toolName: "bg_kill", input: { id } });
    assert.equal(result?.block, true);
    assert.equal(result?.terminate, true);
    assert.match(result?.reason ?? "", /already completed.*killing it again changes nothing/);
  } finally { s.shutdown(); }
});

test("bg_kill on a running task passes the guard", async () => {
  const s = session();
  try {
    const id = await s.background("sleep 60");
    assert.equal(s.emit("tool_call", { toolName: "bg_kill", input: { id } }), undefined);
  } finally { s.shutdown(); }
});

test("an idle agent is woken at once; a running agent is steered, and an aborted run adds nothing", async () => {
  const s = session();
  try {
    await s.finish(await s.background("exit 0"));
    assert.equal(s.sent.length, 1);
    assert.deepEqual(s.sent[0].options, { triggerTurn: true, deliverAs: "followUp" });

    s.start();
    await s.finish(await s.background("exit 1"));
    assert.equal(s.sent.length, 2);
    assert.deepEqual(s.sent[1].options, { triggerTurn: false, deliverAs: "steer" });
    assert.equal(s.settle({ outcome: "aborted" }), undefined);
    s.settled(true);
    assert.equal(s.sent.length, 2, "the steered notice is not re-delivered after an abort");
  } finally { s.shutdown(); }
});

test("steered notices leave nothing for settle, even after an error outcome", async () => {
  const s = session();
  try {
    s.start();
    const a = await s.background("exit 1");
    const b = await s.background("exit 2");
    await s.finish(a);
    await s.finish(b);
    assert.equal(s.sent.length, 2, "both steered mid-run");
    assert.equal(s.settle({ outcome: "error" }), undefined);
    s.settled();
    assert.equal(s.sent.length, 2, "nothing left for settle");
  } finally { s.shutdown(); }
});

test("expanding a collapsed tool row does not hand our component to the built-in renderer", () => {
  const s = session();
  try {
    const renderer = s.renderer("edit");
    const theme = { fg: (_color, text) => text, bg: (_color, text) => text, bold: (text) => text };
    const args = { path: "src/lib.rs", edits: [{ oldText: "a", newText: "b" }] };
    const result = { content: [{ type: "text", text: "Found 2 occurrences of edits[0] in src/lib.rs. Each oldText must be unique." }], details: {} };
    const context = (expanded, lastComponent) => ({
      args, toolCallId: "e1", invalidate() {}, lastComponent, state: {}, cwd: tmpdir(), executionStarted: true, argsComplete: true,
      isPartial: false, expanded, showImages: false, isError: true, outputPad: 1,
    });
    const collapsed = renderer.renderResult(result, { expanded: false, isPartial: false }, theme, context(false));
    const expanded = renderer.renderResult(result, { expanded: true, isPartial: false }, theme, context(true, collapsed));
    assert.match(expanded.render(120).join("\n"), /Each oldText must be unique/);
    const call = renderer.renderCall(args, theme, context(false));
    assert.doesNotThrow(() => renderer.renderCall(args, theme, context(true, call)).render(120));
  } finally { s.shutdown(); }
});

test("a collapsed edit row shows a path in the footer's worktree relative to it", () => {
  const s = session();
  const current = Symbol.for("pi.worktree-status.current");
  globalThis[current] = "/r/.agents/worktrees/fix-a";
  try {
    const theme = { fg: (_color, text) => text, bg: (_color, text) => text, bold: (text) => text };
    const component = (tool, args) => s.renderer(tool).renderCall(args, theme, { args, toolCallId: "e2", invalidate() {}, state: {}, cwd: tmpdir(),
      executionStarted: true, argsComplete: true, isPartial: true, expanded: false, showImages: false, isError: false, outputPad: 1 });
    const row = (path) => component("edit", { path, edits: [{ oldText: "a", newText: "b" }] }).render(200).join("\n");
    assert.match(row("/r/.agents/worktrees/fix-a/src/lib.rs"), /Update src\/lib\.rs/);
    assert.match(row("/r/.agents/worktrees/fix-b/src/lib.rs"), /Update ⎇ fix-b\/src\/lib\.rs/);
    assert.match(component("read", { path: "/r/.agents/worktrees/fix-a/README.md" }).render(200).join("\n"), /Read \(README\.md\)/);
    assert.match(component("write", { path: "/r/.agents/worktrees/fix-a/new.txt", content: "x" }).render(200).join("\n"), /Write \(new\.txt\)/);
    // A drawn row follows the footer: after a switch it must not read as a path in the new worktree.
    const drawn = component("edit", { path: "/r/.agents/worktrees/fix-a/src/lib.rs", edits: [{ oldText: "a", newText: "b" }] });
    globalThis[current] = "/r/.agents/worktrees/fix-b";
    assert.match(drawn.render(200).join("\n"), /Update ⎇ fix-a\/src\/lib\.rs/);
  } finally {
    delete globalThis[current];
    s.shutdown();
  }
});

test("a background task is one row: the header carries its id, time, and exit", async () => {
  const s = session();
  // The command runs until the test creates this file, so the running
  // display is checked while the task is certainly still running.
  const release = join(tmpdir(), `bg-row-release-${process.pid}-${Date.now()}`);
  try {
    const renderer = s.renderer("bash");
    const theme = { fg: (_color, text) => text, bg: (_color, text) => text, bold: (text) => text };
    const command = `while [ ! -e '${release}' ]; do sleep 0.05; done; exit 2`;
    const id = await s.background(command);
    const args = { command, description: "Wait then fail" };
    const context = { args, toolCallId: "call", invalidate() {}, state: {}, cwd: tmpdir(), executionStarted: true, argsComplete: true, isPartial: false, expanded: false, showImages: false, isError: false, outputPad: 1 };
    const header = () => renderer.renderCall(args, theme, context).render(120)[0];
    const handoff = (state = {}) => renderer.renderResult({ content: [{ type: "text", text: "" }], details: { handoff: `started ${id}` } }, { expanded: false, isPartial: false }, theme, { ...context, state }).render(120);
    assert.match(header(), new RegExp(`Wait then fail · ${id} · \\d+s$`));
    assert.doesNotMatch(header(), /Running/, "the spinner says it");
    assert.deepEqual(handoff(), [], "no second row while the header is visible");
    assert.match(handoff({ folded: true })[0], new RegExp(`^↳ Wait then fail · ${id} · Running · \\d+s$`), "a row without the spinner says Running");
    writeFileSync(release, "");
    await s.finish(id);
    assert.match(header(), new RegExp(`^✗ Wait then fail · ${id} · Failed \\(exit code 2\\) · \\d+s$`));
    assert.deepEqual(handoff(), []);
    assert.match(renderer.renderCall(args, theme, context).render(40)[0], /Failed \(exit code 2\)/, "a narrow row cuts the time, not the exit code");
    assert.match(handoff({ folded: true })[0], new RegExp(`^↳ Wait then fail · ${id} · Failed \\(exit code 2\\) · \\d+s$`), "a hidden header leaves one named row");
  } finally {
    rmSync(release, { force: true });
    s.shutdown();
  }
});
