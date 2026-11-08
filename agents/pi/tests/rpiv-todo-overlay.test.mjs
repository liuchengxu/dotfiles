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
	"@earendil-works/pi-ai": join(root, "node_modules/@earendil-works/pi-ai/dist/index.js"),
	"typebox": join(root, "node_modules/typebox/build/index.mjs"),
	"typebox/value": join(root, "node_modules/typebox/build/value/index.mjs"),
} });
const { formatOverlayTaskLine, overlayStatusGlyph, IN_PROGRESS_FRAMES } = await jiti.import(new URL("../extensions/rpiv-todo/view/format.ts", import.meta.url).pathname);

const theme = { fg: (_token, text) => text, strikethrough: (text) => text };
const task = (overrides = {}) => ({ id: 4, subject: "Dual review", status: "in_progress", blockedBy: [3, 5], ...overrides });

test("a satisfied blocker is hidden; an unsatisfied one stays", () => {
	const line = formatOverlayTaskLine(task(), theme, true, 0, new Set([3]));
	assert.match(line, /⛓ #5/);
	assert.ok(!line.includes("#3"), "the completed blocker #3 is noise and disappears");
});

test("with every blocker satisfied no chain renders at all", () => {
	const line = formatOverlayTaskLine(task(), theme, true, 0, new Set([3, 5]));
	assert.ok(!line.includes("⛓"), "nothing is blocked anymore");
});

test("without a resolved set the chain renders verbatim", () => {
	const line = formatOverlayTaskLine(task(), theme, true);
	assert.match(line, /⛓ #3,#5/);
});

test("the in-progress marker animates through four frames; other statuses stay static", () => {
	const frames = [0, 1, 2, 3].map((frame) => overlayStatusGlyph("in_progress", theme, frame));
	assert.deepEqual(frames, [...IN_PROGRESS_FRAMES]);
	assert.equal(overlayStatusGlyph("in_progress", theme, 4), IN_PROGRESS_FRAMES[0], "the frame counter wraps");
	for (const status of ["pending", "completed", "deleted"]) {
		const a = overlayStatusGlyph(status, theme, 0);
		const b = overlayStatusGlyph(status, theme, 2);
		assert.equal(a, b, `${status} does not animate`);
	}
});

test("the fork loads through its real entry: every import resolves outside npm", async () => {
	const { default: entry } = await jiti.import(new URL("../extensions/rpiv-todo/index.ts", import.meta.url).pathname);
	assert.equal(typeof entry, "function", "index.ts exports the extension entry");
});
