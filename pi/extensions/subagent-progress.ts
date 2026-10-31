import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

// Claude-style finished rows for async subagents. pi-subagents delivers each
// completion as a `subagent-notify` custom message with display:false (the
// wake turn carries the facts to the model), so the transcript itself never
// records that an agent finished. This extension adds one settled row per
// completion: `Agent "name" finished · 7s`, next to the tool rows that
// bash-background.ts already draws.

const STARTED_EVENT = "subagent:async-started";
const COMPLETE_EVENT = "subagent:async-complete";
const MESSAGE_TYPE = "subagent-progress";

interface ProgressDetails {
	agent: string;
	label: string;
	duration: string;
	failed: boolean;
	stopped: boolean;
}

interface MinimalTheme {
	fg: (token: string, text: string) => string;
	bold: (text: string) => string;
}

function formatDuration(ms: number): string {
	const seconds = Math.max(0, Math.round(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function runIdOf(payload: unknown): string | undefined {
	const id = (payload as { runId?: unknown; id?: unknown } | undefined)?.runId;
	if (typeof id === "string" && id) return id;
	const fallback = (payload as { id?: unknown } | undefined)?.id;
	return typeof fallback === "string" && fallback ? fallback : undefined;
}

export default function subagentProgress(pi: ExtensionAPI): void {
	const startedAt = new Map<string, number>();
	// The raw event is an observation channel, not a delivery acknowledgement:
	// detached-workflow reconciliation emits a completion directly and the
	// result watcher can re-emit it. One row per run, tolerant of replays.
	const recentlyRecorded = new Map<string, number>();
	const DUPLICATE_WINDOW_MS = 30_000;

	pi.registerMessageRenderer(MESSAGE_TYPE, (message, _options, theme) => {
		const details = ((message as { details?: Partial<ProgressDetails> }).details ?? {}) as Partial<ProgressDetails>;
		const minimalTheme = theme as MinimalTheme;
		// finished earns the success dot; failure the error cross; everything
		// else (stopped, paused, partial) is attention-worthy and gets the square.
		const icon = details.failed
			? minimalTheme.fg("error", "✗")
			: details.label === "finished"
				? minimalTheme.fg("success", "⏺")
				: minimalTheme.fg("warning", "■");
		const name = details.agent ?? "agent";
		const label = details.label ?? "finished";
		const duration = details.duration ? ` ${minimalTheme.fg("dim", `· ${details.duration}`)}` : "";
		return new Text(
			`${icon} ${minimalTheme.fg("toolTitle", minimalTheme.bold(`Agent "${name}" ${label}`))}${duration}`,
			0,
			0,
		);
	});

	pi.events.on(STARTED_EVENT, (payload: unknown) => {
		const id = runIdOf(payload);
		if (id) startedAt.set(id, Date.now());
	});

	pi.events.on(COMPLETE_EVENT, (payload: unknown) => {
		const record = payload as
			| {
					runId?: unknown;
					id?: unknown;
					agent?: unknown;
					state?: unknown;
					timestamp?: unknown;
					awaitedByWorkflow?: unknown;
			  }
			| undefined;
		// A workflow's awaited children are internal steps: pi-subagents keeps
		// them out of the transcript (notify.js skips awaitedByWorkflow), and the
		// workflow's own completion row names the run.
		if (record?.awaitedByWorkflow === true) return;
		const id = runIdOf(payload);
		const now = Date.now();
		if (id !== undefined) {
			const lastSeen = recentlyRecorded.get(id);
			if (lastSeen !== undefined && now - lastSeen < DUPLICATE_WINDOW_MS) return;
			recentlyRecorded.set(id, now);
			for (const [seenId, seenAt] of recentlyRecorded) {
				if (now - seenAt >= DUPLICATE_WINDOW_MS) recentlyRecorded.delete(seenId);
			}
		}
		const agent =
			typeof record?.agent === "string" && record.agent.trim() ? record.agent.trim() : "agent";
		const state = record?.state;
		const started = id !== undefined ? startedAt.get(id) : undefined;
		if (id !== undefined) startedAt.delete(id);
		const endedAt = typeof record?.timestamp === "number" ? record.timestamp : now;
		const duration = started !== undefined ? formatDuration(endedAt - started) : "";
		const label =
			state === "failed" || state === "rejected"
				? String(state)
				: state === "complete" || state === undefined
					? "finished"
					: String(state);
		const failed = state === "failed" || state === "rejected";
		// triggerTurn stays false: the completion's own wake already starts the
		// turn. This row is a record for the reader, so it must not wake anything.
		pi.sendMessage(
			{
				customType: MESSAGE_TYPE,
				display: true,
				content: `Subagent ${agent} ${label}${duration ? ` after ${duration}` : ""}.`,
				details: {
					agent,
					label,
					duration,
					failed,
					stopped: state === "stopped",
				} satisfies ProgressDetails,
			},
			{ triggerTurn: false },
		);
	});

	pi.on("session_start", () => startedAt.clear());
	pi.on("session_shutdown", () => startedAt.clear());
}
