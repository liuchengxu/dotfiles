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
		const append = (text: string) => ({
			content: [...event.content, { type: "text", text: `\n${text}` }],
			...(event.structuredContent !== undefined && {
				structuredContent: event.structuredContent,
			}),
		});
		if (event.toolName === "todo") {
			if (!event.isError) {
				const action = event.input.action;
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
				} else if (action === "list" && !event.input.status) {
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
