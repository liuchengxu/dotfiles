import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const canonical = fileURLToPath(new URL("../", import.meta.url));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
  "@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const sdk = await import(pathToFileURL(join(root, "dist/index.js")));
const themes = await import(pathToFileURL(join(root, "dist/modes/interactive/theme/theme.js")));
const prompts = await import(pathToFileURL(join(root, "dist/core/prompt-templates.js")));
const system = await import(pathToFileURL(join(root, "dist/core/system-prompt.js")));
const tui = await import(pathToFileURL(join(root, "node_modules/@earendil-works/pi-tui/dist/index.js")));

async function extension(name, api) {
  const module = await jiti.import(join(canonical, "extensions", `${name}.ts`));
  module.default(api);
}

test("prompt discovery and literal arguments preserve the migrated command surface", () => {
  const loaded = prompts.loadPromptTemplates({ cwd: canonical, agentDir: join(homedir(), ".pi/agent"), promptPaths: [], includeDefaults: true });
  assert.deepEqual(loaded.diagnostics, []);
  for (const name of ["plan", "research", "review-plan", "resign-pr", "lore", "shed", "task-workflow", "memory", "todo"]) {
    assert(loaded.templates.some((template) => template.name === name), name);
  }
  const expanded = prompts.expandPromptTemplate('/lore "a path; $(not-code).md"', loaded.templates);
  assert(expanded.includes("a path; $(not-code).md"));
  assert(expanded.includes("never interpret it as shell code"));
});

test("canonical shared rules enter real prompt sections once without loading memory", async () => {
  let handler;
  await extension("shared-working-rules", { on(event, callback) { assert.equal(event, "before_agent_start"); handler = callback; } });
  const event = { systemPromptOptions: system.normalizeBuildSystemPromptOptions({
    cwd: canonical,
    contextFiles: [{ path: "/project/AGENTS.md", content: "Project constraints" }],
    skills: ["handoff", "grill-me", "grill-with-docs", "code-layout"].map((name) => ({ name, description: name, filePath: `/skills/${name}/SKILL.md`, baseDir: `/skills/${name}`, source: "user" })),
  }) };
  handler(event);
  handler(event);
  assert.equal(event.systemPromptOptions.contextFiles.length, 4);
  assert.deepEqual(event.systemPromptOptions.skills.map((skill) => skill.name), ["code-layout"]);
  const text = system.buildSystemPrompt(event.systemPromptOptions);
  for (const name of ["global-working-rules.md", "operational-evidence.md", "git-signing.md"]) {
    const path = join(homedir(), ".dotfiles/agents/ai-rules", name);
    assert(text.includes(readFileSync(path, "utf8")));
  }
  assert(text.includes("Project constraints"));
  assert(!text.includes("# Global Memory"));
});

test("compact codemode output expands and failures keep a bounded digest", async () => {
  themes.initTheme("dark", false);
  await extension("compact-tools", { on() {} });
  const row = new sdk.ToolExecutionComponent("codemode", "test", { code: "SCRIPT DETAIL" }, {}, undefined, { requestRender() {} }, canonical);
  row.setArgsComplete();
  const result = { content: [{ type: "text", text: "First error\nFULL DETAILS\n".repeat(20) }], details: undefined };
  row.updateResult(result);
  assert.equal(row.render(80).filter((line) => line.trim()).length, 1);
  row.setExpanded(true);
  assert(row.render(80).join("\n").includes("FULL DETAILS"));
  row.setExpanded(false);
  row.updateResult({ ...result, isError: true });
  assert(row.render(80).filter((line) => line.trim()).length <= 3);
  assert(!row.render(80).join("\n").includes("FULL DETAILS"));
  assert(result.content[0].text.includes("FULL DETAILS"));
});

test("native footer highlights named and unnamed sessions without duplication", async () => {
  const handlers = new Map();
  await extension("session-name-highlight", { on(event, callback) { handlers.set(event, callback); } });
  handlers.get("session_start")({}, { mode: "tui", ui: { get theme() { return themes.theme; }, setStatus(key, value) { assert.equal(key, "session-name"); assert.equal(value, undefined); } } });
  let name;
  const footer = new sdk.FooterComponent({ state: {}, sessionManager: {
    getCwd: () => "/tmp/project", getSessionName: () => name, getSessionId: () => "session-12345678",
  } }, { getGitBranch: () => "main", getAvailableProviderCount: () => 1, getExtensionStatuses: () => new Map() });
  footer.getSessionStats = () => ({ usageTotals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 }, contextUsage: { contextWindow: 544000, percent: 1 } });
  for (const appearance of ["dark", "light"]) {
    themes.initTheme(appearance, false);
    name = undefined;
    assert(stripVTControlCharacters(footer.render(100)[0]).includes("Session …12345678"));
    assert(footer.render(100)[0].includes("\x1b[1m"));
    name = "my-session";
    assert.equal(stripVTControlCharacters(footer.render(100)[0]).split(name).length - 1, 1);
    assert(!stripVTControlCharacters(footer.render(100)[0]).includes("Session …"));
    assert(footer.render(100)[0].includes("\x1b[1m"));
    for (const width of [1, 20, 40]) assert(tui.visibleWidth(footer.render(width)[0]) <= width);
  }
  handlers.get("session_shutdown")();
});

