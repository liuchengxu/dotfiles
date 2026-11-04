import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { setImmediate as tick } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const tuiPath = join(root, "node_modules/@earendil-works/pi-tui/dist/index.js");
const jiti = createJiti(import.meta.url, { alias: { "@earendil-works/pi-tui": tuiPath } });
const { default: extension, worktreeIn, prLabel, worktreePath } = await jiti.import(new URL("../extensions/worktree-status.ts", import.meta.url).pathname);
const { rgbColor } = await import(pathToFileURL(tuiPath));

/** A repo folder with task worktrees whose `.git` files mark them as worktrees. */
function repo(t, ...names) {
	const dir = realpathSync(mkdtempSync(join(tmpdir(), "worktree-status-")));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	for (const name of names) {
		mkdirSync(join(dir, ".agents/worktrees", name), { recursive: true });
		writeFileSync(join(dir, ".agents/worktrees", name, ".git"), "gitdir: elsewhere\n");
	}
	return dir;
}

/**
 * A loaded extension whose git and gh replies the test sets, keyed by worktree name. A reply is
 * computed when its command starts. With `hold`, each git or gh call named there waits until the test
 * releases it, so replies can arrive out of order; an abort ends a held call as pi.exec does.
 */
function session(t, cwd, { mode = "tui", branches = {}, prs = {}, hold = [], appearance = "dark" } = {}) {
	let now = 0;
	t.mock.method(Date, "now", () => now);
	const handlers = new Map();
	const statuses = [];
	const calls = [];
	const held = [];
	let inFlight = 0;
	let maxInFlight = 0;
	const reply = (command, name) => {
		if (command === "git") return branches[name] ? { code: 0, stdout: `${branches[name]}\n`, stderr: "" } : { code: 128, stdout: "", stderr: "" };
		return prs[name] ? { code: 0, stdout: JSON.stringify(prs[name]), stderr: "" } : { code: 1, stdout: "", stderr: "no pull requests found" };
	};
	const pi = {
		on(event, handler) { handlers.set(event, handler); },
		async exec(command, args, options) {
			calls.push({ command, args, cwd: options?.cwd });
			const name = basename(command === "git" ? args[1] : options.cwd);
			const result = reply(command, name);
			if (!hold.includes(command)) return result;
			inFlight += 1;
			maxInFlight = Math.max(maxInFlight, inFlight);
			try {
				return await new Promise((resolve) => {
					const killed = () => resolve({ code: 1, stdout: "", stderr: "", killed: true });
					if (options.signal?.aborted) return killed();
					options.signal?.addEventListener("abort", killed, { once: true });
					held.push({ command, name, signal: options.signal, release: () => resolve(result) });
				});
			} finally {
				inFlight -= 1;
			}
		},
	};
	extension(pi);
	const styles = [];
	const theme = { appearance, fg: (_color, text) => text, style: (text, style) => { styles.push(style); return text; } };
	const ctx = { mode, cwd, ui: { setStatus(key, text) { statuses.push([key, text]); }, theme } };
	const flush = async () => { for (let i = 0; i < 8; i++) await tick(); };
	const emit = async (event, payload = {}) => { handlers.get(event)?.(payload, ctx); await flush(); };
	return {
		calls,
		held,
		styles,
		flush,
		maxInFlight: () => maxInFlight,
		release: async (index) => { held[index].release(); await flush(); },
		gh: () => calls.filter(({ command }) => command === "gh"),
		advance(ms) { now += ms; },
		status: () => statuses.findLast(([key]) => key === "worktree")?.[1],
		start: () => emit("session_start"),
		touch: (input) => emit("tool_call", { type: "tool_call", toolName: "bash", toolCallId: "c", input }),
		settle: () => emit("agent_settled", { aborted: false }),
		shutdown: () => emit("session_shutdown"),
	};
}

