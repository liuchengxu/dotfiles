/**
 * Todo gate: enforce that a multi-step request gets a todo list.
 *
 * Trigger: a user prompt with two or more top-level bullet or numbered
 * lines, or /todo-required. Budget: three tool calls (other than `todo`)
 * before the gate nudges. Nudge: a note appended to the tool result that
 * exhausted the budget, and to every later one, until the model calls the
 * todo tool. Never blocks a call — a blocked investigation is worse than a
 * missing list.
 *
 * The todo tool's own state is not reachable from an extension, so the gate
 * tracks todo calls as its proxy: a successful create/list/get/update means
 * a list exists; a successful clear means it does not. The tool's result
 * text also carries each task's status, so the gate keeps the statuses from
 * them: the moment every task is completed, it appends an instruction to
 * that same result telling the model to call `todo clear` — an all-completed
 * list left standing is stale, and the next session sees a full board of
 * finished work. Cleanup runs in every mode: it is bookkeeping, not gating.
 *
 * Settle audit: each todo result's `details.tasks` is the whole board. The
 * gate records what happened after the last todo mutation — tool work, the
 * last check command and whether it passed, and user messages that arrived
 * mid-run — and at `agent_before_settle` asks for one continuation when the
 * board no longer matches: a passed check with a task still in_progress, a
 * failed check without a recorded blocker, work with no task in_progress,
 * more than one in_progress task, or a mid-run scope change. It never edits
 * the list itself, so an exit code cannot complete a task. One continuation
 * per user input is the loop guard; any error fails open. Limits: a check is
 * recognized by its command name, so `echo cargo test` or `pytest || true`
 * counts as a passed check; only the last check counts; and a check moved to
 * the background reports no result here.
 *
 * Commands: /todo-skip (never gate), /todo-required (always gate),
 * /todo-auto (bullet heuristic, the default).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Mode = "auto" | "required" | "skipped";

const BUDGET = 3;
const NUDGE = [
	"TODO GATE: this request looks multi-step and no todo list exists.",
	"Call the todo tool now (action: create, one task per step) before continuing.",
	"If this task is genuinely trivial, the user can run /todo-skip.",
].join(" ");

const CLEAR_NUDGE = [
	"TODO GATE: every task on the list is now completed.",
	"Call the todo tool with {\"action\":\"clear\"} now — an all-completed list is stale bookkeeping —",
	"then deliver the final report.",
].join(" ");

/** A `[status] #id subject` line of a todo `list` result. */
const LIST_LINE = /^\[(pending|in_progress|completed|deleted)\] #(\d+) /;

/** The statuses of every task, as the todo results report them. */
function statusesFromList(text: string): Map<number, string> | undefined {
	const statuses = new Map<number, string>();
	for (const line of text.split("\n")) {
		const match = LIST_LINE.exec(line.trim());
		if (match) statuses.set(Number(match[2]), match[1]);
	}
	return statuses.size > 0 ? statuses : undefined;
}

function everyTaskCompleted(statuses: ReadonlyMap<number, string>): boolean {
	return statuses.size > 0 && [...statuses.values()].every((status) => status === "completed");
}

/** A bash command that verifies work: tests, lints, type and build checks. */
const CHECK = /(?:^|[\s;&|(])(?:cargo\s+(?:test|nextest|clippy|check|build)|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|check|lint|build|typecheck)|node\s+--test|pytest|go\s+(?:test|vet|build)|make\s+(?:test|check|lint)|tsc|vitest|jest|ruff|mypy|forge\s+test|\S*check\S*\.(?:sh|py))(?=$|[\s;&|)])/;

interface Task {
	id: number;
	status: string;
}

/** The board from a todo result's `details`, or undefined when absent. */
function boardFrom(details: unknown): Task[] | undefined {
	const tasks = (details as { tasks?: unknown } | null | undefined)?.tasks;
	if (!Array.isArray(tasks)) return undefined;
	return tasks.filter((task): task is Task => typeof task?.id === "number" && typeof task?.status === "string");
}

/** The board as the todo package replays it: its `rpiv-todo-state` entries
 * win over tool results, because a todo call made through codemode never
 * lands as a standalone tool result. Mirrors rpiv-todo `state/replay.ts`. */
