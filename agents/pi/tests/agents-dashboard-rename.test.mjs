import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
  "@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });

// The extension resolves its record directory at load time from the env.
const home = mkdtempSync(join(tmpdir(), "wd-ext-"));
process.env.PI_CODING_AGENT_DIR = home;
const SESSION = "abc12345-6789-4bcd-9012-3456789abcde"; // slice(-8) => "789abcde"

const mod = await jiti.import(new URL("../extensions/agents-dashboard.ts", import.meta.url).pathname);

/** One extension instance per case: fresh handlers, fresh rename side effects. */
function session(getName, setSessionName) {
  const handlers = new Map();
  const applied = [];
  const pi = { on: (n, f) => handlers.set(n, f), registerCommand: () => {}, setSessionName: n => applied.push(n) };
  if (setSessionName) pi.setSessionName = setSessionName;
  mod.default(pi);
  const ctx = { sessionManager: { getSessionId: () => SESSION, getSessionName: getName }, cwd: home, model: undefined, isIdle: () => true, hasUI: false };
  const request = payload => {
    mkdirSync(join(home, "live-agents", "renames"), { recursive: true });
    writeFileSync(join(home, "live-agents", "renames", `${SESSION}.json`), JSON.stringify(payload));
  };
  const renamesLeft = () => readdirSync(join(home, "live-agents", "renames")).length;
  return { applied, pi, request, renamesLeft,
    start: () => handlers.get("session_start")(undefined, ctx),
    stop: () => handlers.get("session_shutdown")(undefined, undefined) };
}

const newestRecord = () => {
  const dir = join(home, "live-agents");
  const files = readdirSync(dir).filter(f => f.startsWith(SESSION) && f.endsWith(".json"))
    .sort((a, b) => statSync(join(dir, b)).mtimeMs - statSync(join(dir, a)).mtimeMs);
  return JSON.parse(readFileSync(join(dir, files[0]), "utf8"));
};

test("a manual rename applies through pi's own API", () => {
  const x = session(() => "owner:set");
  x.request({ version: 1, name: "my:new-name" });
  x.start();
  assert.deepEqual(x.applied, ["my:new-name"]);
  x.stop();
});

test("an auto rename yields to a name the owner set meanwhile", () => {
  const x = session(() => "owner:set");
  x.request({ version: 1, name: "model:name", auto: true, at: Date.now() });
  x.start();
  assert.deepEqual(x.applied, []);
  assert.equal(x.renamesLeft(), 0);
  x.stop();
});

test("an auto rename applies while the name is still this session's placeholder", () => {
  const x = session(() => `Session ${SESSION.slice(-8)}`);
  x.request({ version: 1, name: "model:name", auto: true, at: Date.now() });
  x.start();
  assert.deepEqual(x.applied, ["model:name"]);
  x.stop();
});

test("a failing setSessionName consumes the request without killing the session", () => {
  let threw = false;
  const x = session(() => undefined, () => { threw = true; throw new Error("disk full"); });
  x.request({ version: 1, name: "doomed:name" });
  assert.doesNotThrow(() => x.start());
  assert.equal(threw, true);
  assert.equal(x.renamesLeft(), 0);
  assert.equal(newestRecord().name, `Session ${SESSION.slice(-8)}`);
  x.stop();
});