test("model switching shows both names without startup, restore or no-op notices", async () => {
  let handler;
  const notices = [];
  let renderer;
  await extension("model-switch-notice", {
    on(event, callback) { assert.equal(event, "model_select"); handler = callback; },
    registerEntryRenderer(type, callback) { assert.equal(type, "model-switch-notice"); renderer = callback; },
    appendEntry(type, data) { assert.equal(type, "model-switch-notice"); notices.push(data); },
  });
  const ctx = { hasUI: true };
  const sol = { provider: "openai-codex", id: "gpt-6.1-sol", name: "GPT-6.1 Sol" };
  const astra = { provider: "openai-codex", id: "gpt-6-astra", name: "GPT-6 Astra" };
  handler({ previousModel: sol, model: astra, source: "set" }, ctx);
  handler({ previousModel: astra, model: sol, source: "cycle" }, ctx);
  assert.deepEqual(notices, [
    { text: "Model changed: GPT-6.1 Sol → GPT-6 Astra" },
    { text: "Model changed: GPT-6 Astra → GPT-6.1 Sol" },
  ]);
  handler({ previousModel: sol, model: astra, source: "restore" }, ctx);
  handler({ previousModel: undefined, model: sol, source: "set" }, ctx);
  handler({ previousModel: sol, model: { ...sol }, source: "set" }, ctx);
  handler({ previousModel: sol, model: astra, source: "set" }, { hasUI: false });
  assert.equal(notices.length, 2);
  handler({ previousModel: sol, model: { provider: "other", id: sol.id }, source: "set" }, ctx);
  assert.equal(notices.at(-1).text, "Model changed: GPT-6.1 Sol (openai-codex) → gpt-6.1-sol (other)");

  themes.initTheme("dark", false);
  const chat = new tui.Container();
  const mode = { chatContainer: chat, ui: { requestRender() {} } };
  sdk.InteractiveMode.prototype.showStatus.call(mode, "Previous status");
  chat.addChild(renderer({ data: notices[0] }, {}, themes.theme));
  sdk.InteractiveMode.prototype.showStatus.call(mode, "Model: gpt-6-astra");
  const rendered = stripVTControlCharacters(chat.render(120).join("\n"));
  const dashed = rendered.split("\n").find((line) => line.includes(notices[0].text));
  assert(dashed?.startsWith(`── ${notices[0].text} `) && dashed.endsWith("─"), "reuse the working-status border style");
  assert.equal(dashed.length, 120);
  assert(rendered.includes("Model: gpt-6-astra"));
});

