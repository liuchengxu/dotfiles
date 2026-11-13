import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { fsCache: false, alias: {
	"@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
	"@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { default: extension, fileControls, IDLE_MS, MIN_TOKENS, DIGEST_KEY, digestLines } = await jiti.import(new URL("../extensions/idle-compaction.ts", import.meta.url).pathname);
const { SessionManager } = await import(pathToFileURL(join(root, "dist/core/session-manager.js")));
const { visibleWidth } = await jiti.import(join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"));

function clock(t) {
  let now = 0;
  const jobs = new Map();
  t.mock.method(globalThis, "setTimeout", (fn, ms) => { const id = { unref() {} }; jobs.set(id, { fn, at: now + ms }); return id; });
  t.mock.method(globalThis, "clearTimeout", (id) => { jobs.delete(id); });
  return { jobs, advance(ms) {
    now += ms;
    for (const [id, job] of [...jobs]) if (job.at <= now && jobs.delete(id)) job.fn();
  } };
}

function host(options = {}) {
  const handlers = new Map(), commands = new Map(), notices = [], calls = [];
  const state = { enabled: true, auto: true, idle: true, pending: false, editor: "", tokens: MIN_TOKENS, session: "s1", stale: false, ...options };
  const entries = options.entries ?? [{ type: "message", id: "m1", message: { role: "assistant" } }];
  let terminalInput;
  let unsubscribed = 0;
  const widgets = [];
  const check = () => { if (state.stale) throw new Error("Stale extension context"); };
  const ctx = {
    mode: options.mode ?? "tui", model: { provider: "test", id: "test" }, cwd: "/test",
    sessionManager: {
      getSessionId() { check(); return state.session; },
      getLeafId() { check(); return entries.at(-1)?.id ?? null; },
      getBranch() { check(); return entries; }, getEntries() { check(); return entries; },
    },
    isIdle: () => state.idle,
    hasPendingMessages: () => state.pending,
    getContextUsage() { check(); return { tokens: state.tokens }; },
    ui: {
      getEditorText: () => state.editor,
      notify: (...args) => { check(); notices.push(args); },
      setWidget: (key, content) => { check(); widgets.push({ key, content }); },
      onTerminalInput(fn) { terminalInput = fn; return () => { terminalInput = undefined; unsubscribed++; }; },
    },
    compact(opts) { if (state.compactThrows) throw Error("cannot compact"); calls.push(opts); },
  };
  const pi = {
    on(event, handler) { handlers.set(event, handler); },
    registerCommand(name, command) { commands.set(name, command); },
    appendEntry(customType, data) { entries.push({ type: "custom", id: `c${entries.length}`, customType, data }); },
  };
  const controls = { enabled: () => state.enabled, setEnabled(value) { state.enabled = value; }, autoCompactionEnabled: () => state.auto };
  extension(pi, controls);
  return { ctx, pi, state, controls, entries, calls, notices, commands, widgets,
    emit: (event, data = {}) => handlers.get(event)?.(data, ctx),
    type: () => terminalInput?.("x"),
    get unsubscribed() { return unsubscribed; },
    hook: (call = calls.at(-1)) => handlers.get("session_before_compact")({ customInstructions: call.customInstructions }, ctx),
  };
}

test("one eligible idle attempt at exactly 45 minutes, with start/finish notices", (t) => {
  const c = clock(t), h = host(); h.emit("session_start");
  c.advance(IDLE_MS - 1); assert.equal(h.calls.length, 0);
  c.advance(1); assert.equal(h.calls.length, 1); assert.equal(h.hook(), undefined);
  assert.ok(h.entries.some(e => e.customType === "idle-compaction-attempt"));
  h.calls[0].onComplete({});
  assert.match(h.notices[0][0], /Compacting after 45/);
  assert.match(h.notices[1][0], /finished/);
  h.emit("agent_settled"); c.advance(IDLE_MS * 3); assert.equal(h.calls.length, 1);
});

test("disabled, headless, busy, pending, draft, small, unknown and non-finite context fail closed", (t) => {
  const c = clock(t);
  for (const option of [{ enabled: false }, { mode: "rpc" }, { mode: "print" }, { mode: "json" }, { auto: false }, { idle: false }, { pending: true }, { editor: "draft" }, { tokens: MIN_TOKENS - 1 }, { tokens: null }, { tokens: undefined }, { tokens: NaN }, { tokens: Infinity }]) {
    const h = host(option); h.emit("session_start"); c.advance(IDLE_MS);
    assert.equal(h.calls.length, 0, JSON.stringify(option)); h.emit("session_shutdown");
  }
  const h = host(); h.ctx.model = undefined; h.emit("session_start"); c.advance(IDLE_MS); assert.equal(h.calls.length, 0);
});

test("typing restarts idle delay without consuming input or changing editor", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS - 1);
  assert.equal(h.type(), undefined); c.advance(1); assert.equal(h.calls.length, 0);
  c.advance(IDLE_MS - 1); assert.equal(h.calls.length, 1);
});

test("new work cancels the timer and settlement starts a full new delay", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS - 1);
  h.emit("input"); h.emit("before_agent_start"); h.emit("message_start");
  c.advance(IDLE_MS * 2); assert.equal(h.calls.length, 0);
  h.entries.push({ type: "message", id: "m2" }); h.emit("agent_settled");
  c.advance(IDLE_MS); assert.equal(h.calls.length, 1);
});

