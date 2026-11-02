import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
// The threshold is read at import and the terminal type at each alert: ambient values would change what is written.
delete process.env.PI_NOTIFY_MIN_RUN_MS;
delete process.env.KITTY_WINDOW_ID;
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const { default: extension, clean, sequence } = await createJiti(import.meta.url).import(new URL("../extensions/notify.ts", import.meta.url).pathname);

/** A loaded extension whose clock and terminal the test controls. */
function session(t, mode = "tui") {
  let now = 0;
  t.mock.method(Date, "now", () => now);
  const handlers = new Map();
  const written = [];
  extension({ on(event, handler) { handlers.set(event, handler); } }, (data) => written.push(data));
  const emit = (event, payload = {}) => handlers.get(event)?.(payload, { mode });
  emit("session_start");
  const answer = (text) => ({ role: "assistant", content: [{ type: "text", text }] });
  return {
    written,
    run(ms, text = "Done.", aborted = false) {
      emit("agent_start");
      now += ms;
      emit("agent_end", { messages: [answer(text)] });
      emit("agent_settled", { aborted });
    },
    prompt(kind = "custom", title) { emit("ui_prompt_start", { kind, ...(title && { title }) }); },
    start() { emit("agent_start"); },
  };
}

test("a long run alerts with the first line of the answer; a short or aborted one does not", (t) => {
  const s = session(t);
  s.run(16_000, "Fixed the bug.\n\nDetails follow.");
  assert.deepEqual(s.written, ["\x1b]777;notify;pi is waiting for you;Fixed the bug.\x07"]);
  s.run(2_000);
  s.run(60_000, "Stopped.", true);
  assert.equal(s.written.length, 1);
});

test("a question that opens during a run alerts at once; one opened while idle does not", (t) => {
  const s = session(t);
  s.prompt();
  assert.equal(s.written.length, 0, "the user opened it themselves");
  s.start();
  s.prompt("custom");
  s.prompt("confirm", "Delete the branch?");
  assert.match(s.written[0], /pi needs your input;A question is waiting/);
  assert.match(s.written[1], /Delete the branch\?/);
});

test("print mode writes nothing", (t) => {
  const s = session(t, "print");
  s.run(60_000);
  assert.equal(s.written.length, 0);
});

test("model text cannot break out of the escape sequence", () => {
  assert.equal(clean("ok\x07\x1b]52;c;evil\x1b\\; done", 100), "ok ]52,c,evil \\, done");
  assert.equal(clean("x".repeat(200), 10), `${"x".repeat(9)}…`);
  assert.equal(sequence("t", "b", true), "\x1b]99;i=1:d=0;t\x1b\\\x1b]99;i=1:p=body;b\x1b\\");
});