export function replayBoard(branch: readonly unknown[]): Task[] {
	let fromEntries: Task[] | undefined;
	let fromResults: Task[] | undefined;
	for (const entry of branch) {
		const e = entry as { type?: string; customType?: string; data?: unknown; message?: { role?: string; toolName?: string; details?: unknown } };
		if (e.type === "custom" && e.customType === "rpiv-todo-state") fromEntries = boardFrom(e.data) ?? fromEntries;
		if (e.type === "message" && e.message?.role === "toolResult" && e.message.toolName === "todo") {
			fromResults = boardFrom(e.message.details) ?? fromResults;
		}
	}
	return fromEntries ?? fromResults ?? [];
}

/** What happened after the last todo mutation. */
interface SinceUpdate {
	work: boolean;
	check?: { passed: boolean; label: string };
	steered: boolean;
}

/** Why the board is stale, or empty when it matches the recorded events. */
export function staleReasons(board: readonly Task[], since: SinceUpdate): string[] {
	const ids = (status: string) => board.filter((task) => task.status === status).map((task) => `#${task.id}`);
	const running = ids("in_progress");
	if (running.length === 0 && ids("pending").length === 0) return [];
	const reasons: string[] = [];
	if (running.length > 1) reasons.push(`${running.join(", ")} are all in_progress; keep exactly one.`);
	if (since.check?.passed && running.length > 0) {
		reasons.push(`"${since.check.label}" passed after the last todo update, but ${running.join(", ")} is still in_progress. Mark it completed if that check verifies it; otherwise update it with what remains.`);
	}
	if (since.check && !since.check.passed) {
		reasons.push(`"${since.check.label}" failed after the last todo update. Keep the task in_progress and record the blocker in its description; do not mark it completed.`);
	}
	if (since.work && running.length === 0) reasons.push("Work ran after the last todo update, but no task is in_progress.");
	if (since.steered) reasons.push("The user sent a message during the run. Update task subjects, descriptions, or dependencies if the scope changed.");
	return reasons;
}

/** A top-level list line: a bullet or number at the start of a line. */
function isTopLevelListItem(line: string): boolean {
	return /^(?:[-*+]|\d+[.)])\s+\S/.test(line);
}

