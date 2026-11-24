import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { realpathSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const { default: extension, dockTask, bgHintText, redactSecrets } = await jiti.import(new URL("../extensions/bash-background.ts", import.meta.url).pathname);

test("a dock label is one line: edge newlines that pass validation are stripped from the description", () => {
  const task = { id: "bg-1", command: "sleep 1", description: "\nRun a short check\n", startedAt: 0, state: "running" };
  assert.deepEqual(dockTask(task), { id: "bg-1", label: "Run a short check", startedAt: 0, state: "running" });
});

test("the label is stored whole: no capture-time cut, emoji intact", () => {
  const task = { id: "bg-1", command: "sleep 1", description: "a".repeat(30) + " \u{1F600} verify five findings", startedAt: 0, state: "running" };
  assert.equal(dockTask(task).label, "a".repeat(30) + " \u{1F600} verify five findings");
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
  const messageRenderers = new Map();
  const commands = new Map();
  const widgets = new Map();
  const sent = [];
  const renderers = [];
  const inputHandlers = [];
  const notices = [];
  const shortcuts = new Map();
  extension({
    on(event, handler) {
      const list = handlers.get(event) ?? [];
      handlers.set(event, [...list, handler]);
      return () => handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== handler));
    },
    registerTool(tool) { tools.set(tool.name, tool); },
    sendMessage(message, options) { sent.push({ message, options }); },
    registerCommand(name, def) { commands.set(name, def); },
    registerMessageRenderer(type, renderer) { messageRenderers.set(type, renderer); },
    registerShortcut(id, def) { shortcuts.set(id, def); },
    registerToolRenderer(factory) { renderers.push(factory); },
  });
  const emit = (event, payload, ctx = {}) => {
    let result;
    for (const handler of handlers.get(event) ?? []) result = handler(payload, ctx) ?? result;
    return result;
  };
  const call = async (name, input, toolCallId = "call") => {
    const result = await tools.get(name).execute(toolCallId, input, undefined, undefined, { cwd: tmpdir(), sessionManager: { getSessionId: () => "test", getSessionFile: () => undefined } });
    return result.content[0].text;
  };
  return {
    emit,
    call,
    tool: (name) => tools.get(name),
    sent,
    notices,
    renderer(toolName) { return renderers[0](toolName, () => undefined); },
    messageRenderer(type) { return messageRenderers.get(type); },
    command(name) { return commands.get(name); },
    widgets,
    running: () => (globalThis)[Symbol.for("pi.bash-background.running")] ?? [],
    start() { emit("agent_start", { type: "agent_start" }); },
    /** Registers the terminal-input listener the way a real TUI session does. */
    startTui() {
      emit("session_start", { type: "session_start" }, { mode: "tui", ui: {
        onTerminalInput(handler) { inputHandlers.push(handler); return () => {}; },
        notify(message) { notices.push(message); },
        setStatus() {},
        setWidget(key, lines) { widgets.set(key, lines); },
        theme: { fg: (_token, text) => text },
      } });
    },
    key(data) {
      let last;
      for (const handler of inputHandlers) last = handler(data);
      return last;
    },
    shortcut(id) {
      const def = shortcuts.get(id);
      assert.ok(def, `shortcut ${id} registered`);
      return def.handler();
    },
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
    assert.deepEqual(s.sent[0].options, { triggerTurn: true, deliverAs: "steer" });
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
    for (const notice of s.sent) assert.deepEqual(notice.options, { triggerTurn: true, deliverAs: "steer" });
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
    assert.deepEqual(s.sent[1].options, { triggerTurn: true, deliverAs: "steer" });
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

test("routine GitHub reads fold, but mutations, mutation-named tools and failures remain", () => {
  const s = session();
  try {
    const theme = { fg: (_color, text) => text, bold: text => text };
    const render = (tool, args, extra = {}) => s.renderer(tool).renderCall(args, theme, {
      args, state: {}, expanded: false, isPartial: false, isError: false, ...extra,
    }).render(160);
    for (const command of ["gh pr view 42 --json title", "gh issue list --repo owner/repo", "gh run view 123 --log-failed", "gh api repos/owner/repo/pulls --paginate", "gh api -X GET repos/owner/repo/issues"]) {
      const args = { command, description: "Inspect GitHub state" };
      assert.deepEqual(render("bash", args), [], command);
      assert.match(render("bash", args, { expanded: true }).join("\n"), new RegExp(command.replaceAll(".", "\\.")), "Ctrl+O shows the command text of " + command);
      assert.ok(render("bash", args, { isError: true }).length, "failure stays: " + command);
    }
    for (const command of ["cat README.md", "git status --short", "rg -n pattern agents/", "gh api --method=GET repos/owner/repo/issues"]) {
      assert.deepEqual(render("bash", { command, description: "Inspect state" }), [], command);
    }
    for (const command of ["gh api -X GET repos/owner/repo", "gh api --method=GET repos/owner/repo", "gh api -XGET repos/owner/repo"]) {
      assert.deepEqual(render("bash", { command, description: "Fetch state" }), [], command);
    }
    for (const command of ["gh api repos/o/r/git/refs/heads/topic -?DELETE", "gh api repos/o/r/*", "gh api repos/o/r/git/[r]efs", "gh api repos/o/r/git/refs/heads/topic {-X,DELETE}", "gh api $FLAGS repos/o/r", "gh api repos/o/r/git/refs/heads/topic '--method=DELETE'", "gh api repos/o/r/issues '-ftitle=new'", 'gh pr merge 42', "gh pr comment 42 --body approved", "gh api repos/o/r/issues -f title=new", "gh api graphql -f query=mutation", "gh api -X DELETE repos/o/r", "gh api --method=DELETE repos/o/r", "gh api -XDELETE repos/o/r", "gh api repos/o/r/git/refs/heads/topic -iXDELETE", "gh api repos/o/r/git/refs/heads/topic -iX DELETE", "gh api -ftitle=x repos/o/r", "gh api -Fnum=1 repos/o/r", "gh api --field=title=x repos/o/r", "gh api --input=payload.json repos/o/r", "gh api --method=POST repos/o/r", "gh run rerun 1", "git push", "printf x > .env", "python3 check.py"]) {
      assert.ok(render("bash", { command, description: "Perform requested operation" }).length, command);
    }
    for (const tool of ["mcp__slack__post_message", "mcp__service__deploy", "mcp__github__merge_pull_request"]) {
      assert.ok(render(tool, {}).length, tool + " must not disappear on success");
    }
  } finally { s.shutdown(); }
});

test("collapsed calls are one-line labels with URL credentials omitted from previews", () => {
  const s = session();
  try {
    const theme = { fg: (_color, text) => text, bold: text => text };
    const url = "https://user:password@rpc.example.test/btc/secret-path?key=secret-query";
    const args = { command: `curl '${url}'`, description: `Check endpoint ${url}` };
    const context = { args, state: {}, isPartial: true, expanded: false, isError: false };
    const renderer = s.renderer("bash");
    const lines = renderer.renderCall(args, theme, context).render(200);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /Checking endpoint/, "a running call's verb is progressive");
    assert.doesNotMatch(lines.join("\n"), /password|secret-path|secret-query/);
    assert.ok(args.command.includes(url), "display changes must not alter execution inputs");
    const error = renderer.renderResult({ content: [{ type: "text", text: `Error contacting ${url}` }] }, { expanded: false }, theme, { ...context, isPartial: false, isError: true });
    assert.match(error.render(200).join("\n"), /Error contacting/);
    assert.doesNotMatch(error.render(200).join("\n"), /password|secret-path|secret-query/);
  } finally { s.shutdown(); }
});

test("causal names and dock labels redact credentials, including ghp_ tokens", () => {
  const secret = "https://user:password@rpc.example.test/btc  token ghp_16C7e42F292c6912E7710c838347Ae178B4a";
  const s = session();
  try {
    const theme = { fg: (_color, text) => text, bold: text => text };
    const args = { command: "python3 check.py", description: `Check endpoint ${secret}` };
    const causal = s.renderer("bash").renderCall(args, theme, { args, state: { causal: true }, expanded: false, isPartial: false, isError: false }).render(200).join("\n");
    assert.doesNotMatch(causal, /password|ghp_[0-9A-Za-z]+/);
    assert.match(causal, /Check endpoint https:\/\/<redacted>/);
    const dock = dockTask({ id: "bg-1", command: `curl '${secret}'`, description: `Watch ${secret}`, startedAt: 0, state: "running" });
    assert.doesNotMatch(dock.label, /password|ghp_[0-9A-Za-z]+/);
    assert.match(dock.label, /Watch https:\/\/<redacted>/);
  } finally { s.shutdown(); }
});

test("opaque tokens with trailing hyphens redact; short runs stay; long passwords survive width cuts", () => {
  const hyphens = "A".repeat(32) + "-".repeat(16);
  const short = "B".repeat(35);
  const theme = { fg: (_color, text) => text, bold: text => text };
  const s = session();
  try {
    for (const secret of [hyphens, `https://user:${"pw.".repeat(30)}@example.test/x`]) {
      const label = s.renderer("bash").renderCall({ command: "python3 probe.py", description: `Probe ${secret}` }, theme, { args: {}, state: {}, expanded: false, isPartial: false, isError: false }).render(200).join("\n");
      assert.doesNotMatch(label, /user:|A{16}/, "credential material must not print");
    }
    const keeps = s.renderer("bash").renderCall({ command: "python3 probe.py", description: `Probe ${short}` }, theme, { args: {}, state: {}, expanded: false, isPartial: false, isError: false }).render(200).join("\n");
    assert.match(keeps, new RegExp(short), "a 35-character run is not a credential");
    const dock = dockTask({ id: "bg-1", command: `curl https://user:${"q.".repeat(40)}@h/x`, description: "Watch", startedAt: 0, state: "running" });
    assert.doesNotMatch(dock.label, /user:/);
  } finally { s.shutdown(); }
});

test("a codemode script without a comment renders its fallback label without throwing", () => {
  const s = session();
  try {
    const theme = { fg: (_color, text) => text, bold: text => text };
    for (const code of ["const x = 1;", ""]) {
      const row = s.renderer("codemode").renderCall({ code }, theme, { args: { code }, state: {}, expanded: false, isPartial: true, isError: false }).render(120).join("\n");
      assert.match(row, /Running tool script/, "running without a comment shows the fallback label for " + JSON.stringify(code));
      assert.doesNotMatch(row, /· Running/, "the progressive verb replaces the Running suffix");
    }
    const commented = s.renderer("codemode").renderCall({ code: "// Check https://user:pw@h/x\nconst x = 1;" }, theme, { args: {}, state: {}, expanded: false, isPartial: true, isError: false }).render(200).join("\n");
    assert.match(commented, /Checking https:\/\/<redacted>/, "a leading comment becomes the progressive verb label");
    assert.doesNotMatch(commented, /user:pw/);
  } finally { s.shutdown(); }
});

test("the notification renderer redacts a stall tail longer than the payload cut", () => {
  const s = session();
  try {
    const renderer = s.messageRenderer("bg-task-notification");
    assert.ok(renderer, "bg-task-notification renderer registered");
    const fullTail = `https://user:${"pw.".repeat(140)}@example.test/private\n$&\nPassword:`;
    const payloadTail = fullTail.slice(-400);
    assert.match(redactSecrets(payloadTail), /pw\./, "sanity: a cut tail can no longer be recognized, hence the whole-tail preview");
    const preview = redactSecrets(fullTail).slice(-400).trimEnd();
    const message = {
      content: `<bg-task-notification>\n<id>bg-1</id>\n<summary>waiting for interactive input</summary>\n</bg-task-notification>\nLast output:\n${payloadTail}`,
      details: { id: "bg-1", label: "Probe endpoint", state: "running", summary: "waiting for interactive input", tailPreview: preview },
    };
    const theme = { fg: (_c, t) => t };
    for (const expanded of [true, false]) {
      const rows = renderer(message, { expanded, outputPad: 0 }, theme).render(300).join("\n");
      assert.doesNotMatch(rows, /user:|pw\./, `no credential material in ${expanded ? "expanded" : "collapsed"} view`);
    }
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

test("a collapsed row bolds only its leading verb, progressive while running and past when done", () => {
  const s = session();
  try {
    const theme = { fg: (_color, text) => text, bg: (_color, text) => text, bold: (text) => `**${text}**` };
    const context = (args, extra = {}) => ({ args, toolCallId: "v", invalidate() {}, state: { writeSettled: true }, cwd: tmpdir(),
      executionStarted: true, argsComplete: true, isPartial: true, expanded: false, showImages: false, isError: false, outputPad: 1, ...extra });
    const row = (tool, args, extra) => s.renderer(tool).renderCall(args, theme, context(args, extra)).render(200).join("\n");
    const edit = { path: "/r/src/lib.rs", edits: [{ oldText: "a", newText: "b" }] };
    assert.match(row("edit", edit), /\*\*Editing\*\* \S*src\/lib\.rs/);
    assert.match(row("edit", edit, { isPartial: false }), /\*\*Edited\*\* \S*src\/lib\.rs/, "a mutation persists when done, in past tense");
    assert.match(row("read", { path: "/r/README.md" }), /\*\*Reading\*\* \(\S*README\.md\)/, "a read shows while it runs");
    assert.deepEqual(row("read", { path: "/r/README.md" }, { isPartial: false }), "", "a finished read is a probe and folds away");
    assert.match(row("write", { path: "/r/new.txt", content: "x" }), /\*\*Writing\*\* \(\S*new\.txt\)/);
    assert.match(row("write", { path: "/r/new.txt", content: "x" }, { isPartial: false }), /\*\*Wrote\*\* \(\S*new\.txt\) \(1 line\)/);
    const bash = { command: "sleep 1", description: "Explore the test layout" };
    assert.match(row("bash", bash), /\*\*Exploring\*\* the test layout/);
    assert.match(row("bash", { ...bash, description: "Run the test suite" }), /\*\*Running\*\* the test suite/);
    assert.match(row("bash", { ...bash, description: "Stop the server" }), /\*\*Stopping\*\* the server/, "a known verb takes its progressive form");
    // No rule-based guessing: a verb outside the table stays exactly as written.
    assert.match(row("bash", { ...bash, description: "Open the config" }), /\*\*Open\*\* the config/, "never 'Openning'");
    assert.match(row("bash", { ...bash, description: "Monitor the logs" }), /\*\*Monitor\*\* the logs/, "never 'Monitorring'");
    assert.match(row("bash", { ...bash, description: "constructor checks" }), /\*\*constructor\*\* checks/, "an inherited property is not a verb form");
    // A tool without a label keeps its name while running; never a blank row.
    assert.match(row("mcp__svc__do_thing", {}), /\*\*svc\*\* do thing\n\s+⎿ mcp__svc__do_thing$/, "an unknown tool shows its name while running, never a blank row");
    assert.doesNotMatch(row("bash", bash), /\*\*the test layout\*\*/, "the object of the verb stays normal weight");
    assert.doesNotMatch(row("bash", bash), /· Running/, "the progressive verb replaces the Running suffix");
    // A finished row keeps the author's words: pi cannot inflect arbitrary past tense.
    // A failed bash row persists, so it is where a done-state label is observable.
    assert.deepEqual(row("bash", { ...bash, command: "python3 check.py" }, { isPartial: false, isError: true }), "✗ **Explore** the test layout", "no invented past tense");
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
    assert.match(row("/r/.agents/worktrees/fix-a/src/lib.rs"), /Editing src\/lib\.rs/, "a running call reads progressively");
    assert.match(row("/r/.agents/worktrees/fix-b/src/lib.rs"), /Editing ⎇ fix-b\/src\/lib\.rs/);
    assert.match(component("read", { path: "/r/.agents/worktrees/fix-a/README.md" }).render(200).join("\n"), /Reading \(README\.md\)/);
    assert.match(component("write", { path: "/r/.agents/worktrees/fix-a/new.txt", content: "x" }).render(200).join("\n"), /Writing \(new\.txt\)/);
    // A drawn row follows the footer: after a switch it must not read as a path in the new worktree.
    const drawn = component("edit", { path: "/r/.agents/worktrees/fix-a/src/lib.rs", edits: [{ oldText: "a", newText: "b" }] });
    globalThis[current] = "/r/.agents/worktrees/fix-b";
    assert.match(drawn.render(200).join("\n"), /Editing ⎇ fix-a\/src\/lib\.rs/);
  } finally {
    delete globalThis[current];
    s.shutdown();
  }
});

test("a collapsed error row names the file the way the heading does, and the tool's own absolute path in the message follows", () => {
  const s = session();
  const current = Symbol.for("pi.worktree-status.current");
  globalThis[current] = "/r/.agents/worktrees/fix-a";
  try {
    const theme = { fg: (_color, text) => text, bg: (_color, text) => text, bold: (text) => text };
    const args = { path: "/r/.agents/worktrees/fix-a/src/lib.rs", edits: [{ oldText: "a", newText: "b" }] };
    const result = { content: [{ type: "text", text: `Could not find the exact text in /r/.agents/worktrees/fix-a/src/lib.rs. The old text must match exactly including all whitespace and newlines.` }] };
    const context = { args, toolCallId: "e3", invalidate() {}, state: { detailsCollapsed: true }, cwd: tmpdir(), executionStarted: true, argsComplete: true, isPartial: false, expanded: false, showImages: false, isError: true, outputPad: 1 };
    const row = s.renderer("edit").renderResult(result, { expanded: false, isPartial: false }, theme, context).render(200).join("\n");
    assert.match(row, /^✗ Edited src\/lib\.rs: Could not find the exact text in src\/lib\.rs\./);
    assert.doesNotMatch(row, /\/r\/\.agents/);
  } finally {
    delete globalThis[current];
    s.shutdown();
  }
});

test("the live widget and footer dock stay hidden until /bg pins a task", async () => {
  const s = session();
  try {
    s.startTui();
    const first = await s.background("for i in $(seq 1 14); do echo \"alpha-$i\"; done; sleep 30");
    const second = await s.background("sleep 30");
    await sleep(1500);
    assert.deepEqual(s.running().map((t) => t.id), [], "no footer row while tasks run unpinned");
    assert.equal(s.widgets.get("bg-widget"), undefined, "no widget lines while unpinned");
    const bg = s.command("bg");
    assert.ok(bg, "/bg command registered");
    await bg.handler(first, { ui: { notify() {} } });
    await sleep(1500);
    assert.deepEqual(s.running().map((t) => t.id), [first], "only the pinned task reaches the footer; the other running task stays out");
    const lines = s.widgets.get("bg-widget");
    assert.ok(Array.isArray(lines), "the pinned task streams in the widget");
    assert.match(lines[0], new RegExp(`^◆ ${first} `));
    assert.deepEqual(lines.slice(1), Array.from({ length: 10 }, (_, i) => `  alpha-${i + 5}`), "the tail is exactly the last ten output lines");
    await bg.handler("", { ui: { notify() {} } });
    await sleep(1500);
    assert.deepEqual(s.running(), [], "unpinning empties the footer while both tasks still run");
    assert.equal(s.widgets.get("bg-widget"), undefined, "unpinning hides the widget");
    await s.call("bg_kill", { id: first });
    await s.call("bg_kill", { id: second });
    await s.finish(first);
    await s.finish(second);
  } finally { s.shutdown(); }
});

test("a dock label strips terminal escapes that a bg_watch description can carry", () => {
  const task = { id: "bg-1", command: "sleep 1", description: "\x1b[31mRed\x1b[0m run\u0007", startedAt: 0, state: "running" };
  assert.equal(dockTask(task).label, "Red run");
});

test("a dock label leaves no debris from colon CSI, charset, or DCS sequences", () => {
  const task = { id: "bg-1", command: "sleep 1", description: "a\x1b[38:2:1:2:3mb\x1b(Bc\x1bP1;2q payload\x1b\\d", startedAt: 0, state: "running" };
  assert.equal(dockTask(task).label, "abcd");
});

test("a line that names its own failure outranks a retry note that says could not", () => {
  const s = session();
  const current = Symbol.for("pi.worktree-status.current");
  globalThis[current] = "/r/.agents/worktrees/fix-a";
  try {
    const theme = { fg: (_color, text) => text, bg: (_color, text) => text, bold: (text) => text };
    const args = { path: "/r/.agents/worktrees/fix-a/src/lib.rs", edits: [{ oldText: "a", newText: "b" }] };
    const result = { content: [{ type: "text", text: "Retrying: could not connect to host\nError: permission denied for key" }] };
    const context = { args, toolCallId: "e4", invalidate() {}, state: { detailsCollapsed: true }, cwd: tmpdir(), executionStarted: true, argsComplete: true, isPartial: false, expanded: false, showImages: false, isError: true, outputPad: 1 };
    const row = s.renderer("edit").renderResult(result, { expanded: false, isPartial: false }, theme, context).render(200).join("\n");
    assert.match(row, /✗ Edited src\/lib\.rs: Error: permission denied for key/);
    assert.doesNotMatch(row, /Retrying/);
  } finally {
    delete globalThis[current];
    s.shutdown();
  }
});

test("a drawn error row follows the footer's worktree after a switch", () => {
  const s = session();
  const current = Symbol.for("pi.worktree-status.current");
  globalThis[current] = "/r/.agents/worktrees/fix-a";
  try {
    const theme = { fg: (_color, text) => text, bg: (_color, text) => text, bold: (text) => text };
    const args = { path: "/r/.agents/worktrees/fix-a/src/lib.rs", edits: [{ oldText: "a", newText: "b" }] };
    const result = { content: [{ type: "text", text: "Could not find the exact text in /r/.agents/worktrees/fix-a/src/lib.rs." }] };
    const context = { args, toolCallId: "e5", invalidate() {}, state: { detailsCollapsed: true }, cwd: tmpdir(), executionStarted: true, argsComplete: true, isPartial: false, expanded: false, showImages: false, isError: true, outputPad: 1 };
    const component = s.renderer("edit").renderResult(result, { expanded: false, isPartial: false }, theme, context);
    globalThis[current] = "/r/.agents/worktrees/fix-b";
    assert.match(component.render(200).join("\n"), /✗ Edited ⎇ fix-a\/src\/lib\.rs: Could not find the exact text in ⎇ fix-a\/src\/lib\.rs\./);
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
    assert.match(handoff({ causal: true })[0], new RegExp(`^↳ Wait then fail · ${id} · Running · \\d+s$`), "a row without the spinner says Running");
    writeFileSync(release, "");
    await s.finish(id);
    assert.match(header(), new RegExp(`^✗ Wait then fail · ${id} · Failed \\(exit code 2\\) · \\d+s$`));
    assert.deepEqual(handoff(), []);
    assert.match(renderer.renderCall(args, theme, context).render(40)[0], /Failed \(exit code 2\)/, "a narrow row cuts the time, not the exit code");
    assert.match(handoff({ causal: true })[0], new RegExp(`^↳ Wait then fail · ${id} · Failed \\(exit code 2\\) · \\d+s$`), "a hidden header leaves one named row");
  } finally {
    rmSync(release, { force: true });
    s.shutdown();
  }
});

test("ctrl+b detaches every running foreground call, reports real wall time, and notifies", async (t) => {
  const s = session(); s.startTui();
  let first, second;
  try {
    first = s.tool("bash").execute("c1", { command: "sleep 30 && echo one", description: "Run one" }, undefined, undefined, { cwd: tmpdir(), sessionManager: { getSessionId: () => "test", getSessionFile: () => undefined } });
    second = s.call("bash", { command: "sleep 30 && echo two", description: "Run two" }, "c2");
    await sleep(300);
    assert.equal(s.key("\x02")?.consume, true, "ctrl+b is consumed while calls run");
    assert.equal(s.key("\x02"), undefined, "a second press finds nothing left to detach");
    const [raw, text] = await Promise.all([first, second]);
    assert.match(raw.content[0].text, /moved to the background by keyboard shortcut/);
    assert.match(text, /moved to the background by keyboard shortcut/);
    assert.deepEqual(s.notices, ["Moved 2 running commands to the background"], "one notice; the repeat press added none");
    const wall = raw.structuredContent?.wall_time_seconds;
    assert.ok(typeof wall === "number" && wall >= 0 && wall < 30, `real elapsed seconds, not the 120s budget (got ${wall})`);
    const ids = [String(raw.structuredContent.output).match(/bg-\d+/)?.[0], text.match(/bg-\d+/)?.[0]];
    assert.ok(ids.every(Boolean), "both results carry a task id");
    for (const id of ids) {
      const killed = await s.call("bg_kill", { id });
      assert.match(killed, /SIGTERM|already|killed/, `task ${id} is dead, not leaked`);
    }
  } finally {
    s.shutdown();
  }
});

test("a detached task that finishes on its own reports its real outcome, never 'failed with exit code null'", async () => {
  const s = session(); s.startTui();
  try {
    const marker = join(tmpdir(), `bg-handoff-ok-${process.pid}-${Date.now()}`);
    const release = `${marker}.release`;
    // The command waits for the test's release file, so the detach certainly happens while it runs.
    const command = `while [ ! -e '${release}' ]; do sleep 0.05; done; echo handoff-done`;
    const done = s.tool("bash").execute("c1", { command, description: "Run then finish" }, undefined, undefined, { cwd: tmpdir(), sessionManager: { getSessionId: () => "test", getSessionFile: () => undefined } });
    await sleep(300);
    assert.equal(s.key("\x02")?.consume, true, "ctrl+b detaches the running call");
    const result = await done;
    const id = String(result.structuredContent.output).match(/bg-\d+/)?.[0];
    assert.ok(id, "the handoff result names the task");
    assert.match(await s.call("bg_status", {}), new RegExp(`${id}\\s+running`), "it is running after the handoff");
    // Let the command exit 0 and wait for the task to settle.
    writeFileSync(release, "");
    await s.finish(id);
    const status = await s.call("bg_status", {});
    assert.match(status, new RegExp(`${id}\\s+completed`), `a command that exited 0 is completed:\n${status}`);
    assert.doesNotMatch(status, /exit code null|exit null/);
    const notices = s.sent.filter((entry) => entry.message.customType === "bg-task-notification" && entry.message.details?.id === id);
    assert.equal(notices.length, 1, "exactly one completion notice for the detached task");
    assert.equal(notices[0].message.details.state, "completed");
    assert.match(String(notices[0].message.content), /handoff-done/, "the notice carries the task's real tail");
    assert.doesNotMatch(JSON.stringify(notices[0].message), /exit code null/, "no fabricated null exit code");
  } finally {
    s.shutdown();
  }
});

test("a detached task reports its real exit code and timeout, and bg_kill before the pid is known still ends it", async () => {
  const s = session(); s.startTui();
  const exec = (command, description, extra = {}) => s.tool("bash").execute(`c${Math.random()}`, { command, description, ...extra }, undefined, undefined, { cwd: tmpdir(), sessionManager: { getSessionId: () => "test", getSessionFile: () => undefined } });
  const id = (result) => String(result.structuredContent.output).match(/bg-\d+/)?.[0];
  const noticesFor = (taskId) => s.sent.filter((entry) => entry.message.customType === "bg-task-notification" && entry.message.details?.id === taskId);
  const status = async () => s.call("bg_status", {});
  const gate = join(tmpdir(), `bg-handoff-gate-${process.pid}-${Date.now()}`);
  try {
    // The command waits for the gate, so the handoff cannot lose the race against its exit.
    const failedDone = exec(`while [ ! -e '${gate}' ]; do sleep 0.05; done; echo late-output; exit 7`, "Run then fail");
    await sleep(300);
    assert.equal(s.key("\x02")?.consume, true, "ctrl+b detaches the running call");
    const failed = id(await failedDone);
    assert.match(await status(), new RegExp(`${failed}\\s+running`), "running after the handoff");
    writeFileSync(gate, "");
    await s.finish(failed);
    assert.match(await status(), new RegExp(`${failed}\\s+failed\\s+\\d+s\\s+\\d+B\\s+exit 7`), `exit code 7 is kept:\n${await status()}`);
    const notices = noticesFor(failed);
    assert.equal(notices.length, 1, "one notice for the task");
    assert.equal(notices[0].message.details.state, "failed");
    assert.match(String(notices[0].message.content), /exit code 7[\s\S]*late-output/, "the notice carries the real code and the output written after the handoff");

    // A detached timeout keeps its timeout reason. Two seconds clears the handoff and fits the poll limit.
    const timedOut = id(await (async () => {
      const done = exec("sleep 30; echo never", "Run past the deadline", { timeout: 2 });
      await sleep(300);
      assert.equal(s.key("\x02")?.consume, true, "ctrl+b detaches the running call");
      return done;
    })());
    await s.finish(timedOut);
    assert.match(await status(), new RegExp(`${timedOut}\\s+failed`));
    assert.match(String(noticesFor(timedOut)[0].message.content), /exceeded its 2s timeout/, "the timeout reason survives the handoff");

    // bg_kill straight after the handoff, before the shell has written its pid.
    const earlyDone = exec("sleep 30; echo never", "Run then be stopped early");
    assert.equal(s.key("\x02")?.consume, true, "ctrl+b lands before the command starts");
    const earlyId = id(await earlyDone);
    assert.match(await s.call("bg_kill", { id: earlyId }), /SIGTERM/, "the kill is accepted while the pid is unknown");
    await s.finish(earlyId);
    assert.match(await status(), new RegExp(`${earlyId}\\s+killed`), `a kill before the pid is known ends the task as killed:\n${await status()}`);
    assert.equal(noticesFor(earlyId)[0].message.details.state, "killed", "its notice says killed, not failed");
  } finally {
    rmSync(gate, { force: true });
    s.shutdown();
  }
});

test("bg_kill ends a handoff task as killed and leaves no process behind", async () => {
  const s = session(); s.startTui();
  try {
    const marker = join(tmpdir(), `bg-handoff-kill-${process.pid}-${Date.now()}`);
    const done = s.tool("bash").execute("c1", { command: `ps -o pgid= -p $$ | tr -d ' ' > '${marker}'; sleep 30`, description: "Run then be stopped" }, undefined, undefined, { cwd: tmpdir(), sessionManager: { getSessionId: () => "test", getSessionFile: () => undefined } });
    await sleep(300);
    assert.equal(s.key("\x02")?.consume, true, "ctrl+b detaches the running call");
    const id = String((await done).structuredContent.output).match(/bg-\d+/)?.[0];
    assert.ok(id, "the handoff result names the task");
    assert.match(await s.call("bg_status", {}), new RegExp(`${id}\\s+running`), "it is running after the handoff");
    // The command itself reports its process group, independent of the extension.
    const pgid = Number(readFileSync(marker, "utf8").trim());
    rmSync(marker, { force: true });
    assert.ok(Number.isSafeInteger(pgid) && pgid > 0, `the command reported its process group (got ${pgid})`);
    assert.equal(groupAlive(pgid), true, "the detached process group is alive before the kill");
    const killed = await s.call("bg_kill", { id });
    assert.match(killed, /SIGTERM/, "the kill reaches the detached process");
    await s.finish(id);
    const status = await s.call("bg_status", {});
    assert.match(status, new RegExp(`${id}\\s+killed`), `a stopped handoff task is killed, not failed:\n${status}`);
    assert.doesNotMatch(status, /exit code null/);
    const notices = s.sent.filter((entry) => entry.message.customType === "bg-task-notification" && entry.message.details?.id === id);
    assert.equal(notices.length, 1, "one notice for the stopped task");
    assert.equal(notices[0].message.details.state, "killed");
    assert.doesNotMatch(JSON.stringify(notices[0].message), /exit code null/);
    await sleep(5200); // killTree's TERM-then-KILL grace is 5s.
    assert.equal(groupAlive(pgid), false, "the process group is gone, not orphaned");
  } finally {
    s.shutdown();
  }
});

function groupAlive(pgid) {
  try { process.kill(-pgid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

test("ctrl+shift+b goes through the registered shortcut", async () => {
  const s = session(); s.startTui();
  try {
    const done = s.tool("bash").execute("c1", { command: "sleep 30 && echo one", description: "Run one" }, undefined, undefined, { cwd: tmpdir(), sessionManager: { getSessionId: () => "test", getSessionFile: () => undefined } });
    await sleep(300);
    assert.equal(s.shortcut("ctrl+shift+b"), 1, "the shortcut detaches the one running call");
    assert.match((await done).content[0].text, /moved to the background by keyboard shortcut/);
    assert.deepEqual(s.notices, ["Moved 1 running command to the background"]);
    await s.call("bg_kill", { id: "bg-1" });
  } finally {
    s.shutdown();
  }
});

test("the budget auto-detaches a slow foreground command in a fresh process", async () => {
  if (process.env.PI_BG_BUDGET_MS !== "2000") {
    const env = { ...process.env, PI_BG_BUDGET_MS: "2000" };
    delete env.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, ["--test", "--test-name-pattern=budget auto-detaches", "tests/bash-background.test.mjs"], {
      cwd: process.cwd(), env, encoding: "utf8", timeout: 60_000,
    });
    assert.equal(child.status, 0, `child test run failed: ${child.stdout}\n${child.stderr}`);
    assert.match(`${child.stdout}${child.stderr}`, /pass 1/, "exactly the budget test ran and passed");
    return;
  }
  const s = session();
  try {
    const done = s.tool("bash").execute("c1", { command: "sleep 10 && echo slow", description: "Run slow" }, undefined, undefined, { cwd: tmpdir(), sessionManager: { getSessionId: () => "test", getSessionFile: () => undefined } });
    const result = await done;
    assert.match(result.content[0].text, /ran past 2s and was moved to the background/);
    await s.call("bg_kill", { id: String(result.structuredContent.output).match(/bg-\d+/)?.[0] });
  } finally {
    s.shutdown();
  }
});

test("ctrl+b with nothing running stays cursor-left", () => {
  const s = session(); s.startTui();
  assert.equal(s.key("\x02"), undefined);
  s.shutdown();
});

test("the tool description carries the budget and the manual key", () => {
  const s = session();
  assert.match(s.tool("bash").description, /Commands that run past 120s move to the background automatically/);
  assert.match(s.tool("bash").description, /Ctrl\+B or Ctrl\+Shift\+B converts the running command by hand/);
  s.shutdown();
});

test("the hint text tells tmux users to press twice", () => {
  assert.equal(bgHintText(false), "Ctrl+B to run in background");
  assert.equal(bgHintText(true), "Ctrl+B Ctrl+B to run in background");
});
