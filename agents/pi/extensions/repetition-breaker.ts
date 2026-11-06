/**
 * Repetition breaker: bounds identical tool calls whose results never change.
 *
 * Pi auto-continues the turn on every tool result, so a model that repeats an
 * action can loop forever: polling a background task, re-running a command,
 * or issuing no-op calls while "waiting". Per-tool guards cover known vectors;
 * this extension bounds the whole class.
 *
 * A fingerprint is the tool name plus the arguments with recursively sorted
 * keys (bash's presentation-only `description` is excluded). Fingerprints are
 * tracked over the last 32 top-level calls, so alternating loops count too.
 * Four executions with unchanged results produce one model-visible warning;
 * the sixth matching attempt is blocked with `terminate`, and any attempt
 * after that aborts the run. Only a genuine user message resets escalation:
 * automatic notification wakes, turn boundaries, and unrelated calls do not.
 * A changed substantive result resets that fingerprint's streak.
 */
import { createHash } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const WINDOW = 32;
const WARN_AT = 4;
const BLOCK_AT = 6;
const RESULT_CAP = 8000;

interface FpState {
	/** Consecutive executions returning the same result hash. */
	streak: number;
	lastHash?: string;
	warned: boolean;
	/** Set once a call was blocked; the next matching attempt aborts. */
	abortArmed: boolean;
}

function stable(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`);
		return `{${entries.join(",")}}`;
	}
	return JSON.stringify(value) ?? "undefined";
}

export function fingerprint(toolName: string, input: unknown): string {
	const cleaned = toolName === "bash" && input && typeof input === "object" && !Array.isArray(input)
		? Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([key]) => key !== "description"))
		: input;
	return `${toolName}:${stable(cleaned)}`;
}

export default function repetitionBreaker(pi: ExtensionAPI) {
	let window: string[] = [];
	const states = new Map<string, FpState>();
	const pending = new Map<string, string>();

	function reset(): void {
		window = [];
		states.clear();
		pending.clear();
	}

	function tell(text: string): void {
		try {
			pi.sendMessage(
				{ customType: "repetition-breaker", content: text, display: true, details: {} },
				{ triggerTurn: false, deliverAs: "steer" },
			);
		} catch {
			// A replaced or shut-down session has no one left to warn.
		}
	}

	function occurrences(fp: string): number {
		return window.reduce((count, item) => count + (item === fp ? 1 : 0), 0);
	}

	pi.on("session_start", reset);
	pi.on("input", (event) => {
		if (event.source !== "extension") reset();
	});

	pi.on("tool_call", (event, ctx) => {
		if (event.parentToolCallId) return;
		const fp = fingerprint(event.toolName, event.input);
		const st = states.get(fp) ?? { streak: 0, warned: false, abortArmed: false };
		if (st.abortArmed) {
			const text = `Repetition breaker: the same call was repeated after being blocked. Aborting this run (not a user Escape); background tasks were not cancelled.`;
			tell(text);
			try { ctx.ui.notify(text, "error"); } catch { /* print mode */ }
			ctx.abort();
			return { block: true, terminate: true, reason: text };
		}
		if (occurrences(fp) + 1 >= BLOCK_AT && st.streak >= WARN_AT) {
			st.abortArmed = true;
			states.set(fp, st);
			const text = `Repetition breaker: paused after ${BLOCK_AT} repetitions of the same ${event.toolName} call with unchanged results. Background tasks were not cancelled. To continue, give a new instruction; do not resume the same call.`;
			tell(text);
			try { ctx.ui.notify(text, "warning"); } catch { /* print mode */ }
			return { block: true, terminate: true, reason: text };
		}
		window.push(fp);
		if (window.length > WINDOW) window = window.slice(-WINDOW);
		pending.set(event.toolCallId, fp);
		states.set(fp, st);
	});

	pi.on("tool_result", (event) => {
		if (event.parentToolCallId) return;
		const fp = pending.get(event.toolCallId);
		if (!fp) return;
		pending.delete(event.toolCallId);
		const st = states.get(fp);
		if (!st) return;
		const text = event.content
			.map((part) => (part.type === "text" ? part.text : ""))
			.join("\n")
			.slice(0, RESULT_CAP);
		const hash = createHash("sha1").update(text).digest("hex");
		if (st.lastHash === hash) st.streak += 1;
		else {
			st.streak = 1;
			st.lastHash = hash;
			st.warned = false;
		}
		if (occurrences(fp) >= WARN_AT && st.streak >= WARN_AT && !st.warned) {
			st.warned = true;
			tell(
				`Repetition breaker: this ${event.toolName} call has run ${occurrences(fp)} times with unchanged results. ` +
				`If you are waiting for something, read its output or log file directly, or end your turn. ` +
				`Further identical calls will be blocked.`,
			);
		}
		states.set(fp, st);
	});
}
