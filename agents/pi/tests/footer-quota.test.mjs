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
const { FooterComponent } = await import(pathToFileURL(join(root, "dist/index.js")));
const themes = await import(pathToFileURL(join(root, "dist/modes/interactive/theme/theme.js")));
const { visibleWidth } = await import(pathToFileURL(join(root, "node_modules/@earendil-works/pi-tui/dist/index.js")));
const { default: extension } = await jiti.import(new URL("../extensions/footer-model-prefix.ts", import.meta.url).pathname);

test("Codex quota uses a themed meter without changing percentages or crowding out speed", () => {
  const handlers = new Map();
  extension({ on(event, handler) { handlers.set(event, handler); } });
  const state = { model: { provider: "openai-codex", id: "gpt-6.1-sol", reasoning: true }, thinkingLevel: "high" };
  const statuses = new Map([["usage", "codex 50% ↻ 5d1h"], ["token-throughput", "284 tok/s"]]);
  const footer = new FooterComponent({ state, modelRuntime: { isUsingSubscription: () => true }, sessionManager: {
    getCwd: () => "/tmp/project", getSessionName: () => "Test", getSessionId: () => "quota-test",
  } }, { getGitBranch: () => "main", getAvailableProviderCount: () => 1, getExtensionStatuses: () => statuses });
  footer.getSessionStats = () => ({ usageTotals: { input: 123, output: 12, cacheRead: 0, cacheWrite: 0, cost: 0 }, contextUsage: { contextWindow: 544000, percent: 20 } });
  handlers.get("session_start")({}, { mode: "tui", ui: { get theme() { return themes.theme; } } });
  try {
    for (const appearance of ["dark", "light"]) {
      themes.initTheme(appearance, false);
      for (const [percentage, bar] of [[0, "░░░░░░░░░░"], [50, "█████░░░░░"], [100, "██████████"]]) {
        const quota = `codex ${percentage}% ↻ 5d1h`;
        statuses.set("usage", quota);
        const line = footer.render(240)[0];
        assert(stripVTControlCharacters(line).includes(`codex ${bar} ${percentage}% ↻ 5d1h`));
        assert(line.includes(themes.theme.fg("accent", "█".repeat(percentage / 10))));
        assert.equal(statuses.get("usage"), quota, "the source status is not mutated");
      }
      statuses.set("usage", "codex 50% ↻ 5d1h");
      const plain = "(openai-codex) gpt-6.1-sol • high • codex 50% ↻ 5d1h • 284 tok/s";
      assert.equal(stripVTControlCharacters(footer.render(visibleWidth(plain))[0]), plain);
      for (const width of [1, 12, 40, 80, 120, 240]) {
        assert(footer.render(width).every((line) => visibleWidth(line) <= width), `width ${width}`);
      }
      statuses.set("usage", "codex 25% 5h 75% wk");
      const multi = stripVTControlCharacters(footer.render(240)[0]);
      assert(multi.includes("███░░░░░░░ 25% 5h"));
      assert(multi.includes("████████░░ 75% wk"));
      for (const quota of ["codex usage unavailable", "codex credits unlimited", "codex 120%", "codex ?% ↻ 5d1h"]) {
        statuses.set("usage", quota);
        const line = stripVTControlCharacters(footer.render(240)[0]);
        assert(line.includes(quota), quota);
        assert(!line.includes("█") && !line.includes("░"));
      }
      state.model = { provider: "zai", id: "glm-5.3", reasoning: true };
      statuses.set("usage", "zai 50% 5h");
      assert(stripVTControlCharacters(footer.render(240)[0]).includes("zai 50% 5h"));
      state.model = { provider: "openai-codex", id: "gpt-6.1-sol", reasoning: true };
    }
  } finally {
    handlers.get("session_shutdown")();
  }
});
