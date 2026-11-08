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
	state: "running" | "done" | "failed";
}

interface Registry {
	rows: Map<string, SubagentRow>;
	launches: Map<string, { agent: string; goal: string }>;
}

const registryKey = Symbol.for("pi.subagent-dock.registry");
type SharedRegistry = { [registryKey]?: Registry };

export const DOCK_KEY = "pi.subagent-dock.rows";
export const LINGER_MS = 30_000;
export const MAX_ROWS = 3;

function registry(): Registry {
	const shared = globalThis as unknown as SharedRegistry;
	return (shared[registryKey] ??= { rows: new Map(), launches: new Map() });
}

/** The launcher's own call: the only source of the unredacted goal. */
export function recordLaunch(toolCallId: string, agent: string, goal: string): void {
	const firstLine = goal.split(/\r?\n/).find((line) => line.trim());
	registry().launches.set(toolCallId, { agent, goal: dockLabel(firstLine ?? agent) });
}

export function applyStarted(event: { id?: string; agent?: string; toolCallId?: string; agents?: string[]; chain?: string[] }): void {
	const id = typeof event.id === "string" && event.id ? event.id : undefined;
	if (!id) return;
	const current = registry();
	const launch = event.toolCallId ? current.launches.get(event.toolCallId) : undefined;
	const agent = launch?.agent ?? (typeof event.agent === "string" && event.agent ? event.agent : "agent");
	const chain = event.chain?.length ? event.chain.join("→") : (event.agents ?? []).join("+");
	current.rows.set(id, {
		id,
		agent,
		goal: launch?.goal || dockLabel(chain || agent),
		startedAt: Date.now(),
		state: "running",
	});
}

export function applyComplete(event: { runId?: string; id?: string; state?: unknown; timestamp?: unknown; awaitedByWorkflow?: unknown }): void {
	if (event.awaitedByWorkflow === true) return;
	const id = typeof event.runId === "string" && event.runId ? event.runId : typeof event.id === "string" && event.id ? event.id : undefined;
	if (!id) return;
	const row = registry().rows.get(id);
	if (!row) return;
	row.state = event.state === "failed" || event.state === "rejected" ? "failed" : "done";
	row.endedAt = typeof event.timestamp === "number" ? event.timestamp : Date.now();
}

/** Rows the dock shows at `now`: running runs plus terminal ones still
 * lingering, oldest first. */
export function visibleRows(now = Date.now()): SubagentRow[] {
	return [...registry().rows.values()]
		.filter((row) => row.state === "running" || (row.endedAt !== undefined && now - row.endedAt < LINGER_MS))
		.sort((a, b) => a.startedAt - b.startedAt);
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
			: theme.fg(row.state === "failed" ? "error" : "success", `${row.state === "failed" ? "✗" : "✓"} ${time}`);
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
