import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const { default: extension } = await createJiti(import.meta.url).import(new URL("../extensions/todo-gate.ts", import.meta.url).pathname);

/** A loaded gate with helpers that replay pi events against it. */
function gate(branch = []) {
  const handlers = new Map();
  extension({ on(event, handler) { handlers.set(event, handler); }, registerCommand() {} });
  const emit = (event, payload, ctx) => handlers.get(event)?.(payload, ctx);
  let tasks = [];
  const todo = (action, input, error) => emit("tool_result", {
    toolName: "todo", toolCallId: "t", input: { action, ...input }, content: [{ type: "text", text: "" }], isError: false,
    details: { action, params: input, tasks, nextId: tasks.length + 1, ...(error && { error }) },
  });
  const g = {
    start(prompt = "go") {
      emit("session_start", {}, { sessionManager: { getBranch: () => branch } });
      emit("before_agent_start", { messageType: "user", prompt });
      return g;
    },
    prompt(prompt = "next") { emit("before_agent_start", { messageType: "user", prompt }); },
    create(subject) { tasks = [...tasks, { id: tasks.length + 1, subject, status: "pending" }]; todo("create", { subject }); },
    update(id, fields) { tasks = tasks.map((task) => task.id === id ? { ...task, ...fields } : task); todo("update", { id, ...fields }); },
    rejected(id, fields) { todo("update", { id, ...fields }, `#${id} not found`); },
    tree(nextBranch) { emit("session_tree", { type: "session_tree" }, { sessionManager: { getBranch: () => nextBranch } }); },
    followUp() { emit("input", { text: "and then Z", source: "interactive", streamingBehavior: "followUp" }); },
    bash(command, isError = false, details) {
      emit("tool_result", { toolName: "bash", toolCallId: "b", input: { command, description: `Run ${command}` }, content: [], isError, details });
    },
    read() { emit("tool_result", { toolName: "read", toolCallId: "r", input: { path: "x" }, content: [], isError: false }); },
    steer() { emit("input", { text: "also do Y", source: "interactive", streamingBehavior: "steer" }); },
    settle(overrides = {}) {
      return emit("agent_before_settle", { type: "agent_before_settle", entries: [], continue: false, outcome: "completed", context: { canContinue: false }, ...overrides });
    },
  };
  return g;
}

const message = (result) => result?.entries?.[0]?.content ?? "";

