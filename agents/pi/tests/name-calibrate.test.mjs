import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { fsCache: false, alias: {
	"@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
	"@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { default: extension, readState, sessionFiles, applyRename, confirmView } = await jiti.import(new URL("../extensions/name-calibrate.ts", import.meta.url).pathname);

function sessionLine(extra) {
	return JSON.stringify({ id: "m" + Math.random().toString(16).slice(2, 8), parentId: null, timestamp: new Date().toISOString(), ...extra });
}

function tempSession(name, lines = []) {
	const dir = mkdtempSync(join(tmpdir(), "name-cal-"));
	const path = join(dir, "session.jsonl");
	writeFileSync(path, [sessionLine({ type: "message", message: { role: "user", content: "first prompt" } }),
		...lines, sessionLine({ type: "session_info", name })].join("\n") + "\n");
	return { dir, path };
}

test("sessionFiles walks project dirs and run trees, skipping worker transcripts", () => {
	const dir = mkdtempSync(join(tmpdir(), "name-cal-scan-"));
	mkdirSync(join(dir, "project-a"), { recursive: true });
	mkdirSync(join(dir, "s1/run-0"), { recursive: true });
	writeFileSync(join(dir, "project-a/loose.jsonl"), "");
	writeFileSync(join(dir, "s1/run-0/session.jsonl"), "");
	writeFileSync(join(dir, "s1/run-0/other_worker_transcript.jsonl"), "");
	writeFileSync(join(dir, "note.txt"), "");
	const found = sessionFiles(dir).map((p) => p.slice(dir.length + 1));
	assert.deepEqual(found.sort(), ["project-a/loose.jsonl", "s1/run-0/session.jsonl"]);
	rmSync(dir, { recursive: true, force: true });
});

test("readState surfaces the newest name, the leaf id, and the latest user text; skips uncut tails", () => {
	const { dir, path } = tempSession("stale name", [
		sessionLine({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "old answer" }] } }),
		sessionLine({ type: "message", message: { role: "user", content: "the latest topic of work" } }),
	]);
	const state = readState(path);
	assert.equal(state.name, "stale name");
	assert.equal(state.lastUserText, "the latest topic of work");
	assert.ok(state.leafId);
	assert.ok(state.ids.size >= 4);
	assert.equal(readState(join(dir, "missing.jsonl")), undefined);
	rmSync(dir, { recursive: true, force: true });
});

test("a file with no name at all is not calibratable; a tail cut drops its partial first line", () => {
	const dir = mkdtempSync(join(tmpdir(), "name-cal-noname-"));
	const path = join(dir, "session.jsonl");
	writeFileSync(path, sessionLine({ type: "message", message: { role: "user", content: "hi" } }) + "\n");
	assert.equal(readState(path), undefined);
	const big = join(dir, "big.jsonl");
	const line = JSON.stringify({ id: "x", type: "message", message: { role: "user", content: "tail user text" } });
	writeFileSync(big, "x".repeat(600 * 1024) + "\n" + line + "\n" + JSON.stringify({ id: "y", type: "session_info", name: "kept" }) + "\n");
	const state = readState(big);
	assert.equal(state.name, "kept");
	assert.equal(state.lastUserText, "tail user text");
	rmSync(dir, { recursive: true, force: true });
});

test("applyRename appends a chained session_info plus a renamed record with fresh ids", () => {
	const { dir, path } = tempSession("old title");
	const state = readState(path);
	const leafBefore = state.leafId;
	const idsBefore = new Set(state.ids);
	applyRename(state, "new title from latest work", 1_700_000_000_000);
	const lines = readFileSync(path, "utf8").trim().split("\n");
	const info = JSON.parse(lines.at(-2));
	const record = JSON.parse(lines.at(-1));
	assert.equal(info.type, "session_info");
	assert.equal(info.name, "new title from latest work");
	assert.equal(info.parentId, leafBefore);
	assert.equal(record.type, "custom");
	assert.equal(record.customType, "auto-session-name");
	assert.deepEqual(record.data, { kind: "renamed", title: "new title from latest work", at: 1_700_000_000_000 });
	assert.equal(record.parentId, info.id);
	assert.notEqual(info.id, record.id);
	for (const id of [info.id, record.id]) assert.ok(!idsBefore.has(id), "ids fresh");
	assert.equal(readState(path).name, "new title from latest work");
	rmSync(dir, { recursive: true, force: true });
});

test("confirmView maps keys to yes, no, and stop", () => {
	const seen = [];
	const theme = { fg: (_n, t) => t };
	const view = confirmView(null, theme, "Rename?", "old → new", (value) => seen.push(value));
	const lines = view.render(80);
	assert.ok(lines.some((l) => l.includes("Rename?")));
	view.handleInput("y");
	view.handleInput("n");
	view.handleInput("\x1b");
	view.handleInput("q");
	assert.deepEqual(seen, [true, false, undefined], "unmapped keys do nothing");
});

test("the extension registers the command and reports when nothing can be calibrated", async () => {
	const commands = new Map();
	const notices = [];
	const custom = [];
	const pi = { registerCommand: (n, c) => commands.set(n, c), appendEntry: () => {} };
	extension(pi);
	assert.ok(commands.has("name-calibrate"));
	const ctx = {
		mode: "tui", model: { provider: "test", id: "test" },
		sessionManager: { getSessionId: () => "self" },
		ui: { notify: (...a) => notices.push(a), custom: (f) => { custom.push(f); return Promise.resolve(false); } },
	};
	const dir = mkdtempSync(join(tmpdir(), "name-cal-empty-"));
	await commands.get("name-calibrate").handler("", ctx);
	assert.match(notices.at(-1)[0], /No calibratable sessions/);
	rmSync(dir, { recursive: true, force: true });
});
