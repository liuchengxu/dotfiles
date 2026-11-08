import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, appendFileSync, utimesSync } from "node:fs";
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
const { default: extension, readState, sessionFiles, applyRename, confirmView, calibrate } = await jiti.import(new URL("../extensions/name-calibrate.ts", import.meta.url).pathname);
const { SessionManager } = await import(pathToFileURL(join(root, "dist/core/session-manager.js")));

let seq = 0;
function sessionLine(extra) {
	return JSON.stringify({ id: `e${(seq++).toString(16)}`, parentId: null, timestamp: new Date().toISOString(), ...extra });
}

function tempSession(name, userContent, dir = mkdtempSync(join(tmpdir(), "name-cal-"))) {
	const path = join(dir, "session.jsonl");
	writeFileSync(path, [
		JSON.stringify({ type: "session", version: 3, id: "01a1a241-1c60-717b-9ca6-98e885071546", timestamp: new Date().toISOString(), cwd: "/test" }),
		sessionLine({ type: "session_info", name }),
		sessionLine({ type: "message", message: { role: "user", content: userContent } }),
	].join("\n") + "\n");
	utimesSync(path, new Date(Date.now() - 3_600_000), new Date(Date.now() - 3_600_000));
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

test("readState handles array content, image-only messages, early names, and long middles", async () => {
	const { dir, path } = tempSession("stale name", [{ type: "text", text: "the latest topic of work" }]);
	appendFileSync(path, sessionLine({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "answer" }] } }) + "\n");
	const state = await readState(path);
	assert.equal(state.name, "stale name");
	assert.equal(state.lastUserText, "the latest topic of work");
	assert.ok(state.leafId);
	assert.ok(state.ids.size >= 3);
	rmSync(dir, { recursive: true, force: true });

	const img = tempSession("named", [{ type: "image", source: { type: "base64" } }, { type: "text", text: "  " }]);
	assert.equal((await readState(img.path)).lastUserText, undefined, "no text means no stale fallback topic");
	rmSync(img.dir, { recursive: true, force: true });

	const long = mkdtempSync(join(tmpdir(), "name-cal-long-"));
	const big = join(long, "big.jsonl");
	writeFileSync(big, sessionLine({ type: "session_info", name: "kept from the top" }) + "\n");
	appendFileSync(big, sessionLine({ type: "message", message: { role: "user", content: [{ type: "text", text: "much later topic" }] } }) + "\n");
	appendFileSync(big, "x".repeat(700 * 1024).replace(/x/g, (c, i) => (i % 80 === 79 ? "\n" : c)) + "\n");
	assert.equal((await readState(big)).name, "kept from the top");
	rmSync(long, { recursive: true, force: true });
});

test("applyRename appends a chained pair, replays through SessionManager, and refuses a moved leaf", async () => {
	const { dir, path } = tempSession("old title", [{ type: "text", text: "latest work" }]);
	const state = await readState(path);
	const leafBefore = state.leafId;
	const idsBefore = new Set(state.ids);
	assert.equal(await applyRename(state, "new title from latest work", 1_700_000_000_000), true);
	const lines = readFileSync(path, "utf8").trim().split("\n");
	const info = JSON.parse(lines.at(-2));
	const record = JSON.parse(lines.at(-1));
	assert.equal(info.type, "session_info");
	assert.equal(info.name, "new title from latest work");
	assert.equal(info.parentId, leafBefore);
	assert.equal(record.customType, "auto-session-name");
	assert.deepEqual(record.data, { kind: "renamed", title: "new title from latest work", at: 1_700_000_000_000 });
	assert.equal(record.parentId, info.id);
	for (const id of [info.id, record.id]) assert.ok(!idsBefore.has(id), "ids fresh");
	const reopened = SessionManager.open(path);
	assert.equal(reopened.getSessionName(), "new title from latest work");
	assert.equal(reopened.getEntries().at(-1).id, record.id, "the record is the new leaf");

	const raced = tempSession("raced", [{ type: "text", text: "topic" }]);
	const stale = await readState(raced.path);
	appendFileSync(raced.path, sessionLine({ type: "message", message: { role: "user", content: [{ type: "text", text: "written after our snapshot" }] } }) + "\n");
	assert.equal(await applyRename(stale, "too late"), false, "a moved leaf is left untouched");
	assert.ok(!readFileSync(raced.path, "utf8").includes("too late"), "nothing was appended");
	rmSync(dir, { recursive: true, force: true });
	rmSync(raced.dir, { recursive: true, force: true });
});

