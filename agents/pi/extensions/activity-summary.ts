import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Text, truncateToWidth } from "@earendil-works/pi-tui";

interface ToolActivity {
	name: string;
	parent?: string;
	counted: boolean;
	failed: boolean;
}

export interface ActivityState {
	startedAt?: number;
	reads: number;
	commands: number;
	otherTools: number;
	failures: number;
	tools: Map<string, ToolActivity>;
	lastFrozen?: string;
	frozen: boolean;
}

export function createActivityState(): ActivityState {
	return { reads: 0, commands: 0, otherTools: 0, failures: 0, tools: new Map(), frozen: true };
}

function category(name: string): "reads" | "commands" | "otherTools" {
	if (name === "read") return "reads";
	if (name === "bash" || name === "powershell") return "commands";
	return "otherTools";
}

function adjustCount(state: ActivityState, name: string, delta: 1 | -1): void {
	state[category(name)] = Math.max(0, state[category(name)] + delta);
}

export function startActivity(state: ActivityState, now: number): void {
	state.startedAt = now;
	state.reads = 0;
	state.commands = 0;
	state.otherTools = 0;
	state.failures = 0;
	state.tools.clear();
	state.lastFrozen = undefined;
	state.frozen = false;
}

export function recordToolStart(
	state: ActivityState,
	event: { toolCallId: string; toolName: string; parentToolCallId?: string },
): void {
	if (state.frozen || state.tools.has(event.toolCallId)) return;
	if (event.parentToolCallId) {
		const parent = state.tools.get(event.parentToolCallId);
		if (parent?.counted) {
			adjustCount(state, parent.name, -1);
			if (parent.failed) state.failures = Math.max(0, state.failures - 1);
			parent.counted = false;
		}
	}
	const ignored = new Set(["bg_status", "bg_logs"]);
	const counted = !ignored.has(event.toolName);
	state.tools.set(event.toolCallId, {
		name: event.toolName,
		parent: event.parentToolCallId,
		counted,
		failed: false,
	});
	if (counted) adjustCount(state, event.toolName, 1);
}

export function recordToolEnd(
	state: ActivityState,
	event: { toolCallId: string; isError: boolean },
): void {
	const tool = state.tools.get(event.toolCallId);
	if (!tool || tool.failed || !tool.counted || !event.isError) return;
	tool.failed = true;
	state.failures += 1;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatDuration(milliseconds: number): string {
	const seconds = Math.max(0, Math.floor(milliseconds / 1000));
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export function formatActivity(state: ActivityState, now: number): string {
	const parts = [`Worked for ${formatDuration(now - (state.startedAt ?? now))}`, ...activityParts(state)];
	return parts.join(" · ");
}

// The live footer narrates the counts only: the clock belongs to the
// working indicator, and the frozen entry keeps the full "Worked for" line.
function activityParts(state: ActivityState): string[] {
	const parts: string[] = [];
	if (state.reads) parts.push(`read ${plural(state.reads, "file")}`);
	if (state.commands) parts.push(`ran ${plural(state.commands, "command")}`);
	if (state.otherTools) parts.push(`used ${plural(state.otherTools, "other tool")}`);
	if (state.failures) parts.push(`${plural(state.failures, "failure")}`);
	return parts;
}

export function freezeActivity(
	pi: Pick<ExtensionAPI, "appendEntry">,
	ctx: ExtensionContext,
	state: ActivityState,
	now: number,
): string | undefined {
	if (state.frozen || state.startedAt === undefined) return undefined;
	const summary = formatActivity(state, now);
	state.frozen = true;
	state.lastFrozen = summary;
	pi.appendEntry("activity-summary", {
		summary,
		startedAt: state.startedAt,
		endedAt: now,
		reads: state.reads,
		commands: state.commands,
		otherTools: state.otherTools,
		failures: state.failures,
	});
	ctx.ui.setStatus("activity-summary", undefined);
	return summary;
}

export default function activitySummary(pi: ExtensionAPI): void {
	const state = createActivityState();
	let timer: NodeJS.Timeout | undefined;
	let context: ExtensionContext | undefined;

	const stopTimer = (): void => {
		if (timer) clearInterval(timer);
		timer = undefined;
	};
	const updateStatus = (): void => {
		if (!context || context.mode !== "tui" || state.frozen) {
			context?.ui.setStatus("activity-summary", undefined);
			return;
		}
		const status = activityParts(state).join(" · ");
		context.ui.setStatus("activity-summary", status ? context.ui.theme.fg("muted", status) : undefined);
	};
	const begin = (ctx: ExtensionContext): void => {
		context = ctx;
		if (state.frozen) startActivity(state, Date.now());
		updateStatus();
		if (ctx.mode === "tui" && !timer) {
			timer = setInterval(updateStatus, 1_000);
			timer.unref?.();
		}
	};
	const freeze = (ctx: ExtensionContext): void => {
		if (freezeActivity(pi, ctx, state, Date.now())) stopTimer();
	};

	pi.registerEntryRenderer("activity-summary", (entry, options, theme) => {
		const data = entry.data as {
			summary?: unknown;
			reads?: number;
			commands?: number;
			otherTools?: number;
			failures?: number;
		} | undefined;
		const summary = String(data?.summary ?? "");
		const metadata = options.expanded
			? ` · ${plural((data?.reads ?? 0) + (data?.commands ?? 0) + (data?.otherTools ?? 0), "tool event")} · ${plural(data?.failures ?? 0, "failure")}`
			: "";
		return new Text(truncateToWidth(theme.fg("muted", summary + metadata), 10_000), 0, 0);
	});

	pi.on("session_start", (_event, ctx) => {
		stopTimer();
		context = ctx;
		startActivity(state, Date.now());
		state.frozen = true;
		ctx.ui.setStatus("activity-summary", undefined);
	});
	pi.on("agent_start", (_event, ctx) => begin(ctx));
	pi.on("tool_execution_start", (event) => {
		recordToolStart(state, event);
		updateStatus();
	});
	pi.on("tool_execution_end", (event) => {
		recordToolEnd(state, event);
		updateStatus();
	});
	pi.on("agent_settled", (_event, ctx) => freeze(ctx));
	pi.on("session_shutdown", (_event, ctx) => {
		stopTimer();
		state.frozen = true;
		ctx.ui.setStatus("activity-summary", undefined);
		context = undefined;
	});
}
