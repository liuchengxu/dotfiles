/**
 * Worktree status: show the task worktree the agent works in, and its PR, in the footer.
 *
 * pi's footer names the branch of pi's own cwd, which stays the main checkout while the agent edits
 * a task worktree at `<repo>/.agents/worktrees/<name>`. This extension takes the last such worktree a
 * tool call names (any string in the input: read/edit/write paths, `cd` or `git -C` in a shell
 * command) and shows `⎇ <name> [+N -M] · PR #N`, with the state when the PR is not open. The
 * bracket counts uncommitted line changes against HEAD and refresh after each edit
 * and at each settle; it is
 * hidden when nothing changed. A relative path
 * resolves against pi's cwd, and only a path that has a `.git` entry counts. Strings are split at
 * whitespace and the characters in `SEPARATOR`, so a repository path that contains one of them (a
 * space, `=`, `,`, a parenthesis) is not recognized.
 *
 * The PR comes from `gh pr view` run inside the worktree, so gh finds it from the branch's tracking
 * configuration (forks included). It runs in the background, at most once a minute per branch unless
 * the branch changes; any failure shows no PR. A reused branch name can still match an older PR.
 * At each settle the worktree is checked again, and a removed one clears the status.
 *
 * `worktreePath` lets tool rows show paths relative to the worktree the footer names.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { rgbColor } from "@earendil-works/pi-tui";

const statusKey = "worktree";
const PR_TTL_MS = 60_000;
const MARK = ".agents/worktrees/";
const SEPARATOR = /[\s;&|()<>"'`=,]+/;
// Shared through globalThis, as session-uptime does: another extension's import of this file may
// load a second module instance.
const currentKey = Symbol.for("pi.worktree-status.current");
type Shared = { [currentKey]?: string };

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

/**
 * A path as tool rows show it: relative to the worktree the footer names, or with its worktree
 * name in front when it is in another one. A path outside any worktree is returned as given.
 */
export function worktreePath(path: string, home = homedir()): string {
	const expanded = path.startsWith("~/") ? home + path.slice(1) : path;
	if (!expanded.startsWith("/")) return path;
	const absolute = resolve(expanded);
	const at = absolute.indexOf(`/${MARK}`);
	if (at < 0) return path;
	const start = at + 1 + MARK.length;
	const slash = absolute.indexOf("/", start);
	if (slash < 0 || slash === absolute.length - 1) return path;
	const inside = absolute.slice(slash + 1);
	return absolute.slice(0, slash) === (globalThis as Shared)[currentKey] ? inside : `⎇ ${absolute.slice(start)}`;
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

/** Line counts from `git diff --shortstat HEAD`: `[+N -M]` when anything changed. */
export function diffCounts(stdout: string): { added: number; removed: number } {
	const added = Number(/(\d+) insertions?\(\+\)/.exec(stdout)?.[1] ?? 0);
	const removed = Number(/(\d+) deletions?\(-\)/.exec(stdout)?.[1] ?? 0);
	return { added, removed };
}

/** `[+N -M]` from `git diff --shortstat HEAD`, or "" when nothing changed. */
export function diffLabel(stdout: string): string {
	const { added, removed } = diffCounts(stdout);
	return added || removed ? `[+${added} -${removed}]` : "";
}

export default function worktreeStatus(pi: ExtensionAPI): void {
	let ctx: ExtensionContext | undefined;
	let path: string | undefined;
	let branch = "";
	let pr = "";
	let stats: { added: number; removed: number } = { added: 0, removed: 0 };
	let checkedAt = 0;
	// One refresh runs at a time, so replies cannot arrive out of order; a request made meanwhile is
	// folded into one follow-up. Selecting another worktree aborts the git or gh in flight.
	let running = false;
	let queued: { force: boolean } | undefined;
	let abort = new AbortController();

	const show = (): void => {
		try {
			if (!ctx) return;
			const theme = ctx.ui.theme;
			// Green, as git prompts draw a branch, so it stands apart from the model and session colors.
			const name = path && theme.style(`⎇ ${basename(path)}`, { fg: theme.appearance === "light" ? rgbColor(21, 128, 61) : rgbColor(74, 222, 128) });
			// The counts read as git draws them: additions green, deletions red.
			const diff = stats.added || stats.removed
				? theme.fg("muted", " [")
					+ theme.style(`+${stats.added}`, { fg: theme.appearance === "light" ? rgbColor(21, 128, 61) : rgbColor(74, 222, 128) })
					+ theme.fg("muted", " ")
					+ theme.style(`-${stats.removed}`, { fg: theme.appearance === "light" ? rgbColor(185, 28, 28) : rgbColor(248, 113, 113) })
					+ theme.fg("muted", "]")
				: "";
			ctx.ui.setStatus(statusKey, name ? `${name}${diff}${pr ? theme.fg("muted", ` · ${pr}`) : ""}` : undefined);
		} catch {
			// A ctx from a replaced session throws; the next session_start replaces it.
		}
	};

	const select = (next: string | undefined): void => {
		abort.abort();
		abort = new AbortController();
		path = next;
		(globalThis as Shared)[currentKey] = next;
		branch = "";
		pr = "";
		stats = { added: 0, removed: 0 };
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
		const diff = await pi.exec("git", ["-C", target, "diff", "--shortstat", "HEAD"], { timeout: 5_000, signal });
		if (signal.aborted) return;
		stats = diff.code === 0 ? diffCounts(diff.stdout) : { added: 0, removed: 0 };
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

	// The counts follow each edit as it lands, not only when the turn settles;
	// the queue coalesces bursts from codemode's nested edits into one git call.
	pi.on("tool_result", (event) => {
		if (ctx && (event.toolName === "edit" || event.toolName === "write")) void refresh(false);
	});

	pi.on("session_shutdown", () => {
		select(undefined);
		ctx = undefined;
	});
}
