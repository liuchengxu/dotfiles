import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
  "@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
  "@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { default: extension, fingerprint } = await jiti.import(new URL("../extensions/repetition-breaker.ts", import.meta.url).pathname);

/** A loaded breaker with helpers that replay pi's call/result events. */
function session() {
  const handlers = new Map();
  const sent = [];
  const notifications = [];
  const aborted = { count: 0 };
  extension({
    on(event, handler) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
    sendMessage(message, options) { sent.push({ message, options }); },
  });
  const ctx = {
    ui: { notify(text, level) { notifications.push({ text, level }); } },
    abort() { aborted.count += 1; },
  };
  const emit = (event, payload) => {
    let result;
    for (const handler of handlers.get(event) ?? []) result = handler(payload, ctx) ?? result;
    return result;
  };
  let n = 0;
  /** Runs one top-level call and (unless blocked) its result. */
  const call = (toolName, input, text = "same") => {
    const toolCallId = `call-${++n}`;
    const blocked = emit("tool_call", { type: "tool_call", toolName, input, toolCallId });
    if (!blocked) {
      emit("tool_result", { type: "tool_result", toolCallId, toolName, input, content: [{ type: "text", text }], isError: false });
    }
    return blocked;
  };
  const warnings = () => sent.filter((m) => /unchanged results/.test(m.message.content));
  return { sent, notifications, aborted, emit, call, warnings };
}

test("four identical calls with unchanged results warn once; the fifth stays quiet", () => {
  const s = session();
  for (let i = 0; i < 5; i++) assert.equal(s.call("bash", { command: "true" }), undefined);
  assert.equal(s.warnings().length, 1);
  assert.match(s.warnings()[0].message.content, /4 times with unchanged results/);
  assert.deepEqual(s.warnings()[0].options, { triggerTurn: false, deliverAs: "steer" });
  assert.equal(s.aborted.count, 0);
});

test("the sixth identical attempt is blocked with terminate and a visible pause", () => {
  const s = session();
  for (let i = 0; i < 5; i++) s.call("bash", { command: "true" });
  const result = s.call("bash", { command: "true" });
  assert.equal(result?.block, true);
  assert.equal(result?.terminate, true);
  assert.match(result?.reason ?? "", /paused after 6 repetitions.*Background tasks were not cancelled/);
  assert.equal(s.notifications.at(-1)?.level, "warning");
});

test("a further attempt after the block aborts the run, not a user Escape", () => {
  const s = session();
  for (let i = 0; i < 5; i++) s.call("bash", { command: "true" });
  s.call("bash", { command: "true" });
  const result = s.call("bash", { command: "true" });
  assert.equal(result?.block, true);
  assert.equal(s.aborted.count, 1);
  assert.match(result?.reason ?? "", /not a user Escape/);
});

test("a changed result resets the streak: the warning must be re-earned", () => {
  const s = session();
  for (let i = 0; i < 3; i++) s.call("bash", { command: "true" }, "same");
  s.call("bash", { command: "true" }, "different");
  for (let i = 0; i < 3; i++) s.call("bash", { command: "true" }, "same");
  assert.equal(s.warnings().length, 0, "only three unchanged since the change");
  s.call("bash", { command: "true" }, "same");
  assert.equal(s.warnings().length, 1, "four unchanged since the change warns");
});

test("alternating two calls still counts: the window is not consecutive-only", () => {
  const s = session();
  for (let i = 0; i < 4; i++) {
    s.call("bash", { command: "true" });
    s.call("bg_logs", { id: "bg-1" });
  }
  assert.equal(s.warnings().length, 2, "both fingerprints reached four unchanged executions");
});

test("a genuine user message resets escalation; an extension-originated input does not", () => {
  const s = session();
  for (let i = 0; i < 6; i++) s.call("bash", { command: "true" });
  s.emit("input", { type: "input", text: "extension-originated", source: "extension" });
  assert.equal(s.call("bash", { command: "true" })?.block, true, "still armed after extension input");
  assert.equal(s.aborted.count, 1);
  s.emit("input", { type: "input", text: "user resumes", source: "interactive" });
  assert.equal(s.call("bash", { command: "true" }), undefined, "user input re-arms the breaker");
  assert.equal(s.aborted.count, 1, "no further abort");
});

test("nested calls (codemode children) are not counted", () => {
  const s = session();
  for (let i = 0; i < 8; i++) {
    const toolCallId = `parent/${i}`;
    s.emit("tool_call", { type: "tool_call", toolName: "bash", input: { command: "true" }, toolCallId, parentToolCallId: "parent" });
    s.emit("tool_result", { type: "tool_result", toolCallId, toolName: "bash", input: {}, content: [{ type: "text", text: "same" }], isError: false, parentToolCallId: "parent" });
  }
  assert.equal(s.warnings().length, 0);
});

test("bash descriptions are presentation-only and do not change the fingerprint", () => {
  assert.equal(
    fingerprint("bash", { command: "true", description: "one" }),
    fingerprint("bash", { command: "true", description: "two" }),
  );
  assert.notEqual(fingerprint("bash", { command: "true" }), fingerprint("bash", { command: "false" }));
  const s = session();
  for (let i = 0; i < 4; i++) s.call("bash", { command: "true", description: `attempt ${i}` });
  assert.equal(s.warnings().length, 1);
});

test("distinct calls with distinct arguments never warn", () => {
  const s = session();
  for (let i = 0; i < 12; i++) s.call("read", { path: `file-${i}.ts` });
  assert.equal(s.warnings().length, 0);
  assert.equal(s.sent.length, 0);
});

test("argument key order does not change the fingerprint, array order does", () => {
  assert.equal(
    fingerprint("edit", { path: "a", edits: [{ oldText: "x", newText: "y" }] }),
    fingerprint("edit", { edits: [{ newText: "y", oldText: "x" }], path: "a" }),
  );
  assert.notEqual(
    fingerprint("bash", { command: "echo", args: ["a", "b"] }),
    fingerprint("bash", { command: "echo", args: ["b", "a"] }),
  );
});
