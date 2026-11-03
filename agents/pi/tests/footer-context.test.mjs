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
function footer(t, contextUsage) {
  const handlers = new Map();
  extension({ on(event, handler) { handlers.set(event, handler); } });
  const projection = t.mock.fn(() => ({ messages }));
  const state = { model: { provider: "kimi-coding", id: "k3.1-pro" }, thinkingLevel: "off" };
  const component = new FooterComponent({ state, modelRuntime: { isUsingSubscription: () => true }, sessionManager: {
    getCwd: () => "/tmp/project", getSessionName: () => "Test", getSessionId: () => "context-test", buildSessionProjection: projection,
  } }, { getGitBranch: () => "main", getAvailableProviderCount: () => 1, getExtensionStatuses: () => new Map() });
  let stats = { usageTotals: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, cost: 0 }, contextUsage };
  component.getSessionStats = () => stats;
  themes.initTheme("dark", false);
  handlers.get("session_start")({}, { mode: "tui", ui: { get theme() { return themes.theme; } } });
  t.after(() => handlers.get("session_shutdown")());
  return {
    projection,
    context: () => /Context .*?\)/.exec(stripVTControlCharacters(component.render(240)[1]))?.[0],
    setStats(next) { stats = { ...stats, contextUsage: next }; },
  };
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
