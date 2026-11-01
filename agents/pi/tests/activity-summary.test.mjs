import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { default: extension } = await jiti.import(new URL("../extensions/activity-summary.ts", import.meta.url).pathname);

test("a tick on a stale ctx stops the timer instead of throwing", (t) => {
  let tick;
  let active = 0;
  t.mock.method(globalThis, "setInterval", (callback) => { tick = callback; active++; return { unref() {} }; });
  t.mock.method(globalThis, "clearInterval", () => { active--; });
  const handlers = new Map();
  extension({ on(event, handler) { handlers.set(event, handler); }, registerEntryRenderer() {}, appendEntry() {} });
  let stale = false;
  const ctx = {
    get mode() { if (stale) throw new Error("This extension ctx is stale"); return "tui"; },
    ui: { theme: { fg: (_color, text) => text }, setStatus() { if (stale) throw new Error("This extension ctx is stale"); } },
  };
  handlers.get("session_start")({}, ctx);
  handlers.get("agent_start")({}, ctx);
  assert.equal(active, 1);
  stale = true;
  assert.doesNotThrow(() => tick());
  assert.equal(active, 0);
});
