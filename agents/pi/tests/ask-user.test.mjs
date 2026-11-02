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
const { default: extension, questionnaire } = await jiti.import(new URL("../extensions/ask-user.ts", import.meta.url).pathname);

const theme = { fg: (_color, text) => text, bg: (_color, text) => text };
const tui = { requestRender() {}, terminal: { rows: 40, columns: 100 } };
const ENTER = "\r";
const DOWN = "\x1b[B";
const ESC = "\x1b";

const q = (header, labels, multiSelect = false) => ({
  question: `Which ${header}?`, header, multiSelect, options: labels.map((label) => ({ label, description: `about ${label}` })),
});

/** Runs the component against key presses and returns what it resolved. */
function answer(questions, keys) {
  let result;
  const view = questionnaire(questions, tui, theme, (value) => { result = value; });
  for (const key of keys) {
    if (result) break;
    view.handleInput(key);
    assert.ok(view.render(80).length > 0);
  }
  return result;
}

test("a number or the arrows and Enter pick one option", () => {
  assert.deepEqual(answer([q("Approach", ["A", "B"])], ["2"]).answers, [{ labels: ["B"] }]);
  assert.deepEqual(answer([q("Approach", ["A", "B"])], [DOWN, ENTER]).answers, [{ labels: ["B"] }]);
});

test("a multi-select question toggles with numbers or Space and confirms with Enter", () => {
  const result = answer([q("Features", ["A", "B", "C"], true)], ["1", "3", " ", " ", ENTER]);
  assert.equal(result.cancelled, false);
  assert.deepEqual(result.answers, [{ labels: ["A", "C"] }], "3 toggled C on, then Space on its row toggled it off and on again");
});

test("Other takes a written answer, and Esc in the editor goes back instead of dismissing", () => {
  const result = answer([q("Approach", ["A", "B"])], ["3", ESC, "3", ..."use C", ENTER]);
  assert.deepEqual(result.answers, [{ labels: [], custom: "use C" }]);
});

test("several questions move to the next unanswered one, then submit from the Submit tab", () => {
  const result = answer([q("First", ["A", "B"]), q("Second", ["C", "D"])], ["1", "2", ENTER]);
  assert.equal(result.cancelled, false);
  assert.deepEqual(result.answers, [{ labels: ["A"] }, { labels: ["D"] }]);
  assert.equal(answer([q("First", ["A", "B"]), q("Second", ["C", "D"])], ["\t", "\t", ENTER]), undefined, "an incomplete set cannot submit");
});

test("Esc dismisses", () => {
  assert.equal(answer([q("Approach", ["A", "B"])], [ESC]).cancelled, true);
});

test("the render fits the width", () => {
  const view = questionnaire([q("Approach", ["A very long option label that keeps going", "B"]), q("Second", ["C", "D"])], tui, theme, () => {});
  for (const line of view.render(30)) assert.ok(line.length <= 30, line);
});

test("the tool returns the answers as text the model can quote", async () => {
  let tool;
  extension({ registerTool(definition) { tool = definition; } });
  const input = { questions: [{ question: "Which approach?", header: "A very long header", options: [{ label: "Fast (Recommended)" }, { label: "Safe" }] }] };
  const ctx = { mode: "tui", ui: { custom: (factory) => new Promise((resolve) => factory(tui, theme, {}, resolve).handleInput("1")) } };
  const result = await tool.execute("call", input, undefined, undefined, ctx);
  assert.equal(result.content[0].text, 'The user answered:\n"Which approach?" = "Fast (Recommended)"');
  assert.equal(result.details.questions[0].header, "A very long ", "headers are cut to 12 characters");

  const printMode = await tool.execute("call", input, undefined, undefined, { mode: "print" });
  assert.equal(printMode.isError, true);
  const tooFew = await tool.execute("call", { questions: [{ question: "Q?", header: "H", options: [{ label: "only" }] }] }, undefined, undefined, ctx);
  assert.match(tooFew.content[0].text, /two to four options/);
});

test("revisiting a multi-select question and changing it requires confirming it again", () => {
  const first = q("Features", ["A", "B"], true);
  const keys = ["1", ENTER, "1", "\t", "2", "\t", "\t", ENTER];
  assert.equal(answer([first, q("Second", ["C", "D"])], keys), undefined, "the changed question is unanswered, so Submit refuses");
  const result = answer([first, q("Second", ["C", "D"])], [...keys, "\t", ENTER, ENTER]);
  assert.deepEqual(result.answers, [{ labels: ["A", "B"] }, { labels: ["C"] }]);
});

test("every render fits the width it is given, not the first one", () => {
  const view = questionnaire([q("Approach", ["A", "B"])], tui, theme, () => {});
  view.render(80);
  for (const line of view.render(30)) assert.ok(line.length <= 30, line);
});

test("an abort releases the picker instead of waiting for a key", async () => {
  let tool;
  extension({ registerTool(definition) { tool = definition; } });
  const controller = new AbortController();
  const ctx = { mode: "tui", ui: { custom: (factory) => new Promise((resolve) => { factory(tui, theme, {}, resolve); controller.abort(); }) } };
  const result = await tool.execute("call", { questions: [q("Approach", ["A", "B"])] }, controller.signal, undefined, ctx);
  assert.match(result.content[0].text, /dismissed .* approves nothing/);
  const already = await tool.execute("call", { questions: [q("Approach", ["A", "B"])] }, controller.signal, undefined, ctx);
  assert.equal(already.details.cancelled, true);
});

test("answers reach the model as JSON, so quotes, newlines, and commas stay unambiguous", async () => {
  let tool;
  extension({ registerTool(definition) { tool = definition; } });
  const run = (questions, keys) => tool.execute("call", { questions }, undefined, undefined, {
    mode: "tui", ui: { custom: (factory) => new Promise((resolve) => { const view = factory(tui, theme, {}, resolve); for (const key of keys) view.handleInput(key); }) },
  });
  const multi = await run([{ question: 'Pick "some"?', header: "Pick", multiSelect: true, options: [{ label: "A, B" }, { label: "C" }] }], ["1", "2", ENTER]);
  assert.equal(multi.content[0].text, 'The user answered:\n"Pick \\"some\\"?" = ["A, B","C"]');
  const written = await run([q("Approach", ["A", "B"])], ["3", ..."x\\ny", ENTER]);
  assert.match(written.content[0].text, /= "x\\\\ny"$/);
});
