import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
  "@earendil-works/pi-ai": join(root, "node_modules/@earendil-works/pi-ai/dist/index.js"),
  "@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { FooterComponent, estimateTokens } = await import(pathToFileURL(join(root, "dist/index.js")));
const themes = await import(pathToFileURL(join(root, "dist/modes/interactive/theme/theme.js")));
const { default: extension, estimateContextTokens } = await jiti.import(new URL("../extensions/footer-model-prefix.ts", import.meta.url).pathname);

const user = (text) => ({ role: "user", content: [{ type: "text", text }], timestamp: 0 });
const messages = [
  { role: "system", content: "base prompt ".repeat(50), sections: { rules: "old rules ".repeat(200) }, timestamp: 0 },
  user("compaction summary ".repeat(100)),
  { role: "system", content: "", sections: { rules: "new rules" }, timestamp: 1 },
  user("hello"),
];

/** A footer whose pi stats and session projection the test controls. */
function footer(t, contextUsage, statuses = new Map(), overrides = {}) {
  const handlers = new Map();
  extension({ on(event, handler) { handlers.set(event, handler); } });
  const projection = t.mock.fn(() => ({ messages }));
  const state = { model: { provider: "kimi-coding", id: "k3.1-pro" }, thinkingLevel: "off" };
  const component = new FooterComponent({ state, modelRuntime: { isUsingSubscription: () => true }, sessionManager: {
    getCwd: () => overrides.cwd ?? "/tmp/project", getSessionName: () => overrides.sessionName ?? "Test", getSessionId: () => "context-test", buildSessionProjection: projection,
  } }, { getGitBranch: () => overrides.branch ?? "main", getAvailableProviderCount: () => 1, getExtensionStatuses: () => statuses });
  let stats = { usageTotals: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, cost: 0 }, contextUsage };
  component.getSessionStats = () => stats;
  themes.initTheme("dark", false);
  handlers.get("session_start")({}, { mode: "tui", ui: { get theme() { return themes.theme; } } });
  t.after(() => handlers.get("session_shutdown")());
  return {
    projection,
    lines: (w = 240) => component.render(w).map(stripVTControlCharacters),
    context: () => /Context .*?\)/.exec(stripVTControlCharacters(component.render(240)[1]))?.[0],
    setStats(next) { stats = { ...stats, contextUsage: next }; },
  };
}

const runningBgKey = Symbol.for("pi.bash-background.running");

function publishRunningBgTasks(tasks) {
  (globalThis)[runningBgKey] = tasks;
}

test("the estimate counts the replayed system state once, plus every other message", () => {
  // Built by hand: the base prompt from the first system message, the rules section from the second.
  const system = { role: "system", content: "base prompt ".repeat(50), sections: { rules: "new rules" }, timestamp: 0 };
  const expected = estimateTokens(system) + estimateTokens(messages[1]) + estimateTokens(messages[3]);
  assert.equal(estimateContextTokens(messages), expected);
  assert.equal(estimateContextTokens([messages[1]]), estimateTokens(messages[1]), "no system message counts as none");
});

test("after a compaction the footer shows pi's estimate instead of question marks", (t) => {
  const f = footer(t, { tokens: null, percent: null, contextWindow: 2_000 });
  const percent = (estimateContextTokens(messages) / 2_000) * 100;
  const filled = Math.round(Math.min(100, percent) / 10);
  assert.equal(f.context(), `Context ${"█".repeat(filled)}${"░".repeat(10 - filled)} ~${percent.toFixed(1)}% (2.0k)`);
});

test("the estimate is computed once per pi stats snapshot, and dropped once pi knows the size", (t) => {
  const f = footer(t, { tokens: null, percent: null, contextWindow: 2_000 });
  f.context();
  f.context();
  assert.equal(f.projection.mock.callCount(), 1, "rendering again reuses the estimate");
  f.setStats({ tokens: null, percent: null, contextWindow: 2_000 });
  f.context();
  assert.equal(f.projection.mock.callCount(), 2, "a new snapshot (new entry, leaf, session, or model) recomputes");
  f.setStats({ tokens: 500, percent: 25, contextWindow: 2_000 });
  assert.equal(f.context(), "Context ███░░░░░░░ 25.0% (2.0k)");
  assert.equal(f.projection.mock.callCount(), 2);
});

