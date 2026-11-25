import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { dockLabel } from "../bash-background.ts";
import { formatUptime } from "../session-uptime.ts";

/**
 * Live subagent runs for the footer dock, mirroring the background-task dock:
 * bash-background publishes RunningBgTask rows under a globalThis symbol that
 * footer-model-prefix renders; this module owns the subagent twin. The event
 * payloads redact task text (PROMPT_REDACTED), so the goal comes from the
 * launcher's own `subagent` tool call, linked by toolCallId.
 */
export interface SubagentRow {
	id: string;
	agent: string;
	goal: string;
	/** Newest transcript activity, refreshed by subagent-dock while running. */
	progress?: string;
	/** Model summary of `progress`; shown in its place once it arrives. */
	brief?: string;
	startedAt: number;
	endedAt?: number;
	state: "running" | "done" | "failed" | "stopped";
	/** The runs a workflow spawned: one per step, each holding that step's work. */
	children?: ChildRun[];
}

export interface ChildRun {
	id: string;
	agent: string;
	/** The runner's directory for the run; status.json names the step once it has spawned. */
	asyncDir?: string;
	label?: string;
	sessionFile?: string;
}

interface Registry {
	rows: Map<string, SubagentRow>;
	launches: Map<string, { agent: string; goal: string; recordedAt: number }>;
}

const registryKey = Symbol.for("pi.subagent-dock.registry");
type SharedRegistry = { [registryKey]?: Registry };

export const LINGER_MS = 30_000;
export const MAX_ROWS = 3;
const LAUNCH_TTL_MS = 3_600_000;

function registry(): Registry {
	const shared = globalThis as unknown as SharedRegistry;
	return (shared[registryKey] ??= { rows: new Map(), launches: new Map() });
}

/** The launcher's own call: the only source of the unredacted goal. */
export function recordLaunch(toolCallId: string, agent: string, goal: string): void {
	const firstLine = goal.split(/\r?\n/).find((line) => line.trim());
	registry().launches.set(toolCallId, { agent, goal: dockLabel(firstLine ?? agent), recordedAt: Date.now() });
}

/** A workflow launch carries a script, not a task: name the script. An inline
 * script has no name to show, so it returns "" and the row falls back to what
 * the started event knows. */
export function workflowLabel(workflow: unknown): string {
	if (typeof workflow !== "string" || !workflow || workflow === "true") return "";
	const base = workflow.split("/").pop() ?? workflow;
	return dockLabel(base.replace(/\.(?:mjs|cjs|js|ts)$/i, ""));
}

interface StartedEvent {
	id?: string;
	agent?: string;
	toolCallId?: string;
	agents?: string[];
	chain?: string[];
	chainStepCount?: number;
	workflowGraph?: { phases?: Array<{ title?: string }> };
	parentWorkflowRunId?: unknown;
	asyncDir?: string;
}

/** What the row says the run is doing. A workflow's own name says nothing, so
 * the phase titles lead; a launch label, the agent chain and the step count
 * follow in that order. */
function startedGoal(event: StartedEvent, launchGoal: string | undefined, agent: string): string {
	const titles = (event.workflowGraph?.phases ?? [])
		.map((phase) => dockLabel(phase.title ?? ""))
		.filter(Boolean);
	if (titles.length > 0) {
		const shown = titles.slice(0, 3).join(" → ");
		return titles.length > 3 ? `${shown} +${titles.length - 3}` : shown;
	}
	if (launchGoal) return launchGoal;
	const chain = event.chain?.length ? event.chain.join("→") : (event.agents ?? []).join("+");
	if (chain && chain !== agent) return chain;
	const steps = event.chainStepCount ?? event.agents?.length ?? 0;
	if (steps > 1) return `${steps} steps`;
	// Nothing names the run, and repeating the agent column would say nothing.
	return agent === "workflow" ? "unlabelled" : agent;
}

/** A workflow is named by its steps' labels once they are known. */
export function workflowGoal(labels: string[]): string {
	return labels.slice(0, 2).join(" + ") + (labels.length > 2 ? ` +${labels.length - 2}` : "");
}

export function applyStarted(event: StartedEvent): void {
	const id = typeof event.id === "string" && event.id ? event.id : undefined;
	if (!id) return;
	// A child spawned by a workflow is an internal step: its completion is
	// skipped below (awaitedByWorkflow), so giving it a row would leave it
	// running forever. The workflow's row carries the run and reads this
	// child's label and transcript.
	const current = registry();
	if (typeof event.parentWorkflowRunId === "string" && event.parentWorkflowRunId) {
		const parent = current.rows.get(event.parentWorkflowRunId);
		if (parent) (parent.children ??= []).push({ id, agent: event.agent ?? "", ...(event.asyncDir ? { asyncDir: event.asyncDir } : {}) });
		return;
	}
	const launch = event.toolCallId ? current.launches.get(event.toolCallId) : undefined;
	const agent = launch?.agent ?? (typeof event.agent === "string" && event.agent ? event.agent : "agent");
	current.rows.set(id, {
		id,
		agent,
		goal: startedGoal(event, launch?.goal, agent),
		startedAt: Date.now(),
		state: "running",
	});
}

export function applyComplete(event: { runId?: string; id?: string; state?: unknown; timestamp?: unknown; awaitedByWorkflow?: unknown }): void {
	const id = typeof event.runId === "string" && event.runId ? event.runId : typeof event.id === "string" && event.id ? event.id : undefined;
	if (!id) return;
	const row = registry().rows.get(id);
	if (!row) return;
	// Internal steps never earned a row; a replay of an already-terminal run
	// must not extend its linger or flip its verdict.
	if (event.awaitedByWorkflow === true || row.state !== "running") return;
	row.state = event.state === "failed" || event.state === "rejected" ? "failed" : event.state === "stopped" ? "stopped" : "done";
	row.endedAt = typeof event.timestamp === "number" ? event.timestamp : Date.now();
}