test("switch, fork, tree navigation and shutdown invalidate timers", (t) => {
  const c = clock(t);
  for (const event of ["session_before_switch", "session_before_fork", "session_before_tree", "session_shutdown"]) {
    const h = host(); h.emit("session_start"); h.emit(event); c.advance(IDLE_MS); assert.equal(h.calls.length, 0, event);
    h.emit("session_shutdown");
  }
  const h = host(); h.emit("session_start"); h.state.session = "other"; c.advance(IDLE_MS); assert.equal(h.calls.length, 0);
});

test("model change restarts the delay and changed leaf re-arms a fresh timer", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS - 1);
  h.emit("model_select"); c.advance(1); assert.equal(h.calls.length, 0);
  c.advance(IDLE_MS - 1); assert.equal(h.calls.length, 1); h.calls[0].onComplete({});
  const h2 = host(); h2.emit("session_start"); h2.entries.push({ type: "custom", id: "new-leaf" });
  c.advance(IDLE_MS); assert.equal(h2.calls.length, 0);
  assert.equal(c.jobs.size, 1, "metadata changes must not permanently disable the idle timer");
  c.advance(IDLE_MS); assert.equal(h2.calls.length, 1);
});

test("session rename starts a fresh delay immediately rather than disarming compaction", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS - 1);
  h.entries.push({ type: "session_info", id: "name", name: "New title" });
  h.emit("session_info_changed", { name: "New title" });
  c.advance(IDLE_MS - 1); assert.equal(h.calls.length, 0);
  c.advance(1); assert.equal(h.calls.length, 1);
});

test("pre-compaction hook catches activity during native compact's await boundary", (t) => {
  const c = clock(t);
  for (const change of [h => h.emit("before_agent_start"), h => h.state.pending = true, h => h.state.editor = "new input", h => h.state.enabled = false, h => h.state.auto = false, h => h.state.session = "s2", h => h.entries.push({ type: "message", id: "new" }), h => h.emit("session_shutdown")]) {
    const h = host(); h.emit("session_start"); c.advance(IDLE_MS); change(h);
    assert.deepEqual(h.hook(), { cancel: true }); h.calls[0].onError(Error("cancelled")); h.emit("session_shutdown");
  }
});

test("failed attempts are not retried on repeated settles or reloads; new messages allow another", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS); h.calls[0].onError(Error("offline"));
  assert.match(h.notices.at(-1)[0], /no automatic retry/);
  h.emit("agent_settled"); c.advance(IDLE_MS); assert.equal(h.calls.length, 1);
  h.emit("session_shutdown");
  const reloaded = host({ entries: h.entries }); reloaded.emit("session_start"); c.advance(IDLE_MS); assert.equal(reloaded.calls.length, 0);
  reloaded.entries.push({ type: "message", id: "new-turn" }); reloaded.emit("agent_settled"); c.advance(IDLE_MS); assert.equal(reloaded.calls.length, 1);
});

test("manual compaction cancels timer and compacted history is not re-compacted", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); h.emit("session_before_compact");
  c.advance(IDLE_MS); assert.equal(h.calls.length, 0);
  h.entries.push({ type: "compaction", id: "manual-compact" }, { type: "custom", id: "metadata" });
  h.emit("session_compact"); h.emit("session_start"); c.advance(IDLE_MS); assert.equal(h.calls.length, 0);
});

test("stale callbacks cannot notify or act on a replaced runtime", (t) => {
  const c = clock(t), h = host(); h.emit("session_start");
  const staleTick = [...c.jobs.values()][0].fn;
  h.emit("session_shutdown"); h.state.stale = true; assert.doesNotThrow(staleTick); assert.equal(h.calls.length, 0);
  const h2 = host(); h2.emit("session_start"); c.advance(IDLE_MS); h2.emit("session_shutdown"); h2.state.stale = true;
  assert.doesNotThrow(() => h2.calls[0].onComplete({})); assert.equal(h2.notices.length, 1); assert.equal(h2.unsubscribed, 1);
});

