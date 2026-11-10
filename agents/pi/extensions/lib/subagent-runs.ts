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
	startedAt: number;
	endedAt?: number;
	state: "running" | "done" | "failed" | "stopped";
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

export function applyStarted(event: StartedEvent): void {
	const id = typeof event.id === "string" && event.id ? event.id : undefined;
	if (!id) return;
	// A child spawned by a workflow is an internal step: its completion is
	// skipped below (awaitedByWorkflow), so giving it a row would leave it
	// running forever. The workflow's own root row carries the run.
	if (typeof event.parentWorkflowRunId === "string" && event.parentWorkflowRunId) return;
	const current = registry();
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
		return room > 0
			? truncateToWidth(head, room, "") + " " + suffix
			: truncateToWidth(`${head} ${suffix}`, width, "...");
	});
	if (rows.length > MAX_ROWS) {
		lines.push(theme.fg("dim", `+${rows.length - MAX_ROWS} more`));
	}
	return lines;
}
