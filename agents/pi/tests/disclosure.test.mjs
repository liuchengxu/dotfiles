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