test("a failed estimate keeps the unknown display and is not retried every frame", (t) => {
  const f = footer(t, { tokens: null, percent: null, contextWindow: 2_000 });
  f.projection.mock.mockImplementation(() => { throw new Error("no projection"); });
  assert.equal(f.context(), "Context ?????????? ? (2.0k)");
  f.context();
  assert.equal(f.projection.mock.callCount(), 1);
});

test("the footer ends with one line per running background task, in publish order", (t) => {
  t.after(() => publishRunningBgTasks(undefined));
  publishRunningBgTasks([
    { id: "bg-1", label: "first command", startedAt: Date.now() - 65_000, state: "running" },
    { id: "bg-2", label: "second command", startedAt: Date.now() - 12_000, state: "running" },
  ]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 });
  const lines = f.lines();
  assert.equal(lines.at(-2), "bg1 \u25C6 first command 1m 5s");
  assert.equal(lines.at(-1), "bg2 \u25C6 second command 12s");
});

test("a long label truncates into the space the time leaves, and the time stays visible", (t) => {
  t.after(() => publishRunningBgTasks(undefined));
  publishRunningBgTasks([
    { id: "bg-1", label: "L".repeat(200), startedAt: Date.now() - 65_000, state: "running" },
  ]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 });
  const row = f.lines(60).at(-1);
  assert.match(row, /1m 5s$/, "the time survives a label longer than the row");
  assert.ok(row.length <= 60, `the truncated row fits its width: ${row.length}`);
});

test("a row too narrow for label and time keeps the time", (t) => {
  t.after(() => publishRunningBgTasks(undefined));
  publishRunningBgTasks([
    { id: "bg-1", label: "L".repeat(200), startedAt: Date.now() - 65_000, state: "running" },
  ]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 });
  assert.match(f.lines(10).at(-1), /1m 5s$/);
});

test("an alive task that is not plainly running shows its state", (t) => {
  t.after(() => publishRunningBgTasks(undefined));
  publishRunningBgTasks([
    { id: "bg-1", label: "dying command", startedAt: Date.now() - 5_000, state: "stopping" },
    { id: "bg-2", label: "watched command", startedAt: Date.now() - 12_000, state: "matched" },
  ]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 });
  const lines = f.lines();
  assert.equal(lines.at(-2), "bg1 \u25C6 dying command 5s stopping");
  assert.equal(lines.at(-1), "bg2 \u25C6 watched command 12s matched");
});

test("without running background tasks the footer grows no dock lines", (t) => {
  t.after(() => publishRunningBgTasks(undefined));
  publishRunningBgTasks([]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 });
  const lines = f.lines();
  assert.ok(!lines.some((line) => line.startsWith("bg")), JSON.stringify(lines));
});

test("the task worktree sits beside the cwd's branch, not in the statuses line", (t) => {
  const statuses = new Map([["worktree", "\u001b[38;2;74;222;128m\u2475 bg-footer-lines\u001b[0m"]]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 }, statuses);
  const lines = f.lines();
  assert.ok(lines[2].includes("/tmp/project (main) \u2475 bg-footer-lines"), lines[2]);
  assert.ok(!lines.slice(3).some((line) => line.includes("bg-footer-lines")), JSON.stringify(lines.slice(3)));
});

test("wide characters in the cwd do not shift the worktree splice", (t) => {
  const statuses = new Map([["worktree", "\u2475 bg-footer-lines"]]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 }, statuses, { cwd: "/tmp/\u9879\u76ee" });
  assert.ok(f.lines()[2].endsWith("/tmp/\u9879\u76ee (main) \u2475 bg-footer-lines"), f.lines()[2]);
});

test("a parenthesis in the session name without a branch cannot steal the splice", (t) => {
  const statuses = new Map([["worktree", "\u2475 bg-footer-lines"]]);
  const f = footer(t, { tokens: 100, percent: 5, contextWindow: 2_000 }, statuses, { branch: "", sessionName: "Test (review)" });
  assert.ok(f.lines()[2].endsWith("Test (review) \u2022 /tmp/project \u2475 bg-footer-lines"), f.lines()[2]);
});