test("confirmView maps keys to yes, no, and stop", () => {
	const seen = [];
	const theme = { fg: (_n, t) => t };
	const view = confirmView(null, theme, "Rename?", "old → new", (value) => seen.push(value));
	assert.ok(view.render(80).some((l) => l.includes("Rename?")));
	view.handleInput("y");
	view.handleInput("n");
	view.handleInput("\x1b");
	view.handleInput("q");
	assert.deepEqual(seen, [true, false, undefined], "unmapped keys do nothing");
});

function harness(sessionsDir, answers, modelReply) {
	const pi = { entries: [], registerCommand() {}, appendEntry(type, data) { this.entries.push({ type, data }); } };
	const ctx = {
		mode: "tui", model: { provider: "test", id: "test" },
		sessionManager: { getSessionId: () => "self" },
		modelRegistry: { streamSimple: async (_model, _req, opts) => {
			if (modelReply === "throw") throw Error("offline");
			await new Promise((resolve) => setTimeout(resolve, 0));
			if (opts?.signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
			return { result: async () => ({ stopReason: "stop", provider: "test", model: "test", usage: { total: 1 }, content: [{ type: "text", text: modelReply }] }) };
		} },
		ui: {
			notify: () => {}, setWorkingMessage: () => {},
			custom: async (factory) => {
				const theme = { fg: (_n, t) => t };
				const view = factory(null, theme, null, () => {});
				const answer = answers.shift();
				if (answer !== undefined) view.handleInput(answer === true ? "y" : answer === false ? "n" : "\x1b");
				return answer;
			},
		},
	};
	return { pi, ctx };
}

test("calibrate confirms each rename interactively and stops spending on esc", async () => {
	const dir = mkdtempSync(join(tmpdir(), "name-cal-flow-"));
	tempSession("old one", [{ type: "text", text: "fresh topic" }], dir);
	const answers = [true, undefined];
	const { pi, ctx } = harness(dir, answers, "A New Title For It");
	await calibrate(ctx, pi, dir, false);
	assert.equal(pi.entries.filter((e) => e.type === "auto-session-name-usage").length, 1, "esc stops further derivations");
	rmSync(dir, { recursive: true, force: true });
});

test("calibrate all applies without prompts; KEEP and failures are counted, not renamed", async () => {
	const dir = mkdtempSync(join(tmpdir(), "name-cal-all-"));
	tempSession("already fine", [{ type: "text", text: "same topic" }], dir);
	const { pi, ctx } = harness(dir, [true], "KEEP");
	await calibrate(ctx, pi, dir, true);
	assert.equal(pi.entries.length, 1);
	rmSync(dir, { recursive: true, force: true });

	const fail = mkdtempSync(join(tmpdir(), "name-cal-fail-"));
	tempSession("offline session", [{ type: "text", text: "topic" }], fail);
	const h2 = harness(fail, [true], "throw");
	await calibrate(h2.ctx, h2.pi, fail, true);
	assert.equal(h2.pi.entries.length, 0, "no receipt for a failed call");
	rmSync(fail, { recursive: true, force: true });
});

test("the command registers and reports nothing to do for an empty sessions dir", async () => {
	const commands = new Map();
	const pi = { registerCommand: (n, c) => commands.set(n, c), appendEntry: () => {} };
	const dir = mkdtempSync(join(tmpdir(), "name-cal-none-"));
	extension(pi, dir);
	assert.ok(commands.has("name-calibrate"));
	const notices = [];
	const ctx = {
		mode: "tui", model: { provider: "test", id: "test" },
		sessionManager: { getSessionId: () => "self" },
		modelRegistry: { streamSimple: async () => { throw Error("must not be called"); } },
		ui: { notify: (...a) => notices.push(a), setWorkingMessage: () => {}, custom: async () => false },
	};
	await commands.get("name-calibrate").handler("", ctx);
	assert.equal(notices.length, 1);
	assert.match(notices[0][0], /No calibratable sessions/);
	rmSync(dir, { recursive: true, force: true });
});
