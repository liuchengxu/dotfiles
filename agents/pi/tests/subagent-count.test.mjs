import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const { default: extension } = await createJiti(import.meta.url).import(new URL("../extensions/subagent-count.ts", import.meta.url).pathname);

test("fleet count follows authoritative session totals and cleans up subscriptions", (t) => {
  let tick, expire;
  t.mock.method(globalThis, "setInterval", (fn) => { tick = fn; return { unref() {} }; });
  t.mock.method(globalThis, "setTimeout", (fn) => { expire = fn; return { unref() {} }; });
  t.mock.method(globalThis, "clearInterval", () => {});
  t.mock.method(globalThis, "clearTimeout", () => {});
  const handlers = new Map();
  const listeners = new Map();
  const requests = [];
  extension({
    on(event, handler) { handlers.set(event, handler); },
    events: {
      on(event, handler) { listeners.set(event, handler); return () => listeners.delete(event); },
      emit(event, request) { assert.equal(event, "subagents:rpc:v1:request"); assert.equal(request.method, "status"); requests.push(request); },
    },
  });
  let status;
  const ctx = { mode: "tui", ui: { theme: { fg: (_color, text) => text }, setStatus: (_key, text) => { status = text; } } };
  handlers.get("session_start")({}, ctx);
  tick();
  assert.equal(requests.length, 1, "only one request may be pending");
  const reply = (count) => listeners.get(`subagents:rpc:v1:reply:${requests.at(-1).requestId}`)({ version: 1, success: true, data: { fleet: { version: 1, totalActive: count, entries: [], omitted: count } } });
  reply(3);
  assert.equal(status, "Agents 3 active", "use totalActive, not bounded entry count");
  tick(); expire();
  assert.equal(status, "Agents ?", "never keep a stale active count");
  tick(); reply(0);
  assert.equal(status, undefined);
  tick(); reply(-1);
  assert.equal(status, undefined);
  tick();
  const lateReply = listeners.get(`subagents:rpc:v1:reply:${requests.at(-1).requestId}`);
  handlers.get("session_shutdown")();
  assert.equal(listeners.size, 0);
  assert.equal(status, undefined);
  const before = requests.length;
  handlers.get("session_start")({}, { mode: "print" });
  assert.equal(requests.length, before);
  assert.equal(typeof lateReply, "function");
});
