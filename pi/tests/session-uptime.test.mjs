import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const { default: extension, formatUptime, sessionUptimeLabel } = await createJiti(import.meta.url).import(new URL("../extensions/session-uptime.ts", import.meta.url).pathname);

test("uptime formatting and session lifecycle", (t) => {
  assert.equal(formatUptime(0), "0s");
  assert.equal(formatUptime(61000), "1m 1s");
  assert.equal(formatUptime(4980000), "1h 23m");
  let now = 0;
  let active = 0;
  let tick;
  t.mock.method(performance, "now", () => now);
  t.mock.method(globalThis, "setInterval", (callback) => { tick = callback; active++; return { unref() {} }; });
  t.mock.method(globalThis, "clearInterval", () => { active--; });
  const handlers = new Map();
  extension({ on(event, handler) { handlers.set(event, handler); } });
  let sessionId = "first";
  let status;
  const ctx = { mode: "tui", sessionManager: { getSessionId: () => sessionId }, ui: {
    theme: { fg: (_color, text) => text }, setStatus: (_key, text) => { status = text; },
  } };
  handlers.get("session_start")({}, ctx);
  now = 61000; tick();
  assert.equal(status, undefined);
  assert.equal(sessionUptimeLabel(sessionId), "uptime 1m 1s");
  handlers.get("session_shutdown")({}, ctx);
  assert.equal(active, 0);
  assert.equal(status, undefined);
  const reloaded = new Map();
  extension({ on(event, handler) { reloaded.set(event, handler); } });
  reloaded.get("session_start")({}, ctx);
  assert.equal(sessionUptimeLabel(sessionId), "uptime 1m 1s");
  sessionId = "second";
  reloaded.get("session_start")({}, ctx);
  assert.equal(sessionUptimeLabel(sessionId), "uptime 0s");
  assert.equal(active, 1);
  reloaded.get("session_shutdown")({}, ctx);
  reloaded.get("session_start")({}, { mode: "print" });
  assert.equal(active, 0);
  delete globalThis[Symbol.for("session-uptime.state")];
});