test("a tool input names a worktree by absolute, home, or relative path", (t) => {
	const dir = repo(t, "a", "b");
	const exists = () => true;
	assert.equal(worktreeIn({ path: "/r/.agents/worktrees/fix-a/src/x.rs" }, "/cwd", "/h", exists), "/r/.agents/worktrees/fix-a");
	assert.equal(worktreeIn({ command: "cd ~/.dotfiles/.agents/worktrees/b && ls" }, "/cwd", "/h", exists), "/h/.dotfiles/.agents/worktrees/b");
	assert.equal(worktreeIn({ command: "git -C .agents/worktrees/c status" }, "/cwd", "/h", exists), "/cwd/.agents/worktrees/c");
	assert.equal(worktreeIn({ command: "ls ../repo/.agents/worktrees/d" }, "/w/cwd", "/h", exists), "/w/repo/.agents/worktrees/d", "relative to cwd, not to the first slash");
	assert.equal(worktreeIn({ command: "cargo build --manifest-path=.agents/worktrees/fix+one/Cargo.toml" }, "/cwd", "/h", exists), "/cwd/.agents/worktrees/fix+one");
	assert.equal(worktreeIn({ command: "ls .agents/worktrees/" }, "/cwd", "/h", exists), undefined);
	assert.equal(worktreeIn({ command: `cat ${dir}/.agents/worktrees/a/x ${dir}/.agents/worktrees/missing/y` }, "/cwd"), `${dir}/.agents/worktrees/a`,
		"a missing last match does not hide an earlier worktree");
	assert.equal(worktreeIn({ edits: [{ path: `${dir}/.agents/worktrees/b/z` }] }, "/cwd"), `${dir}/.agents/worktrees/b`, "nested input strings count");
	assert.equal(worktreeIn({ command: `cat ${dir}/.agents/worktrees/a/x ${dir}/.agents/worktrees/b/y` }, "/cwd"), `${dir}/.agents/worktrees/b`, "the last worktree named wins");
});

test("the PR label names a state only when the PR is not open", () => {
	assert.equal(prLabel('{"number":880,"state":"OPEN"}'), "PR #880");
	assert.equal(prLabel('{"number":880,"state":"MERGED"}'), "PR #880 merged");
	assert.equal(prLabel("not json"), "");
});

test("the footer shows the touched worktree and its PR, and follows a switch", async (t) => {
	const dir = repo(t, "fix-a", "fix-b");
	const s = session(t, dir, { branches: { "fix-a": "fix-a", "fix-b": "fix-b" }, prs: { "fix-a": { number: 12, state: "OPEN" } } });
	await s.start();
	await s.touch({ command: `cargo test --manifest-path ${dir}/.agents/worktrees/fix-a/Cargo.toml` });
	assert.equal(s.status(), "⎇ fix-a · PR #12");
	assert.deepEqual(s.gh()[0], { command: "gh", args: ["pr", "view", "--json", "number,state"], cwd: join(dir, ".agents/worktrees/fix-a") },
		"gh finds the PR from inside the worktree, without a branch selector");
	await s.touch({ path: join(dir, ".agents/worktrees/fix-b/README.md") });
	assert.equal(s.status(), "⎇ fix-b", "a branch with no PR shows the worktree alone");
});

test("gh runs at most once a minute per branch, and a removed worktree clears the status", async (t) => {
	const dir = repo(t, "fix-a");
	const prs = { "fix-a": { number: 12, state: "OPEN" } };
	const s = session(t, dir, { branches: { "fix-a": "fix-a" }, prs });
	await s.start();
	await s.touch({ command: "git -C .agents/worktrees/fix-a status" });
	prs["fix-a"] = { number: 12, state: "MERGED" };
	s.advance(59_000);
	await s.settle();
	assert.equal(s.gh().length, 1);
	assert.equal(s.status(), "⎇ fix-a · PR #12");
	s.advance(2_000);
	await s.settle();
	assert.equal(s.gh().length, 2, "after a minute a settle looks again");
	assert.equal(s.status(), "⎇ fix-a · PR #12 merged");
	rmSync(join(dir, ".agents/worktrees/fix-a"), { recursive: true });
	await s.settle();
	assert.equal(s.status(), undefined);
});

test("touching the selected worktree again starts no lookup", async (t) => {
	const dir = repo(t, "fix-a");
	const s = session(t, dir, { branches: { "fix-a": "fix-a" }, prs: { "fix-a": { number: 12, state: "OPEN" } } });
	await s.start();
	await s.touch({ command: "git -C .agents/worktrees/fix-a status" });
	await s.touch({ command: "git -C .agents/worktrees/fix-a diff" });
	assert.equal(s.gh().length, 1);
});

test("one lookup runs at a time, so a branch reply cannot arrive out of order", async (t) => {
	const dir = repo(t, "wt");
	const branches = { wt: "old" };
	const s = session(t, dir, { branches, prs: { wt: { number: 1, state: "OPEN" } }, hold: ["git"] });
	await s.start();
	// The tool call's lookup starts before its `git checkout new` runs; the settle comes after.
	await s.touch({ command: "git -C .agents/worktrees/wt checkout new" });
	branches.wt = "new";
	await s.settle();
	assert.equal(s.held.length, 1, "the settle waits for the lookup in flight");
	await s.release(0);
	await s.release(1);
	assert.equal(s.maxInFlight(), 1);
	assert.equal(s.gh().length, 2, "the branch change forces a fresh PR lookup");
	assert.equal(s.status(), "⎇ wt · PR #1");
});

