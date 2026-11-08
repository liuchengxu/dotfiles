import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { applyComplete, applyStarted, clearRegistry, prune, recordLaunch, visibleRows } from "./lib/subagent-runs.ts";

/**
 * Publishes live subagent runs to the footer dock beside the background-task
 * rows. Event payloads redact task text, so the unredacted goal comes from
 * the launcher's own subagent tool call (lib/subagent-runs.ts links them by
 * toolCallId). */
export default function subagentDock(pi: ExtensionAPI): void {
	let dockTimer: ReturnType<typeof setInterval> | undefined;

	pi.on("tool_execution_start", (event) => {
		if (event.toolName !== "subagent" || event.parentToolCallId) return;
		const args = event.args as { agent?: unknown; task?: unknown } | undefined;
		if (typeof args?.task !== "string") return;
		const agent = typeof args.agent === "string" && args.agent ? args.agent : "worker";
		recordLaunch(event.toolCallId, agent, args.task);
	});

	pi.events.on("subagent:async-started", (payload: unknown) => {
		applyStarted((payload ?? {}) as Parameters<typeof applyStarted>[0]);
	});

	pi.events.on("subagent:async-complete", (payload: unknown) => {
		applyComplete((payload ?? {}) as Parameters<typeof applyComplete>[0]);
	});

	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		if (dockTimer !== undefined) clearInterval(dockTimer);
		// Same refresh trick as the bg dock: publishing rows and clearing an
		// unset status both tick the elapsed times and prune lingered rows.
		let published = false;
		dockTimer = setInterval(() => {
			prune();
			const rows = visibleRows();
			if (rows.length > 0 || published) {
				published = rows.length > 0;
				try {
					ctx.ui.setStatus("subagent-runs", undefined);
				} catch {
					// Stale ctx between ticks; the interval dies with shutdown.
				}
			}
		}, 1000);
		dockTimer.unref?.();
	});

	pi.on("session_shutdown", () => {
		if (dockTimer !== undefined) clearInterval(dockTimer);
		dockTimer = undefined;
		clearRegistry();
	});
}