/** Rows the dock shows at `now`: running runs plus terminal ones still
 * lingering, oldest first. */
export function visibleRows(now = Date.now()): SubagentRow[] {
	return [...registry().rows.values()]
		.filter((row) => row.state === "running" || (row.endedAt !== undefined && now - row.endedAt < LINGER_MS))
		.sort((a, b) => a.startedAt - b.startedAt);
}

/** Drops what nothing can show again: lingered-out rows and launch labels
 * whose runs never started. Called from the publisher's tick. */
export function prune(now = Date.now()): void {
	const current = registry();
	for (const [id, row] of current.rows) {
		if (row.state !== "running" && row.endedAt !== undefined && now - row.endedAt >= LINGER_MS) current.rows.delete(id);
	}
	for (const [callId, launch] of current.launches) {
		if (now - launch.recordedAt >= LAUNCH_TTL_MS) current.launches.delete(callId);
	}
}

/** A session owns its rows: nothing survives into the next one. */
export function clearRegistry(): void {
	registry().rows.clear();
	registry().launches.clear();
}

/** The newest tool activity in a run-transcript tail: an assistant toolCall
 * renders as `name primary-argument`, a toolResult as `name first text`;
 * whichever record appears last wins, so a call with no result yet is what
 * the run is doing now. dockLabel strips escapes and redacts secrets. */
export function lastToolLine(tail: string): string | undefined {
	const lines = tail.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (!line) continue;
		let entry: Record<string, unknown>;
		try { entry = JSON.parse(line); } catch { continue; }
		const message = entry.message;
		if (typeof message !== "object" || message === null) continue;
		const m = message as { role?: unknown; content?: unknown; toolName?: unknown };
		if (m.role === "toolResult" && typeof m.toolName === "string") {
			const text = firstText(m.content);
			return dockLabel(text ? `${m.toolName} ${text}` : m.toolName);
		}
		if (m.role === "assistant" && Array.isArray(m.content)) {
			for (let j = m.content.length - 1; j >= 0; j--) {
				const item = m.content[j] as { type?: unknown; name?: unknown; arguments?: unknown };
				if (item?.type !== "toolCall" || typeof item.name !== "string") continue;
				const arg = primaryArgument(item.arguments);
				return dockLabel(arg ? `${item.name} ${arg}` : item.name);
			}
		}
	}
	return undefined;
}

function firstText(content: unknown): string {
	if (typeof content === "string") return content.slice(0, 200);
	if (Array.isArray(content)) {
		for (const part of content) {
			const text = (part as { text?: unknown }).text;
			if (typeof text === "string" && text) return text.slice(0, 200);
		}
	}
	return "";
}

function primaryArgument(args: unknown): string {
	if (typeof args !== "object" || args === null) return "";
	for (const key of ["command", "path", "query", "pattern", "description"]) {
		const value = (args as Record<string, unknown>)[key];
		if (typeof value === "string" && value) return value.slice(0, 200);
	}
	return "";
}

/** Whole words only, greedy by visible width; a word wider than the room is
 * hard-cut, since a path or command can be one huge token. */
function truncateWords(text: string, max: number): string {
	if (max <= 0) return "";
	if (visibleWidth(text) <= max) return text;
	let out = "";
	for (const word of text.split(" ")) {
		const candidate = out ? `${out} ${word}` : word;
		if (visibleWidth(candidate) > max) break;
		out = candidate;
	}
	return out || truncateToWidth(text, max, "");
}

/** One footer line per row in the bg-dock shape; the builder lives here so
 * tests cover it without a TUI. */
export function subagentLines(
	rows: SubagentRow[],
	width: number,
	theme: { fg: (token: string, text: string) => string },
	now = Date.now(),
): string[] {
	const shown = rows.slice(0, MAX_ROWS);
	const lines = shown.map((row) => {
		const end = row.endedAt ?? now;
		const time = formatUptime(Math.max(0, end - row.startedAt));
		const suffix = row.state === "running"
			? theme.fg("dim", time)
			: row.state === "failed"
				? theme.fg("error", `✗ ${time}`)
				: row.state === "stopped"
					? theme.fg("warning", `■ ${time}`)
					: theme.fg("success", `✓ ${time}`);
		const head = theme.fg("accent", `${row.agent} ◆ `) + row.goal;
		const room = width - visibleWidth(suffix) - 1;
		if (room <= 0) {
			return truncateToWidth(`${head} ${suffix}`, width, "...");
		}
		// Words are never torn: the goal keeps whole words within 60% of the
		// room, and the live activity joins only with a whole word of its own
		// left in the rest.
		const prefixWidth = visibleWidth(`${row.agent} ◆ `);
		const goalText = truncateWords(row.goal, Math.min(room - prefixWidth, Math.floor(room * 0.6)));
		let left = theme.fg("accent", `${row.agent} ◆ `) + goalText;
		const live = row.state === "running" ? (row.brief ?? row.progress) : undefined;
		if (live) {
			const activityRoom = room - prefixWidth - visibleWidth(goalText) - 3;
			const activity = activityRoom >= 4 ? truncateWords(live, activityRoom) : "";
			if (activity) left += theme.fg("dim", ` · ${activity}`);
		}
		return left + " " + suffix;
	});
	if (rows.length > MAX_ROWS) {
		lines.push(theme.fg("dim", `+${rows.length - MAX_ROWS} more`));
	}
	return lines;
}
