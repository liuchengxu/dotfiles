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

test("digest lines carry the summary's goal, live work, blockers, and next step", () => {
	const summary = [
		"## Goal", "- Ship the footer dock.", "",
		"## Progress", "### Done", "- merged", "### In Progress", "- [ ] adjudicate the review", "### Blocked", "- None — waiting on nothing.", "",
		"## Next Steps", "1. Fix `F-01` **awaited children**", "2. Merge.", "",
		"Overall progress: ~70%",
	].join("\n");
	const lines = digestLines(summary, 227_812);
	assert.match(lines[0], /^◇ idle compaction ─+ ctrl\+o full summary$/);
	assert.match(lines[1], /^ {2}█{13}░{5} ~70% · 227,812 tokens$/);
	assert.deepEqual(lines.slice(2), ["● Goal  Ship the footer dock.", "◉ Now   adjudicate the review", "▸ Next  Fix F-01 awaited children"]);
});

test("digest omits absent sections, caps long lines, and falls back to leading lines", () => {
	const sparse = digestLines("## Goal\nOnly prose.\n## Next Steps\n- Next up", 1);
	assert.deepEqual(sparse.slice(1), ["● Goal  Only prose.", "▸ Next  Next up"]);
	const capped = digestLines(`## Goal\n${"x".repeat(90)}`, 1);
	assert.equal(visibleWidth(capped[1]), 72); assert.ok(capped[1].includes("…"));
	const plain = digestLines("No headings at all.\nSecond line.\nThird line.\nFourth line.", 5);
	assert.deepEqual(plain.slice(1), ["  No headings at all.", "  Second line.", "  Third line."]);
});

test("our idle compaction pins the digest; the user's next action or shutdown removes it", (t) => {
	const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS);
	h.emit("session_compact", { compactionEntry: { summary: "## Goal\n- Finish.\n## Next Steps\n1. Merge", tokensBefore: 200_001 } });
	assert.equal(h.widgets.at(-1).key, DIGEST_KEY);
	assert.match(h.widgets.at(-1).content[0], /idle compaction/);
	assert.ok(h.widgets.at(-1).content.some((line) => line.includes("Merge")));
	h.emit("input");
	assert.deepEqual(h.widgets.at(-1), { key: DIGEST_KEY, content: undefined });
	h.emit("session_compact", { compactionEntry: { summary: "## Goal\n- Again", tokensBefore: 1 } });
	h.emit("session_shutdown");
	assert.deepEqual(h.widgets.at(-1), { key: DIGEST_KEY, content: undefined });
});

test("a compaction we did not start shows no digest", (t) => {
	const h = host(); h.emit("session_start");
	h.emit("session_compact", { compactionEntry: { summary: "## Goal\n- x", tokensBefore: 9 } });
	assert.equal(h.widgets.filter((entry) => entry.content !== undefined).length, 0);
});

test("typing dismisses the digest; a foreign compaction replaces it with nothing", (t) => {
	const c = clock(t), h = host(); h.emit("session_start"); c.advance(IDLE_MS);
	h.emit("session_compact", { compactionEntry: { summary: "## Goal\n- Finish.", tokensBefore: 1 } });
	assert.ok(h.widgets.at(-1).content, "digest pinned after our compaction");
	h.calls[0].onComplete({});
	h.type();
	assert.deepEqual(h.widgets.at(-1), { key: DIGEST_KEY, content: undefined }, "a keystroke dismisses it");
	h.emit("session_compact", { compactionEntry: { summary: "## Goal\n- Foreign", tokensBefore: 2 } });
	assert.equal(h.widgets.filter((entry) => entry.content).length, 1, "only the initial pin ever carried content; a foreign compaction adds none");
});

test("only the empty-marker None is filtered; real blockers starting with None survive", () => {
	const lines = digestLines("## Progress\n### Blocked\n- None of the integration tests pass.\n", 1);
	assert.ok(lines.some((line) => line.includes("Block")), "a genuine None-of sentence is a blocker");
	const empty = digestLines("## Progress\n### Blocked\n- None — waiting on review.\n", 1);
	assert.ok(!empty.some((line) => line.includes("Block")), "the None marker is dropped");
});

test("wide characters truncate by terminal column, not UTF-16 unit", () => {
	const lines = digestLines(`## Goal\n${"界".repeat(80)}`, 1);
	assert.ok(visibleWidth(lines[1]) <= 72, `goal row fits 72 columns, got ${visibleWidth(lines[1])}`);
});

test("markdown stripping keeps literal content: code spans, paired bold, plus bullets", () => {
	const lines = digestLines([
		"## Goal", "- Fix `a*b` and **ship it**", "",
		"### In Progress", "+ [ ] Ship the thing", "",
	].join("\n"), 1);
	assert.ok(lines.some((line) => line.includes("Fix a*b and ship it")), JSON.stringify(lines));
	assert.ok(lines.some((line) => line.includes("Ship the thing")), JSON.stringify(lines));
});

test("progress estimate prefers the summarizer's stated line and takes the last valid one", () => {
	const withStated = digestLines("## Goal\n- x\nOverall progress: ~35%\nOverall progress: ~120%\nOverall progress: ~80%", 1);
	assert.match(withStated[1], /~80% · 1 tokens/);
});

test("without a stated estimate, the Done share of listed items is used; None markers do not count", () => {
	const summary = [
		"## Progress", "### Done", "- a", "- b", "- c", "### In Progress", "- d", "### Blocked", "- None — clear.",
	].join("\n");
	assert.match(digestLines(summary, 1)[1], /~75%/, "done share over counted items only");
});

test("no basis for an estimate leaves the percentage out of the header", () => {
	const plain = digestLines("No headings at all.\nSecond line.\nThird line.", 5);
	assert.match(plain[0], /^◇ idle compaction · 5 tokens ─+ ctrl\+o full summary$/);
});

test("only a standalone progress line counts; prose, negations, and next-line percentages do not", () => {
	const noisy = digestLines([
		"Previous overall progress: ~90% (obsolete; goal expanded).", "",
		"## Goal", "- x", "",
		"Overall progress: unknown", "- 80% coverage required", "",
		"Overall progress: -20%",
	].join("\n"), 1);
	assert.doesNotMatch(noisy[0], /%/);
	const standalone = digestLines("Overall progress: 65%", 1);
	assert.match(standalone[1], /~65%/);
});

test("the <=100 filter decides last-wins: 80 then 120 stays 80", () => {
	assert.match(digestLines("Overall progress: ~80%\nOverall progress: ~120%", 1)[1], /~80%/);
});

test("formatted None markers are not work, numbered items count, and headers fit LINE_CAP", () => {
	const summary = ["## Progress", "### Done", "- **None** before real work", "- a", "### In Progress", "1. still going", "### Blocked", "- [ ] None."].join("\n");
	assert.match(digestLines(summary, 1)[1], /~50%/, "one done, one numbered remaining");
	for (const header of [digestLines("Overall progress: 100%", 1)[0], digestLines("## Progress\n### Done\n- a", 1)[0], digestLines("nothing", 999_999)[0]]) {
		assert.ok(visibleWidth(header) <= 72, `header fits: ${visibleWidth(header)} ${JSON.stringify(header)}`);
	}
});
