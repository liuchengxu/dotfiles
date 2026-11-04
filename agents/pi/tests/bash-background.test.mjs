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
const { default: extension } = await jiti.import(new URL("../extensions/bash-background.ts", import.meta.url).pathname);

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
    sent,
    renderer(toolName) { return renderers[0](toolName, () => undefined); },
    start() { emit("agent_start", { type: "agent_start" }); },
    async background(command) {
      const text = await call("bash", { command, description: `Run ${command}`, run_in_background: true });
      return /bg-\d+/.exec(text)[0];
    },
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

test("a completion the agent already read is not delivered again", async () => {
  const s = session();
  try {
    s.start();
    const id = await s.background("exit 0");
    await s.finish(id);
    assert.match(await s.logs(id), new RegExp(`^\\[${id} completed, exit 0\\]`));
    assert.equal(s.settle(), undefined, "no continuation for a result the agent saw");
    s.settled();
    assert.equal(s.sent.length, 0, "and no follow-up turn after the final answer");
  } finally { s.shutdown(); }
});

test("unread completions arrive together at settle in one continuation, though the preview says it cannot continue", async () => {
  const s = session();
  try {
    s.start();
    const failed = await s.background("exit 3");
    const passed = await s.background("exit 0");
    await s.finish(failed);
    await s.finish(passed);
    assert.equal(s.sent.length, 0, "nothing is queued as a follow-up mid-run");
    const earlier = { type: "custom_message", customType: "other", content: "x", display: true };
    const result = s.settle({ entries: [earlier] });
    assert.equal(result?.continue, true);
    assert.equal(result.entries[0], earlier, "entries from earlier handlers are kept");
    // Both commands exit at once, so their notices arrive in either order.
    const notices = result.entries.slice(1).sort((a, b) => a.details.state.localeCompare(b.details.state));
    assert.deepEqual(notices.map((entry) => entry.details.state), ["completed", "failed"]);
    assert.match(notices[1].content, /<exit>3<\/exit>/);
    s.settled();
    assert.equal(s.sent.length, 0, "delivered once, not again after settle");
  } finally { s.shutdown(); }
});

test("a result read only inside a codemode script is still delivered", async () => {
  const s = session();
  try {
    s.start();
    const id = await s.background("exit 3");
    await s.finish(id);
    await s.logs(id, "codemode-call/2");
    assert.equal(s.settle()?.entries.length, 1, "the model never saw the nested result");
  } finally { s.shutdown(); }
});

test("a watch match gets through even after the agent read the finished log", async () => {
  const s = session();
  try {
    s.start();
    const id = /bg-\d+/.exec(await s.watch("echo ready", "ready"))[0];
    await s.finish(id);
    assert.match(await s.logs(id), /completed, exit 0/);
    const result = s.settle();
    assert.equal(result?.continue, true);
    assert.equal(result.entries.length, 1);
    assert.match(result.entries[0].details.summary, /output matched/);
  } finally { s.shutdown(); }
});

test("an idle agent is woken at once; an aborted run records without waking", async () => {
  const s = session();
  try {
    await s.finish(await s.background("exit 0"));
    assert.equal(s.sent.length, 1);
    assert.deepEqual(s.sent[0].options, { triggerTurn: true, deliverAs: "followUp" });

    s.start();
    await s.finish(await s.background("exit 1"));
    assert.equal(s.settle({ outcome: "aborted" }), undefined);
    s.settled(true);
    assert.equal(s.sent.length, 2);
    assert.deepEqual(s.sent[1].options, { triggerTurn: false });
  } finally { s.shutdown(); }
});

test("notices left for agent_settled wake the agent once for the whole batch", async () => {
  const s = session();
  try {
    s.start();
    const a = await s.background("exit 1");
    const b = await s.background("exit 2");
    await s.finish(a);
    await s.finish(b);
    assert.equal(s.settle({ outcome: "error" }), undefined);
    s.settled();
    assert.deepEqual(s.sent.map((sent) => sent.message.details.state), ["failed", "failed"]);
    assert.deepEqual(s.sent.map((sent) => sent.options.triggerTurn), [false, true]);
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