test("a passed check with the task still in_progress blocks the stop", () => {
  // The default settle context says canContinue: false, as pi's preview does
  // after every final answer; the audit must still run.
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("cargo test --locked");
  const result = g.settle();
  assert.equal(result?.continue, true);
  assert.equal(result.entries[0].type, "custom_message");
  assert.match(message(result), /"Run cargo test --locked" passed .* #1 is still in_progress/);
});

test("a failed check asks for the blocker and never for completion", () => {
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("npm test", true);
  const result = g.settle();
  assert.equal(result?.continue, true);
  assert.match(message(result), /failed .* Keep the task in_progress and record the blocker/);
  assert.doesNotMatch(message(result), /Mark it completed/);
});

test("a recorded blocker and an updated scope settle normally", () => {
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("pytest", true);
  g.update(1, { description: "blocked: fixture server is down" });
  assert.equal(g.settle(), undefined);

  const s = gate().start();
  s.create("fix bug");
  s.update(1, { status: "in_progress" });
  s.steer();
  assert.match(message(s.settle()), /user sent a message during the run/);
  s.prompt();
  s.create("also do Y");
  assert.equal(s.settle(), undefined);
});

test("a current list stops normally", () => {
  const g = gate().start();
  g.create("fix bug");
  g.create("write docs");
  g.update(1, { status: "in_progress" });
  g.bash("cargo test");
  g.update(1, { status: "completed" });
  g.update(2, { status: "in_progress" });
  g.read();
  assert.equal(g.settle(), undefined);
  assert.equal(gate().start().settle(), undefined, "no list, nothing to audit");
});

test("work with no in_progress task or two in_progress tasks is stale", () => {
  const g = gate().start();
  g.create("fix bug");
  g.read();
  assert.match(message(g.settle()), /no task is in_progress/);
  const h = gate().start();
  h.create("a");
  h.create("b");
  h.update(1, { status: "in_progress" });
  h.update(2, { status: "in_progress" });
  assert.match(message(h.settle()), /#1, #2 are all in_progress/);
});

test("the audit continues once per user prompt, so it cannot loop", () => {
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("cargo test");
  assert.equal(g.settle()?.continue, true);
  assert.equal(g.settle(), undefined, "a second settle in the same prompt passes");
  assert.equal(g.settle(), undefined);
  g.prompt();
  assert.equal(g.settle()?.continue, true, "a new user prompt audits again");
});

test("aborted runs, detached checks, and malformed input fail open", () => {
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("cargo test", false, { handoff: "detached bg-1" });
  assert.equal(g.settle(), undefined, "a detached check is not a result");
  g.bash("cargo test");
  assert.equal(g.settle({ outcome: "aborted" }), undefined);
  assert.doesNotThrow(() => g.settle({ context: undefined }));

  const m = gate().start();
  const handlers = new Map();
  extension({ on(event, handler) { handlers.set(event, handler); }, registerCommand() {} });
  handlers.get("session_start")({}, { sessionManager: { getBranch: () => { throw new Error("unavailable"); } } });
  assert.doesNotThrow(() => handlers.get("tool_result")({ toolName: "todo", input: undefined, content: [], isError: false, details: { tasks: "garbage" } }));
  assert.doesNotThrow(() => handlers.get("tool_result")({ toolName: "bash", input: null, content: [], isError: false }));
  assert.equal(handlers.get("agent_before_settle")({ outcome: "completed", context: { canContinue: true } }), undefined);
  assert.equal(handlers.get("agent_before_settle")(undefined), undefined);
  assert.equal(m.settle(), undefined);
});

const resultEntry = (status) => ({ type: "message", message: { role: "toolResult", toolName: "todo", details: { tasks: [{ id: 1, subject: "fix bug", status }] } } });
const stateEntry = (status) => ({ type: "custom", customType: "rpiv-todo-state", data: { tasks: [{ id: 1, subject: "fix bug", status }] } });

test("a resumed session audits the board it replays", () => {
  const g = gate([resultEntry("in_progress")]).start();
  g.bash("go test ./...");
  assert.match(message(g.settle()), /#1 is still in_progress/);
});

test("replay prefers the todo package's state entries, as rpiv-todo does", () => {
  // A codemode todo call leaves only the state entry, not a tool result.
  const g = gate([resultEntry("completed"), stateEntry("in_progress")]).start();
  g.bash("cargo test");
  assert.match(message(g.settle()), /#1 is still in_progress/);
  g.tree([stateEntry("completed")]);
  g.bash("cargo test");
  assert.equal(g.settle(), undefined, "branch navigation replays the new board");
});

test("a rejected todo call does not count as reconciliation", () => {
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("cargo test", true);
  g.rejected(9, { description: "blocked" });
  assert.match(message(g.settle()), /failed after the last todo update/);
});

test("the audit keeps entries that earlier handlers proposed", () => {
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("cargo test");
  const earlier = { type: "custom", customType: "other", data: 1 };
  const result = g.settle({ entries: [earlier] });
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0], earlier);
  assert.match(result.entries[1].content, /^TODO GATE: the todo list may be stale/);
});

test("a queued follow-up re-arms the audit", () => {
  const g = gate().start();
  g.create("fix bug");
  g.update(1, { status: "in_progress" });
  g.bash("cargo test");
  assert.equal(g.settle()?.continue, true);
  assert.equal(g.settle(), undefined);
  g.followUp();
  assert.equal(g.settle()?.continue, true, "new user work during the correction is audited too");
});