export default function todoGate(pi: ExtensionAPI) {
	let mode: Mode = "auto";
	let todoRequired = false;
	let budget = BUDGET;
	let todoExists = false;
	/** Task statuses as the todo results report them, for cleanup. */
	let statuses = new Map<number, string>();
	/** Whether a clear was already demanded for the current board, so one
	 * all-completed update cannot be nagged twice. */
	let clearDemanded = false;
	let board: Task[] = [];
	let since: SinceUpdate = { work: false, steered: false };
	/** Set once the settle audit continued the run for this user input. */
	let audited = false;

	// Replay the board on resume and branch navigation, so the audit sees the
	// board the todo tool shows before the next todo call.
	const replay = (ctx: { sessionManager: { getBranch(): unknown[] } }) => {
		since = { work: false, steered: false };
		audited = false;
		try {
			board = replayBoard(ctx.sessionManager.getBranch());
		} catch {
			board = [];
		}
	};
	pi.on("session_start", (_event, ctx) => replay(ctx));
	pi.on("session_tree", (_event, ctx) => replay(ctx));

	pi.on("input", (event) => {
		// Queued follow-ups continue the run without before_agent_start, so
		// any user input re-arms the audit. Only the user can re-arm it.
		audited = false;
		if (event.streamingBehavior) since.steered = true;
	});

	pi.on("agent_before_settle", (event) => {
		try {
			// Not gated on event.context.canContinue: it previews the context
			// before this entry, and after a final answer it is false. Pi
			// checks continuation again after committing it.
			if (audited || mode === "skipped" || event?.outcome !== "completed") return;
			const reasons = staleReasons(board, since);
			if (reasons.length === 0) return;
			audited = true;
			return {
				// Pi replaces the proposed entries with each handler's result.
				entries: [...(event.entries ?? []), {
					type: "custom_message",
					customType: "todo-gate",
					display: true,
					content: ["TODO GATE: the todo list may be stale. Reconcile it with the todo tool, then give the final response.", ...reasons.map((reason) => `- ${reason}`)].join("\n"),
				}],
				continue: true,
			};
		} catch {
			return;
		}
	});

	pi.registerCommand("todo-skip", {
		description: "Never enforce the todo list for this session",
		handler: async (_args, ctx) => {
			mode = "skipped";
			ctx.ui.notify("Todo gate: skipped for this session", "info");
		},
	});
	pi.registerCommand("todo-required", {
		description: "Always enforce the todo list for this session",
		handler: async (_args, ctx) => {
			mode = "required";
			ctx.ui.notify("Todo gate: enforced on every prompt", "info");
		},
	});
	pi.registerCommand("todo-auto", {
		description: "Enforce the todo list by the bullet heuristic (default)",
		handler: async (_args, ctx) => {
			mode = "auto";
			ctx.ui.notify("Todo gate: back to the bullet heuristic", "info");
		},
	});

	pi.on("before_agent_start", (event) => {
		// One run per user prompt: reset the per-prompt state here.
		if (event.messageType === "user") audited = false;
		budget = BUDGET;
		const bullets = event.prompt
			.split("\n")
			.filter(isTopLevelListItem).length;
		todoRequired = mode === "required" || (mode === "auto" && bullets >= 2);
	});

	pi.on("tool_call", (event) => {
		if (event.toolName === "todo") {
			return;
		}
		if (todoRequired && !todoExists && mode !== "skipped") {
			budget -= 1;
		}
	});

	pi.on("tool_result", (event) => {
		try {
			if (event.toolName === "todo") {
				const details = (event as { details?: { error?: unknown } }).details;
				const next = event.isError ? undefined : boardFrom(details);
				if (next) board = next;
				// The todo tool reports a rejected call, such as `#9 not found`,
				// as `details.error` without isError; it changed nothing.
				if (next && details?.error === undefined && ["create", "update", "delete", "clear"].includes(String(event.input?.action))) {
					since = { work: false, steered: false };
				}
			} else {
				since.work = true;
				const input = event.input as { command?: unknown; description?: unknown } | undefined;
				// A detached call reports a handoff, not the command's outcome.
				const handoff = (event as { details?: { handoff?: unknown } }).details?.handoff;
				if (event.toolName === "bash" && typeof input?.command === "string" && CHECK.test(input.command) && handoff === undefined) {
					const label = typeof input.description === "string" && input.description.trim() ? input.description.trim() : "a check command";
					since.check = { passed: !event.isError, label };
				}
			}
		} catch {
			// Malformed event: skip the audit bookkeeping, keep the nudges below.
		}
		const append = (text: string) => ({
			content: [...event.content, { type: "text", text: `\n${text}` }],
			...(event.structuredContent !== undefined && {
				structuredContent: event.structuredContent,
			}),
		});
		if (event.toolName === "todo") {
			if (!event.isError) {
				const action = event.input?.action;
				todoExists =
					action === "clear"
						? false
						: action === "create" || action === "list" || action === "get" || action === "update";
				const text = event.content
					.filter((block) => block.type === "text")
					.map((block) => block.text)
				.join("\n");
				if (action === "clear") {
					statuses = new Map();
					clearDemanded = false;
				} else if (action === "list" && !event.input?.status) {
					// A list names every task, so it replaces what we held.
					statuses = statusesFromList(text) ?? new Map();
				} else if (action === "create") {
					const created = /^Created #(\d+):/m.exec(text);
					if (created) statuses.set(Number(created[1]), "pending");
				} else if (action === "update") {
					const transition = /^Updated #(\d+)(?: \(.+? → (pending|in_progress|completed|deleted)\))?/m.exec(text);
					if (transition?.[2]) statuses.set(Number(transition[1]), transition[2]);
				} else if (action === "delete") {
					const deleted = /^Deleted #(\d+):/m.exec(text);
					if (deleted) statuses.set(Number(deleted[1]), "deleted");
				}
				if (everyTaskCompleted(statuses)) {
					if (!clearDemanded) {
						clearDemanded = true;
						return append(CLEAR_NUDGE);
					}
				} else {
					clearDemanded = false;
				}
			}
			return;
		}
		if (!todoRequired || todoExists || mode === "skipped" || budget >= 0) {
			return;
		}
		// The budget is spent: append the nudge to this and every later
		// non-todo result until a todo list exists. The structured content
		// passes through unchanged, or the contract drops it.
		return append(NUDGE);
	});
}
