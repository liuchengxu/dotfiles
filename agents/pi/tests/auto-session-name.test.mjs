import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? "/Users/xlc/.config/nvm/versions/node/v24.22.1/lib/node_modules/@earendil-works/pi-coding-agent";
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const { default: extension, cleanTitle, firstExchange } = await createJiti(import.meta.url, { fsCache: false }).import(new URL("../extensions/auto-session-name.ts", import.meta.url).pathname);
const { SessionManager } = await import(pathToFileURL(join(root, "dist/core/session-manager.js")));
const turn = () => new Promise((resolve) => setImmediate(resolve));
const user = { type: "message", id: "u", message: { role: "user", content: "Fix Kitty left padding" } };
const assistant = { type: "message", id: "a", message: { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "Set window_padding_width to 6." }] } };
const reply = (text = "Fix Kitty padding on external monitor") => ({ role: "assistant", stopReason: "stop", provider: "test", model: "test", content: [{ type: "text", text }], usage: { input: 10, output: 8 } });

function host({ branch = [user, assistant], name, mode = "tui", model = { provider: "test", id: "test" } } = {}) {
  const handlers = new Map(), requests = [], names = [], receipts = [];
  let sessionId = "one";
  const pi = {
    on(event, handler) { handlers.set(event, handler); },
    getSessionName: () => name,
    setSessionName(value) { name = value; names.push(value); },
    appendEntry(...args) { receipts.push(args); },
  };
  const ctx = { mode, model, sessionManager: { getSessionId: () => sessionId, getBranch: () => branch }, modelRegistry: {
    streamSimple(model, context, options) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      requests.push({ model, context, options, resolve, reject });
      return { result: () => promise };
    },
  } };
  extension(pi);
  return { ctx, pi, requests, names, receipts, emit: (event) => handlers.get(event)({}, ctx), setName: (value) => { name = value; }, setBranch: (value) => { branch = value; }, switchId: () => { sessionId = "two"; } };
}

test("names first completed exchange once, using selected model and bounded text only", async () => {
  const h = host({ branch: [user] });
  h.emit("session_start"); assert.equal(h.requests.length, 0);
  h.setBranch([user, assistant]); h.emit("agent_settled"); h.emit("agent_settled");
  assert.equal(h.requests.length, 1);
  const r = h.requests[0];
  assert.equal(r.model, h.ctx.model); assert.deepEqual(r.context.tools, []);
  assert.equal(r.options.maxRetries, 0); assert.equal(r.options.timeoutMs, 20000);
  assert.equal(r.options.reasoning, undefined, "omit reasoning to disable it using the provider-neutral SDK contract");
  r.resolve(reply()); await turn();
  assert.deepEqual(h.names, ["Fix Kitty padding on external monitor"]);
  assert.equal(h.receipts.length, 1);
  h.emit("agent_settled"); assert.equal(h.requests.length, 1);
});

test("existing names, headless sessions and missing models cause no request", () => {
  for (const options of [{ name: "My explicit name" }, { mode: "rpc" }, { mode: "print" }, { mode: "json" }, { model: null }]) {
    const h = host(options); h.emit("session_start"); h.emit("agent_settled");
    assert.equal(h.requests.length, 0);
  }
});

test("manual rename, shutdown, session replacement, and abandoned branches prevent stale writes", async () => {
  for (const change of [(h) => h.setName("manual"), (h) => h.emit("session_shutdown"), (h) => h.switchId(), (h) => h.setBranch([user])]) {
    const h = host(); h.emit("session_start"); change(h);
    h.requests[0].resolve(reply()); await turn(); assert.deepEqual(h.names, []);
  }
});

test("session reset aborts old request and allows new session naming", async () => {
  const h = host(); h.emit("session_start"); const old = h.requests[0];
  h.emit("session_shutdown"); assert.equal(old.options.signal.aborted, true);
  h.switchId(); h.emit("session_start");
  old.resolve(reply("Wrong old session title")); await turn();
  assert.equal(h.receipts.length, 0); assert.deepEqual(h.names, []);
  h.requests[1].resolve(reply()); await turn(); assert.equal(h.names.length, 1);
});

test("failure, abort, truncation and invalid output leave name unchanged without turn retries", async () => {
  for (const settle of [r => r.reject(new Error("offline")), r => r.resolve({ ...reply(), stopReason: "aborted" }), r => r.resolve({ ...reply(), stopReason: "error" }), r => r.resolve({ ...reply(), stopReason: "length" }), r => r.resolve(reply("bad\nname")), r => r.resolve(reply(""))]) {
    const h = host(); h.emit("session_start"); settle(h.requests[0]); await turn();
    assert.deepEqual(h.names, []); h.emit("agent_settled"); assert.equal(h.requests.length, 1);
  }
});

test("deadline aborts and late provider output cannot name the session", async (t) => {
  let deadline;
  t.mock.method(globalThis, "setTimeout", (fn) => { deadline = fn; return { unref() {} }; });
  t.mock.method(globalThis, "clearTimeout", () => {});
  const h = host(); h.emit("session_start"); deadline();
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.requests[0].resolve(reply()); await turn(); assert.deepEqual(h.names, []);
});

test("title validation and excerpt extraction exclude tools, images, and reasoning", () => {
  assert.equal(cleanTitle('"Fix Kitty left window padding"'), "Fix Kitty left window padding");
  for (const bad of ["", "a\nb", "a\x1bb", "a\u202eb", "a\u2028b", "a\u2029b", "a".repeat(81)]) assert.equal(cleanTitle(bad), undefined);
  const exchange = firstExchange([
    { ...user, message: { role: "user", content: [{ type: "image", data: "SECRET IMAGE" }, { type: "text", text: "u".repeat(9000) }] } },
    { type: "message", message: { role: "toolResult", content: "SECRET TOOL" } },
    { ...assistant, message: { ...assistant.message, content: [{ type: "thinking", thinking: "SECRET REASONING" }, { type: "text", text: "a".repeat(9000) }] } },
  ]);
  assert.equal(JSON.parse(exchange.text).user.length, 4000);
  assert.equal(JSON.parse(exchange.text).assistant.length, 4000);
  assert.ok(!exchange.text.includes("SECRET"));
  assert.equal(firstExchange([user, { ...assistant, message: { ...assistant.message, stopReason: "error" } }]), undefined);
});

test("generated name persists through real SessionManager reopen", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-auto-name-"));
  try {
    const manager = SessionManager.create(dir, dir);
    manager.appendMessage({ ...user.message, timestamp: Date.now() });
    manager.appendMessage({ ...reply(), timestamp: Date.now() });
    const h = host();
    h.ctx.sessionManager = manager;
    h.pi.getSessionName = () => manager.getSessionName();
    h.pi.setSessionName = (name) => manager.appendSessionInfo(name);
    h.pi.appendEntry = (type, data) => manager.appendCustomEntry(type, data);
    h.emit("session_start"); h.requests[0].resolve(reply()); await turn();
    const reopened = SessionManager.open(manager.getSessionFile());
    assert.equal(reopened.getSessionName(), "Fix Kitty padding on external monitor");
    h.emit("session_start"); assert.equal(h.requests.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
