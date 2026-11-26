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
const { collapseCodeBlocks, linkRows } = await jiti.import(new URL("../extensions/disclosure.ts", import.meta.url).pathname);
const { default: disclosure } = await jiti.import(new URL("../extensions/disclosure.ts", import.meta.url).pathname);
const { AssistantMessageComponent, ToolExecutionComponent, UserMessageComponent, initTheme } = await jiti.import(join(root, "dist/index.js"));
const { Container, stripTerminalSequences } = await jiti.import(join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"));
initTheme();
disclosure({});

const NOTE = "Yes — and now that the ask bar has a line of its own, the two controls at its far right are the odd part: a clean input reads better, and model and thinking are set once and rarely touched.";
const interim = (text) => ({ role: "assistant", stopReason: "toolUse", content: [{ type: "text", text }, { type: "toolCall", id: "c1", name: "read", arguments: { path: "/r/a.ts" } }] });
const plain = (lines) => lines.map(stripTerminalSequences);

const block = (info, count) => ["```" + info, ...Array.from({ length: count }, (_, i) => `line ${i}`), "```"].join("\n");

test("a reply's config or snippet renders as written", () => {
	const toml = block("toml", 7);
	assert.equal(collapseCodeBlocks(`Use this:\n${toml}`), `Use this:\n${toml}`);
	assert.equal(collapseCodeBlocks(block("rust", 40)), block("rust", 40));
});

test("a dump and a workflow script are summarized", () => {
	assert.equal(collapseCodeBlocks(block("diff", 41)), "diff · 41 lines · Ctrl+O for details");
	assert.equal(collapseCodeBlocks(block("js workflow", 3)), "Agent workflow · Ctrl+O for details");
});

test("a note between tool rows reads like any reply", () => {
	const lines = new AssistantMessageComponent(interim(NOTE)).render(80);
	assert.equal(stripTerminalSequences(lines[0]), "", "the blank line above it stays");
	assert.ok(plain(lines).length > 3, "and all of its lines");
	assert.ok(!lines.some((line) => line.startsWith("\x1b[2m")), "at normal weight");
});

const row = (id, lines) => new ToolExecutionComponent("bash", id, {}, {},
	{ renderShell: "self", renderCall: () => ({ render: () => lines, invalidate() {} }) }, { requestRender() {} }, process.cwd());
const prompt = () => new UserMessageComponent("the question");

test("a tool row sits tight under the visible row before it", () => {
	const chat = new Container();
	const step = { role: "assistant", stopReason: "toolUse", content: [{ type: "toolCall", id: "c9", name: "bash", arguments: {} }] };
	for (const child of [prompt(), new AssistantMessageComponent(interim(NOTE)), row("c1", ["ROW 1"]), row("c2", []),
		new AssistantMessageComponent(step), row("c3", ["ROW 2"])]) chat.addChild(child);
	linkRows(chat);
	assert.deepEqual(plain(chat.render(80)).slice(-3), ["", "ROW 1", "ROW 2"], "a vanished row or a step without text opens no gap");
});

test("a tool row keeps Pi's blank line after a note or the prompt", () => {
	for (const head of [[prompt(), new AssistantMessageComponent(interim(NOTE))], [prompt()]]) {
		const chat = new Container();
		for (const child of [...head, row("c1", ["ROW 1"])]) chat.addChild(child);
		linkRows(chat);
		assert.deepEqual(plain(chat.render(80)).slice(-2), ["", "ROW 1"]);
	}
});

test("a tool row keeps Pi's blank line when expanded", () => {
	const chat = new Container();
	const last = row("c3", ["ROW 2"]);
	for (const child of [prompt(), new AssistantMessageComponent(interim(NOTE)), row("c1", ["ROW 1"]), last]) chat.addChild(child);
	linkRows(chat);
	last.setExpanded(true);
	assert.deepEqual(plain(chat.render(80)).slice(-2), ["", "ROW 2"]);
});

test("a final reply and a tool-only step render as before", () => {
	const reply = new AssistantMessageComponent({ role: "assistant", stopReason: "stop", content: [{ type: "text", text: NOTE }] });
	const lines = reply.render(80);
	assert.equal(stripTerminalSequences(lines[0]), "", "the reply keeps the blank line above it");
	assert.ok(plain(lines).length > 3, "and all of its lines");
	assert.ok(!lines.some((line) => line.startsWith("\x1b[2m")), "at normal weight");
	assert.deepEqual(plain(new AssistantMessageComponent(interim("")).render(80)), [], "a step with no text has no block of its own, as before");
});