test("model prefix moves above stats and preserves session highlighting at narrow widths", async () => {
  const sessionHandlers = new Map();
  await extension("session-name-highlight", { on(event, handler) { sessionHandlers.set(event, handler); } });
  const handlers = new Map();
  await extension("footer-model-prefix", { on(event, handler) { handlers.set(event, handler); } });
  const ctx = { mode: "tui", ui: { get theme() { return themes.theme; }, setStatus() {} } };
  sessionHandlers.get("session_start")({}, ctx);
  handlers.get("session_start")({}, ctx);
  handlers.get("session_start")({}, ctx);
  let name;
  const statuses = new Map([["other", "Other status"]]);
  const state = { model: { provider: "openai-codex", id: "gpt-6-astra", reasoning: true }, thinkingLevel: "medium" };
  const footer = new sdk.FooterComponent({ state, modelRuntime: { isUsingSubscription: () => true }, sessionManager: {
    getCwd: () => "/tmp/project", getSessionName: () => name, getSessionId: () => "session-12345678",
  } }, { getGitBranch: () => "main", getAvailableProviderCount: () => 2, getExtensionStatuses: () => statuses });
  let percent = 20;
  footer.getSessionStats = () => ({ usageTotals: { input: 123, output: 12, cacheRead: 0, cacheWrite: 0, cost: 0 }, contextUsage: { contextWindow: 544000, percent } });
  for (const appearance of ["dark", "light"]) {
    themes.initTheme(appearance, false);
    for (name of [undefined, "named-session"]) {
      const lines = footer.render(180).map(stripVTControlCharacters);
      assert.equal(lines.length, 4);
      assert.equal(lines[0], "(openai-codex) gpt-6-astra • medium");
      assert.equal(lines[2], `${name ?? "Session …12345678"} • /tmp/project (main)`);
      assert(lines[1].includes("↑123 ↓12"));
      assert(lines[1].includes("Context ██░░░░░░░░ 20.0% (544k) (auto)"));
      assert.equal(lines[3], "Other status");
      for (const width of [1, 20, 60, 100]) assert(footer.render(width).every((line) => tui.visibleWidth(line) <= width));
    }
  }
  for (const [usage, bar, label] of [[0, "░░░░░░░░░░", "0.0%"], [95, "██████████", "95.0%"], [120, "██████████", "120.0%"], [null, "??????????", "?"]]) {
    percent = usage;
    const line = stripVTControlCharacters(footer.render(180)[1]);
    assert(line.includes(`Context ${bar} ${label} (544k)`));
  }
  percent = 20;
  globalThis[Symbol.for("session-uptime.state")] = { sessionId: "session-12345678", startedAt: performance.now() - 4980000 };
  const withUptime = footer.render(180).map(stripVTControlCharacters);
  assert(withUptime[2].includes("named-session • uptime 1h 23m • /tmp/project"));
  assert(![withUptime[0], withUptime[1]].join("\n").includes("uptime"));
  delete globalThis[Symbol.for("session-uptime.state")];
  statuses.set("usage", "codex 75% ↻ 6d7h");
  statuses.set("token-throughput", "≈45 tok/s");
  statuses.set("subagent-count", "Agents 3 active");
  const quotaLines = footer.render(220).map(stripVTControlCharacters);
  assert.equal(quotaLines[0], "(openai-codex) gpt-6-astra • medium • codex ████████░░ 75% ↻ 6d7h • ≈45 tok/s");
  assert.equal(quotaLines[3], "Agents 3 active");
  assert.equal(quotaLines[4], "Other status");
  assert(!quotaLines.slice(1).join("\n").includes("tok/s"));
  assert.equal(statuses.get("usage"), "codex 75% ↻ 6d7h");
  statuses.delete("other");
  assert.equal(footer.render(220).length, 4);
  state.model = { provider: "local", id: "small", reasoning: false };
  assert(stripVTControlCharacters(footer.render(220).at(-1)).endsWith("codex 75% ↻ 6d7h"));
  state.model = { provider: "zai", id: "glm-5.3", reasoning: true };
  statuses.set("usage", "zai 99% 5h 99% wk");
  const zaiLines = footer.render(220).map(stripVTControlCharacters);
  assert(zaiLines[0].startsWith("(zai) glm-5.3 • medium • zai 99% 5h 99% wk • "));
  assert(!zaiLines.slice(1).join("\n").includes("zai 99%"));
  for (const [provider, id, usage] of [
    ["github-copilot", "claude-sonnet", "copilot premium 30/40 75%"],
    ["opencode-go", "gpt-5.2-codex", "zen 40% r 60% w"],
    ["moonshotai-cn", "kimi-k2", "moonshot $ 1.20"],
  ]) {
    state.model = { provider, id, reasoning: false };
    statuses.set("usage", usage);
    const lines = footer.render(220).map(stripVTControlCharacters);
    assert(lines[0].startsWith(`(${provider}) ${id} • ${usage}`), `${provider} quota must follow the model`);
    assert(!lines.slice(1).join("\n").includes(usage), `${provider} quota must not stay on the status row`);
  }
  state.model = { provider: "local", id: "small", reasoning: false };
  assert(stripVTControlCharacters(footer.render(180)[0]).startsWith("(local) small "));
  handlers.get("session_shutdown")();
  sessionHandlers.get("session_shutdown")();
});

test("host configuration preserves canonical links and the requested context override", () => {
  assert.equal(realpathSync(join(homedir(), ".pi/agent/AGENTS.md")), join(canonical, "AGENTS.md"));
  for (const name of ["compact-tools", "session-name-highlight", "shared-working-rules", "working-elapsed"]) {
    assert.equal(realpathSync(join(homedir(), ".pi/agent/extensions", `${name}.ts`)), join(canonical, "extensions", `${name}.ts`));
  }
  const settings = JSON.parse(readFileSync(join(homedir(), ".pi/agent/settings.json"), "utf8"));
  assert.equal(settings.defaultModel, "gpt-6.1-sol");
  const models = JSON.parse(readFileSync(join(homedir(), ".pi/agent/models.json"), "utf8"));
  assert.equal(models.providers["openai-codex"].modelOverrides["gpt-6.1-sol"].contextWindow, 544000);
  const mcp = JSON.parse(readFileSync(join(homedir(), ".pi/agent/mcp.json"), "utf8"));
  for (const name of ["grafana", "pipedream-slack", "atlassian"]) assert(mcp.mcpServers[name], name);
});
