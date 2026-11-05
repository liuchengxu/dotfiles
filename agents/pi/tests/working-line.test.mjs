import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
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
const { default: workingElapsed } = await jiti.import(new URL("../extensions/working-elapsed.ts", import.meta.url).pathname);
const { default: tokenThroughput } = await jiti.import(new URL("../extensions/token-throughput.ts", import.meta.url).pathname);

/** Both extensions load against the shared working-line store, so the phase
 * token-throughput publishes is what working-elapsed renders between tools. */
function session(t) {
  const handlers = new Map();
  const working = [];
  const ctx = { mode: "tui", ui: {
    setWorkingMessage: (text) => working.push(text ?? ""),
    setStatus: () => {},
    setWidget: () => {},
    theme: { fg: (_name, text) => text, style: (text) => text },
  } };
  const load = (extension) => extension({
    on(event, handler) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
  });
  const emit = (event, evt = {}) => { for (const handler of handlers.get(event) ?? []) handler(evt, ctx); };
  load(workingElapsed);
  load(tokenThroughput);
  emit("session_start");
  t.after(() => emit("session_shutdown"));
  return { emit, working, last: () => working.at(-1) ?? "" };
}

const assistant = { role: "assistant" };
const delta = (type, text = "x") => ({ assistantMessageEvent: { type, delta: text } });

test("waiting publishes at once; a sustained delta type replaces it after the stability window", async (t) => {
  const s = session(t);
  s.emit("agent_start");
  s.emit("message_start", { message: assistant });
  assert.ok(s.last().includes("Waiting for model"), s.last());
  s.emit("message_update", delta("thinking_delta"));
  assert.ok(!s.last().includes("Thinking"), s.last());
  s.emit("message_update", delta("text_delta"));
  assert.ok(!s.last().includes("Replying"), "an instant flip must not publish");
  await sleep(320);
  s.emit("message_update", delta("text_delta"));
  assert.ok(s.last().includes("Replying"), s.last());
});

test("thinking held past the window publishes Thinking", async (t) => {
  const s = session(t);
  s.emit("agent_start");
  s.emit("message_start", { message: assistant });
  for (let i = 0; i < 40; i++) s.emit("message_update", delta("thinking_delta"));
  await sleep(320);
  s.emit("message_update", delta("thinking_delta"));
  assert.ok(s.last().includes("Thinking"), s.last());
});

test("a message boundary clears the phase", async (t) => {
  const s = session(t);
  s.emit("agent_start");
  s.emit("message_start", { message: assistant });
  for (let i = 0; i < 40; i++) s.emit("message_update", delta("text_delta"));
  await sleep(320);
  s.emit("message_update", delta("text_delta"));
  assert.ok(s.last().includes("Replying"), s.last());
  s.emit("message_end", { message: { ...assistant, stopReason: "stop" } });
  assert.ok(!/(Replying|Thinking|Waiting for model)/.test(s.last()), s.last());
  s.emit("message_start", { message: assistant });
  assert.ok(s.last().includes("Waiting for model"), s.last());
});

test("a live file tool names its file; a search keeps the bare verb", (t) => {
  const s = session(t);
  s.emit("agent_start");
  s.emit("tool_execution_start", { toolName: "edit", toolCallId: "1", args: { path: "/tmp/p/footer-model-prefix.ts" } });
  assert.ok(s.last().includes("Editing footer-model-prefix.ts"), s.last());
  s.emit("tool_execution_end", { toolCallId: "1" });
  assert.ok(!s.last().includes("Editing"), s.last());
  s.emit("tool_execution_start", { toolName: "grep", toolCallId: "2", args: { pattern: "secret", path: "/tmp/p" } });
  assert.ok(s.last().includes("Searching") && !s.last().includes("/tmp") && !s.last().includes("secret"), s.last());
});

test("a live tool overrides the phase and hands the line back when done", async (t) => {
  const s = session(t);
  s.emit("agent_start");
  s.emit("message_start", { message: assistant });
  for (let i = 0; i < 40; i++) s.emit("message_update", delta("thinking_delta"));
  await sleep(320);
  s.emit("message_update", delta("thinking_delta"));
  assert.ok(s.last().includes("Thinking"), s.last());
  s.emit("tool_execution_start", { toolName: "bash", toolCallId: "1", args: { description: "Run the test suite" } });
  assert.ok(s.last().includes("Run the test suite") && !s.last().includes("Thinking"), s.last());
  s.emit("tool_execution_end", { toolCallId: "1" });
  assert.ok(s.last().includes("Thinking"), s.last());
});
