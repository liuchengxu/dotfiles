import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const { default: extension, enrichError } = await createJiti(import.meta.url).import(new URL("../extensions/connection-error-display.ts", import.meta.url).pathname);

/** A loaded extension whose model the test controls. */
function session(t, initial = { provider: "openai", id: "gpt-6-astra" }) {
  const handlers = new Map();
  let model = initial;
  extension({ on(event, handler) { handlers.set(event, handler); } });
  const emit = (event, payload = {}) => handlers.get(event)?.(payload, { model });
  const end = (message) => emit("message_end", { message });
  const fail = (errorMessage = "Connection error.") => end({ role: "assistant", content: [], stopReason: "error", errorMessage });
  return {
    emit: (event, payload) => {
      if (event === "model_select") model = payload.model;
      return emit(event, payload);
    },
    fail,
    succeed: () => end({ role: "assistant", content: [{ type: "text", text: "ok" }], stopReason: "stop" }),
    user: () => end({ role: "user", content: [{ type: "text", text: "again" }] }),
    failText: fail,
  };
}

test("the first failure explains the cause; consecutive ones only count", (t) => {
  const s = session(t);
  assert.match(s.fail().message.errorMessage, /Connection error\..*openai\/gpt-6-astra failed before a response/);
  const second = s.fail().message.errorMessage;
  assert.equal(second, "Connection error. — retry 2 for openai/gpt-6-astra.");
  assert.equal(s.fail().message.errorMessage, "Connection error. — retry 3 for openai/gpt-6-astra.");
});

test("a completed reply, a user message, or a model switch starts the count over", (t) => {
  const s = session(t);
  s.fail();
  assert.equal(s.fail().message.errorMessage, "Connection error. — retry 2 for openai/gpt-6-astra.");
  s.succeed();
  assert.match(s.fail().message.errorMessage, /failed before a response/);
  s.fail();
  s.user();
  assert.match(s.fail().message.errorMessage, /failed before a response/);
  s.fail();
  s.emit("model_select", { model: { provider: "kimi-coding", id: "k3.1-pro" } });
  assert.match(s.fail("Request timed out.").message.errorMessage, /kimi-coding\/k3\.1-pro/);
});

test("a non-generic error message passes through untouched", (t) => {
  const s = session(t);
  const event = s.fail("Rate limit exceeded for tier.");
  assert.equal(event, undefined);
});