test("synchronous compaction failure is contained and records one attempt", (t) => {
  const c = clock(t), h = host({ compactThrows: true }); h.emit("session_start");
  assert.doesNotThrow(() => c.advance(IDLE_MS)); assert.match(h.notices.at(-1)[0], /stopped or failed/);
  h.emit("agent_settled"); assert.equal(c.jobs.size, 0);
});

test("on/off/status command persists opt-in and off cancels future attempts", async (t) => {
  const c = clock(t), h = host({ enabled: false }); h.emit("session_start");
  const command = h.commands.get("idle-compact"); await command.handler("on", h.ctx); assert.equal(h.state.enabled, true);
  await command.handler("status", h.ctx); assert.match(h.notices.at(-1)[0], /on: 45 minutes/);
  await command.handler("off", h.ctx); c.advance(IDLE_MS); assert.equal(h.calls.length, 0);
  await command.handler("bogus", h.ctx); assert.match(h.notices.at(-1)[0], /Usage:/);
});

test("file controls default off, survive reread, respect auto-compaction and project trust", () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-idle-controls-"));
  try {
    const controls = fileControls(dir); assert.equal(controls.enabled(), false);
    controls.setEnabled(true); assert.equal(fileControls(dir).enabled(), true);
    controls.setEnabled(false); assert.equal(fileControls(dir).enabled(), false);
    writeFileSync(join(dir, "idle-compaction.json"), "invalid"); assert.equal(controls.enabled(), false);
    writeFileSync(join(dir, "settings.json"), JSON.stringify({ compaction: { enabled: false } }));
    assert.equal(controls.autoCompactionEnabled({ cwd: dir, isProjectTrusted: () => false }), false);
    writeFileSync(join(dir, "settings.json"), "invalid");
    assert.equal(controls.autoCompactionEnabled({ cwd: dir, isProjectTrusted: () => false }), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("attempt receipt survives real SessionManager reopen without deleting messages", (t) => {
  const c = clock(t), dir = mkdtempSync(join(tmpdir(), "pi-idle-session-"));
  try {
    const manager = SessionManager.create(dir, dir);
    manager.appendMessage({ role: "user", content: "Continue work", timestamp: Date.now() });
    manager.appendMessage({ role: "assistant", content: [{ type: "text", text: "Done" }], api: "openai-responses", model: "test", provider: "test", stopReason: "stop", usage: { input: 200000, output: 1 }, timestamp: Date.now() });
    const h = host(); h.ctx.sessionManager = manager; h.pi.appendEntry = (type, data) => manager.appendCustomEntry(type, data);
    h.emit("session_start"); c.advance(IDLE_MS); assert.equal(h.calls.length, 1); assert.equal(h.hook(), undefined);
    h.calls[0].onError(Error("offline")); h.emit("session_shutdown");
    const reopened = SessionManager.open(manager.getSessionFile());
    assert.equal(reopened.getEntries().filter(e => e.type === "message").length, 2);
    const h2 = host(); h2.ctx.sessionManager = reopened; h2.emit("session_start"); c.advance(IDLE_MS); assert.equal(h2.calls.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("digest labels pre-compaction tokens and omits estimated task progress", () => {
  const lines = digestLines("## Recap\nReady for review.\nOverall progress: ~15%", 504_792, 120);
  assert.match(lines[0], /504,792 tokens before compaction/);
  assert.match(lines[0], /ctrl\+o full summary/);
  assert.deepEqual(lines.slice(1), ["  Ready for review."]);
  assert.doesNotMatch(lines.join("\n"), /15%|█|░|Overall progress/);
});

test("recap flows across available width rather than preserving short input lines", () => {
  const summary = "## Recap\n" + Array(8).fill("The next step is to inspect candidate build results.").join("\n");
  const wide = digestLines(summary, 1, 140);
  const narrow = digestLines(summary, 1, 50);
  assert.ok(visibleWidth(wide[1]) > 72);
  assert.ok(narrow.length > wide.length);
  assert.equal(wide.slice(1).join(" ").replace(/\s+/g, " ").trim(),
    narrow.slice(1).join(" ").replace(/\s+/g, " ").trim());
  for (const [width, lines] of [[140, wide], [50, narrow]]) {
    assert.ok(lines.every(line => visibleWidth(line) <= width));
  }
});

test("displayed recap has an enforced 80-word limit with a visible omission mark", () => {
  for (const heading of ["## Recap\n", "## Goal\n", ""]) {
    const lines = digestLines(heading + Array.from({ length: 100 }, (_, i) => "word" + i).join(" "), 1, 120);
    const body = lines.slice(1).join(" ").trim();
    assert.equal(body.split(/\s+/).length, 80);
    assert.match(body, /…$/);
    assert.doesNotMatch(body, /word99/);
  }
  const exact = digestLines("## Recap\n" + Array(80).fill("word").join(" "), 1, 120);
  assert.doesNotMatch(exact.slice(1).join(" "), /…/);
});

test("recap ends before split-turn scaffolding and strips markdown once", () => {
  const lines = digestLines("## Recap\n- Fix `a*b` and **ship it**.\n- -flag-style option stays.\n--\n*Turn Context (split turn):**\nPrivate continuation text", 1, 120);
  assert.deepEqual(lines.slice(1), ["  Fix a*b and ship it. -flag-style option stays."]);
});

test("legacy sections retain goal, current work, blocker, and next step", () => {
  const summary = "## Goal\n- Ship it.\n### Done\n- Built.\n### In Progress\n- Review.\n### Blocked\n- None of the tests pass.\n## Next Steps\n1. Fix tests.";
  const text = digestLines(summary, 1, 160).slice(1).join(" ");
  assert.match(text, /Goal: Ship it\. Now: Review\. Block: None of the tests pass\. Next: Fix tests\./);
  assert.doesNotMatch(text, /Built/);
  assert.equal(digestLines("### Blocked\n- None.", 1, 120).length, 1);
});

test("plain legacy summaries reflow without losing the fourth line", () => {
  const lines = digestLines("First line.\nSecond line.\nThird line.\nFourth line.", 1, 120);
  assert.deepEqual(lines.slice(1), ["  First line. Second line. Third line. Fourth line."]);
});

test("wide characters and long tokens fit without silently losing content", () => {
  for (const text of ["界".repeat(80), "a".repeat(90)]) {
    const lines = digestLines("## Recap\n" + text, 1, 40);
    assert.ok(lines.every(line => visibleWidth(line) <= 40));
    assert.equal(lines.slice(1).map(line => line.trim()).join(""), text);
  }
  for (const width of [1, 2, 8, 30]) {
    assert.ok(digestLines("## Recap\nHello world.", 1, width).every(line => visibleWidth(line) <= width));
  }
});

test("idle compaction requests a bounded recap, not a goal-completion estimate", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS);
  assert.match(h.calls[0].customInstructions, /at most 80 words/);
  assert.doesNotMatch(h.calls[0].customInstructions, /Overall progress|70 columns/);
});

test("our digest widget reflows on resize and disappears on the next action", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS);
  h.emit("session_compact", { compactionEntry: { summary: "## Recap\n" + "Inspect candidate results. ".repeat(15), tokensBefore: 200_001 } });
  const widget = h.widgets.at(-1);
  assert.equal(widget.key, DIGEST_KEY);
  assert.equal(typeof widget.content, "function");
  const component = widget.content({}, { fg: (_name, text) => text });
  const wide = component.render(140), narrow = component.render(50);
  assert.ok(visibleWidth(wide[1]) > 72);
  assert.ok(narrow.length > wide.length);
  assert.doesNotThrow(() => component.invalidate());
  h.emit("input");
  assert.deepEqual(h.widgets.at(-1), { key: DIGEST_KEY, content: undefined });
  h.emit("session_shutdown");
});

test("a compaction we did not start shows no digest", () => {
  const h = host(); h.emit("session_start");
  h.emit("session_compact", { compactionEntry: { summary: "## Goal\n- x", tokensBefore: 9 } });
  assert.equal(h.widgets.filter(entry => entry.content !== undefined).length, 0);
  h.emit("session_shutdown");
});

test("typing dismisses the digest; a foreign compaction does not repin it", (t) => {
  const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS);
  h.emit("session_compact", { compactionEntry: { summary: "## Recap\nFinish.", tokensBefore: 1 } });
  assert.ok(h.widgets.at(-1).content);
  h.calls[0].onComplete({});
  h.type();
  assert.deepEqual(h.widgets.at(-1), { key: DIGEST_KEY, content: undefined });
  h.emit("session_compact", { compactionEntry: { summary: "## Recap\nForeign", tokensBefore: 2 } });
  assert.equal(h.widgets.filter(entry => entry.content).length, 1);
  h.emit("session_shutdown");
});
