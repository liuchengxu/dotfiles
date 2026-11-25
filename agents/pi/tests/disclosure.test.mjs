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
const { collapseCodeBlocks } = await jiti.import(new URL("../extensions/disclosure.ts", import.meta.url).pathname);
const { default: disclosure } = await jiti.import(new URL("../extensions/disclosure.ts", import.meta.url).pathname);
const { AssistantMessageComponent } = await jiti.import(join(root, "dist/index.js"));
const { stripTerminalSequences } = await jiti.import(join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"));
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

test("a note between tool rows stays two dim lines until expanded", () => {
	const component = new AssistantMessageComponent({ ...interim(NOTE), stopReason: undefined });
	const streaming = plain(component.render(80));
	assert.ok(streaming.length > 3, "while streaming, before the tool calls are known, the text shows in full");
	component.updateContent(interim(NOTE));
	const note = component.render(80);
	assert.equal(note.length, 3, "two lines plus the count, and no blank line above");
	assert.ok(note[0].startsWith("\x1b[2m⏺ "), "dim, and still one marked block");
	assert.match(plain(note)[2], /^  … \+\d+ lines? · Ctrl\+O for details$/);
	assert.deepEqual(plain(note).slice(0, 2), streaming.slice(1, 3), "the first two lines as written");
	component.setExpanded(true);
	const expanded = component.render(80);
	assert.deepEqual(plain(expanded), streaming.slice(1), "expanded: every line at full length, still tight between the rows");
	assert.ok(!expanded.some((line) => line.startsWith("\x1b[2m")), "at normal weight once expanded");
	component.setExpanded(false);
	assert.equal(component.render(80).length, 3, "collapsing returns to the note");
});

test("a final reply and a tool-only step render as before", () => {
	const reply = new AssistantMessageComponent({ role: "assistant", stopReason: "stop", content: [{ type: "text", text: NOTE }] });
	const lines = reply.render(80);
	assert.equal(stripTerminalSequences(lines[0]), "", "the reply keeps the blank line above it");
	assert.ok(plain(lines).length > 3, "and all of its lines");
	assert.ok(!lines.some((line) => line.startsWith("\x1b[2m")), "at normal weight");
	assert.deepEqual(plain(new AssistantMessageComponent(interim("")).render(80)), [], "a step with no text has no block of its own, as before");
});