test("switching worktrees aborts the lookup in flight", async (t) => {
	const dir = repo(t, "fix-a", "fix-b");
	const prs = { "fix-a": { number: 1, state: "OPEN" }, "fix-b": { number: 2, state: "OPEN" } };
	const s = session(t, dir, { branches: { "fix-a": "fix-a", "fix-b": "fix-b" }, prs, hold: ["gh"] });
	const a = { command: "git -C .agents/worktrees/fix-a status" };
	await s.start();
	await s.touch(a);
	await s.touch({ command: "git -C .agents/worktrees/fix-b status" });
	assert.equal(s.status(), "⎇ fix-b", "the new name shows at once");
	await s.touch(a);
	assert.deepEqual(s.held.map(({ name, signal }) => [name, signal.aborted]), [["fix-a", true], ["fix-b", true], ["fix-a", false]]);
	await s.release(2);
	assert.equal(s.status(), "⎇ fix-a · PR #1");
});

test("a settle does not cancel a PR lookup in flight", async (t) => {
	const dir = repo(t, "fix-a");
	const s = session(t, dir, { branches: { "fix-a": "fix-a" }, prs: { "fix-a": { number: 12, state: "OPEN" } }, hold: ["gh"] });
	await s.start();
	await s.touch({ command: "git -C .agents/worktrees/fix-a status" });
	await s.settle();
	await s.release(0);
	assert.equal(s.status(), "⎇ fix-a · PR #12");
	assert.equal(s.gh().length, 1, "the folded settle refresh is inside the minute");
});

test("a session shutdown clears the status and aborts the lookup in flight", async (t) => {
	const dir = repo(t, "fix-a");
	const s = session(t, dir, { branches: { "fix-a": "fix-a" }, prs: { "fix-a": { number: 12, state: "OPEN" } }, hold: ["gh"] });
	await s.start();
	await s.touch({ command: "git -C .agents/worktrees/fix-a status" });
	assert.equal(s.status(), "⎇ fix-a");
	await s.shutdown();
	assert.equal(s.status(), undefined);
	assert.equal(s.held[0].signal.aborted, true);
});

test("a path that is not a worktree, and non-TUI modes, show nothing", async (t) => {
	const dir = repo(t);
	const s = session(t, dir);
	await s.start();
	await s.touch({ command: "ls .agents/worktrees/missing" });
	assert.equal(s.calls.length, 0);
	const print = session(t, repo(t, "fix-a"), { mode: "print", branches: { "fix-a": "fix-a" } });
	await print.start();
	await print.touch({ command: "git -C .agents/worktrees/fix-a status" });
	assert.equal(print.calls.length, 0);
	assert.equal(print.status(), undefined);
});

test("the worktree name is drawn in green for the theme's appearance", async (t) => {
	for (const [appearance, color] of [["dark", rgbColor(74, 222, 128)], ["light", rgbColor(21, 128, 61)]]) {
		const dir = repo(t, "fix-a");
		const s = session(t, dir, { branches: { "fix-a": "fix-a" }, appearance });
		await s.start();
		await s.touch({ command: "git -C .agents/worktrees/fix-a status" });
		assert.deepEqual(s.styles.at(-1), { fg: color }, appearance);
	}
});

test("a path shows relative to the footer's worktree, tagged in another one, and unchanged elsewhere", async (t) => {
	const dir = repo(t, "fix-a", "fix-b");
	const s = session(t, dir, { branches: { "fix-a": "fix-a" } });
	await s.start();
	const a = join(dir, ".agents/worktrees/fix-a");
	assert.equal(worktreePath(`${a}/src/x.rs`), `⎇ fix-a/src/x.rs`, "no worktree selected yet");
	await s.touch({ command: "git -C .agents/worktrees/fix-a status" });
	assert.equal(worktreePath(`${a}/src/x.rs`), "src/x.rs");
	assert.equal(worktreePath(`${a}/../fix-a/src/x.rs`), "src/x.rs", "normalized first");
	assert.equal(worktreePath(join(dir, ".agents/worktrees/fix-b/y.rs")), "⎇ fix-b/y.rs");
	assert.equal(worktreePath(a), a, "the worktree root itself stays whole");
	assert.equal(worktreePath("src/x.rs"), "src/x.rs", "a relative path is already short");
	assert.equal(worktreePath("/etc/hosts"), "/etc/hosts");
	assert.equal(worktreePath("~/.dotfiles/.agents/worktrees/w/z", "/h"), "⎇ w/z");
	assert.equal(worktreePath(`~${a.slice(dirname(dir).length)}/src/x.rs`, dirname(dir)), "src/x.rs", "~ expands to the given home");
	await s.shutdown();
	assert.equal(worktreePath(`${a}/src/x.rs`), `⎇ fix-a/src/x.rs`, "a shutdown clears the shared worktree");
});
