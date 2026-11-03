/**
 * Worktree status: show the task worktree the agent works in, and its PR, in the footer.
 *
 * pi's footer names the branch of pi's own cwd, which stays the main checkout while the agent edits
 * a task worktree at `<repo>/.agents/worktrees/<name>`. This extension takes the last such worktree a
 * tool call names (any string in the input: read/edit/write paths, `cd` or `git -C` in a shell
 * command) and shows `⎇ <name> · PR #N`, with the state when the PR is not open. A relative path
 * resolves against pi's cwd, and only a path that has a `.git` entry counts. Strings are split at
 * whitespace and the characters in `SEPARATOR`, so a repository path that contains one of them (a
 * space, `=`, `,`, a parenthesis) is not recognized.
 *
 * The PR comes from `gh pr view` run inside the worktree, so gh finds it from the branch's tracking
 * configuration (forks included). It runs in the background, at most once a minute per branch unless
 * the branch changes; any failure shows no PR. A reused branch name can still match an older PR.
 * At each settle the worktree is checked again, and a removed one clears the status.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const statusKey = "worktree";
const PR_TTL_MS = 60_000;
const MARK = ".agents/worktrees/";
const SEPARATOR = /[\s;&|()<>"'`=,]+/;

const isWorktree = (path: string): boolean => existsSync(join(path, ".git"));

/** The worktree root a path token points into, as an absolute path. */
function worktreeRoot(token: string, cwd: string, home: string): string | undefined {
	const at = token.startsWith(MARK) ? 0 : token.indexOf(`/${MARK}`) + 1;
	if (at === 0 && !token.startsWith(MARK)) return undefined;
	const name = token.slice(at + MARK.length).split("/", 1)[0];
	if (!name || name === "." || name === "..") return undefined;
	const base = token.slice(0, at);
	return resolve(cwd, base.startsWith("~/") ? home + base.slice(1) : base, MARK, name);
}

/** The last existing task worktree that any string in a tool input names. */
export function worktreeIn(input: unknown, cwd: string, home = homedir(), exists = isWorktree): string | undefined {
	let found: string | undefined;
	const visit = (value: unknown): void => {
		if (typeof value === "string") {
			// Skip large strings such as file bodies without splitting them.
			if (!value.includes(MARK)) return;
			for (const token of value.split(SEPARATOR)) {
				const root = worktreeRoot(token, cwd, home);
				if (root && exists(root)) found = root;
			}
		} else if (value && typeof value === "object") {
			for (const item of Object.values(value)) visit(item);
		}
	};
	visit(input);
	return found;
}

/** `PR #N`, plus the state when it is not open, from `gh pr view --json number,state`. */
export function prLabel(stdout: string): string {
	try {
		const pr = JSON.parse(stdout) as { number?: unknown; state?: unknown };
		if (!Number.isSafeInteger(pr.number)) return "";
		const state = typeof pr.state === "string" && pr.state !== "OPEN" ? ` ${pr.state.toLowerCase()}` : "";
		return `PR #${pr.number}${state}`;
	} catch {
		return "";
	}
}

export default function worktreeStatus(pi: ExtensionAPI): void {
	let ctx: ExtensionContext | undefined;
	let path: string | undefined;
	let branch = "";
	let pr = "";
	let checkedAt = 0;
	// One refresh runs at a time, so replies cannot arrive out of order; a request made meanwhile is
	// folded into one follow-up. Selecting another worktree aborts the git or gh in flight.
	let running = false;
	let queued: { force: boolean } | undefined;
	let abort = new AbortController();

	const show = (): void => {
		try {
			const text = path ? [`⎇ ${basename(path)}`, pr].filter(Boolean).join(" · ") : undefined;
			ctx?.ui.setStatus(statusKey, text && ctx.ui.theme.fg("muted", text));
		} catch {
			// A ctx from a replaced session throws; the next session_start replaces it.
		}
	};

	const select = (next: string | undefined): void => {
		abort.abort();
		abort = new AbortController();
		path = next;
		branch = "";
		pr = "";
		show();
	};

	const refreshOnce = async (force: boolean): Promise<void> => {
		const target = path;
		const { signal } = abort;
		if (!target) return;
		if (!isWorktree(target)) {
			select(undefined);
			return;
		}
		const head = await pi.exec("git", ["-C", target, "branch", "--show-current"], { timeout: 5_000, signal });
		if (signal.aborted) return;
		const next = head.code === 0 ? head.stdout.trim() : "";
		if (next !== branch) {
			branch = next;
			pr = "";
			force = true;
		}
		show();
		if (!branch || (!force && Date.now() - checkedAt < PR_TTL_MS)) return;
		checkedAt = Date.now();
		const view = await pi.exec("gh", ["pr", "view", "--json", "number,state"], { cwd: target, timeout: 15_000, signal });
		if (signal.aborted) return;
		pr = view.code === 0 ? prLabel(view.stdout) : "";
		show();
	};

	const refresh = async (force: boolean): Promise<void> => {
		queued = { force: force || Boolean(queued?.force) };
		if (running) return;
		running = true;
		try {
			for (let next = queued; next; next = queued) {
				queued = undefined;
				await refreshOnce(next.force).catch(() => {});
			}
		} finally {
			running = false;
		}
	};

	pi.on("session_start", (_event, startCtx) => {
		ctx = startCtx.mode === "tui" ? startCtx : undefined;
		select(undefined);
	});

	pi.on("tool_call", (event) => {
		if (!ctx) return;
		let found: string | undefined;
		try {
			found = worktreeIn(event.input, ctx.cwd);
		} catch {
			return;
		}
		if (!found || found === path) return;
		select(found);
		void refresh(true);
	});

	pi.on("agent_settled", () => {
		if (ctx) void refresh(false);
	});

	pi.on("session_shutdown", () => {
		select(undefined);
		ctx = undefined;
	});
}
