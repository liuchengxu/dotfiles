/**
 * Desktop alert when pi needs you, like Claude Code's notifications: when a
 * run that took a while settles, and at once when a question or confirmation
 * opens during a run. A short run is skipped (you were likely watching it),
 * and so is a run you stopped with Escape. The terminal shows the alert:
 * OSC 99 on Kitty, OSC 777 elsewhere (Ghostty, iTerm2, WezTerm). Adapted from
 * pi's notify example. TUI mode only, so print-mode output stays clean.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** A run shorter than this settles without an alert. */
const MIN_RUN_MS = Number(process.env.PI_NOTIFY_MIN_RUN_MS ?? 15_000);
const BODY_CHARS = 120;

/** Model text goes inside a terminal escape sequence: control characters
 * would end it early and let the rest act on the terminal, and `;`
 * separates OSC 777 fields. */
export function clean(text: string, limit: number): string {
	const flat = text.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/;/g, ",").replace(/\s+/g, " ").trim();
	return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

export function sequence(title: string, body: string, kitty: boolean): string {
	const t = clean(title, 60);
	const b = clean(body, BODY_CHARS);
	return kitty ? `\x1b]99;i=1:d=0;${t}\x1b\\\x1b]99;i=1:p=body;${b}\x1b\\` : `\x1b]777;notify;${t};${b}\x07`;
}

function lastAnswer(messages: unknown[]): string {
	for (const message of [...messages].reverse() as { role?: string; content?: unknown }[]) {
		if (message?.role !== "assistant" || !Array.isArray(message.content)) continue;
		const text = message.content.filter((part) => part?.type === "text").map((part) => part.text).join(" ").trim();
		if (text) return text.split("\n").find((line: string) => line.trim()) ?? text;
	}
	return "";
}

export default function notify(pi: ExtensionAPI, write: (data: string) => void = (data) => process.stdout.write(data)) {
	let tui = false;
	let startedAt: number | undefined;
	let answer = "";
	const alert = (title: string, body: string): void => {
		if (!tui) return;
		try {
			write(sequence(title, body, Boolean(process.env.KITTY_WINDOW_ID)));
		} catch {
			// A closed terminal must not take the session down.
		}
	};

	pi.on("session_start", (_event, ctx) => {
		tui = ctx.mode === "tui";
	});
	pi.on("agent_start", () => {
		startedAt ??= Date.now();
	});
	pi.on("agent_end", (event) => {
		answer = lastAnswer(event.messages ?? []) || answer;
	});
	pi.on("agent_settled", (event) => {
		const elapsed = startedAt === undefined ? 0 : Date.now() - startedAt;
		startedAt = undefined;
		const body = answer || "Ready for input";
		answer = "";
		if (!event.aborted && elapsed >= MIN_RUN_MS) alert("pi is waiting for you", body);
	});
	pi.on("ui_prompt_start", (event) => {
		// Only a prompt that opens during a run is the agent asking; one
		// opened while idle came from a command the user just typed.
		if (startedAt === undefined) return;
		alert("pi needs your input", event.title ?? (event.kind === "custom" ? "A question is waiting" : `A ${event.kind} prompt is waiting`));
	});
}
