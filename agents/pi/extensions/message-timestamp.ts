/**
 * Message timestamps for the pi transcript.
 *
 * Prefixes each user / assistant message with the time it was SENT, read from the session
 * record rather than from the clock at render time. So a session restored tomorrow still
 * shows yesterday's send times, which is the entire reason this exists.
 *
 * Extension-only: it uses the documented ExtensionAPI and reads session entries through
 * `ctx.sessionManager.getEntries()`. It therefore needs no change to the installed pi
 * package, and survives both `npm update -g` and pi version bumps.
 *
 * Two properties the design depends on, both forced by how pi renders:
 *
 *  1. `registerMarkdownTransformer` re-runs on every terminal width change. So the
 *     transformer is a PURE function of (markdown, index, now) -- no cursor, no consumed
 *     queue. A cursor would advance on each resize and the rendered times would drift.
 *  2. The transformer receives only the markdown and static context, so the index is keyed
 *     by message text. When two messages are byte-identical the FIRST INDEXED OCCURRENCE
 *     WINS: deterministic, and stable across re-renders.
 *
 * If a message has no indexed time the markdown is returned untouched. The current time is
 * never invented for a message whose send time is unknown.
 */

import { appendFileSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** A send time, in milliseconds since the epoch. */
export type Stamp = number;

/**
 * Message text -> send time.
 *
 * `exact` is keyed by the literal string the renderer hands the transformer. `normalized`
 * is a fallback keyed on whitespace-collapsed text, for messages whose text reaches the
 * transformer with different leading/trailing whitespace than the session record.
 */
export interface TimestampIndex {
	exact: Map<string, Stamp>;
	normalized: Map<string, Stamp>;
}

export function createTimestampIndex(): TimestampIndex {
	return { exact: new Map(), normalized: new Map() };
}

export function resetTimestampIndex(index: TimestampIndex): void {
	index.exact.clear();
	index.normalized.clear();
}

/**
 * Mirrors `parseSkillBlock` in pi's `core/agent-session.ts`.
 *
 * A skill invocation arrives as one user message whose text is a `<skill ...>` wrapper plus
 * an optional trailing user instruction. The renderer splits it and hands the transformer
 * only the trailing part, so the trailing part has to be indexed separately or it would
 * never match. Measured against the installed pi 0.86.1; if upstream changes that regex this
 * degrades to "no timestamp on skill messages", never to a wrong one.
 */
const SKILL_BLOCK =
	/^<skill name="([^"]+)" location="([^"]+)">\n([\s\S]*?)\n<\/skill>(?:\n\n([\s\S]+))?$/;

function normalize(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

/**
 * The send time for a message: its own recorded `timestamp` when present, else the session
 * entry's ISO timestamp. Returns undefined rather than substituting the current clock.
 */
export function messageStamp(message: unknown, entryTimestamp?: unknown): Stamp | undefined {
	const own = (message as { timestamp?: unknown } | undefined)?.timestamp;
	if (typeof own === "number" && Number.isFinite(own)) return own;
	if (typeof entryTimestamp === "string") {
		const parsed = Date.parse(entryTimestamp);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return undefined;
}

/**
 * The literal strings the renderer will hand the markdown transformer for this message.
 *
 * Derivations verified against pi 0.86.1:
 *   - user text: `getUserMessageText` joins text blocks with "" (interactive-mode.js), then
 *     `parseSkillBlock` may split off a trailing user instruction, which is `.trim()`ed.
 *   - assistant text blocks: each rendered as its own Markdown with `.trim()`.
 *   - assistant thinking: a maximal run of consecutive thinking blocks, each `.trim()`ed,
 *     joined with "\n\n".
 * Tool calls and tool results render through their own components and are not indexed.
 */
export function transformerTexts(message: unknown): string[] {
	const m = message as { role?: unknown; content?: unknown } | undefined;
	if (!m) return [];
	if (m.role === "user") return userTexts(m.content);
	if (m.role === "assistant") return assistantTexts(m.content);
	return [];
}

function userTexts(content: unknown): string[] {
	const blocks =
		typeof content === "string"
			? [content]
			: Array.isArray(content)
				? content
						.filter((c) => (c as { type?: unknown } | undefined)?.type === "text")
						.map((c) => String((c as { text?: unknown }).text ?? ""))
				: [];
	const text = blocks.join("");
	if (!text) return [];

	const texts = [text];
	const skill = text.match(SKILL_BLOCK);
	const trailing = skill?.[4]?.trim();
	if (trailing) texts.push(trailing);
	return texts;
}

function assistantTexts(content: unknown): string[] {
	if (!Array.isArray(content)) return [];
	const texts: string[] = [];
	for (let i = 0; i < content.length; i++) {
		const block = content[i] as { type?: unknown; text?: unknown; thinking?: unknown } | undefined;
		if (!block) continue;
		if (block.type === "text") {
			const text = typeof block.text === "string" ? block.text.trim() : "";
			if (text) texts.push(text);
			continue;
		}
		if (block.type !== "thinking") continue;

		// Consume the maximal run of consecutive thinking blocks, as the renderer does.
		const run: string[] = [];
		for (; i < content.length; i++) {
			const next = content[i] as { type?: unknown; thinking?: unknown } | undefined;
			if (next?.type !== "thinking") break;
			const thinking = typeof next.thinking === "string" ? next.thinking.trim() : "";
			if (thinking) run.push(thinking);
		}
		i--;
		if (run.length > 0) texts.push(run.join("\n\n"));
	}
	return texts;
}

/** Index one message under every string the transformer could be handed for it. */
export function addMessage(index: TimestampIndex, message: unknown, entryTimestamp?: unknown): void {
	const stamp = messageStamp(message, entryTimestamp);
	if (stamp === undefined) return;
	for (const text of transformerTexts(message)) {
		if (!text) continue;
		// First indexed occurrence wins -- never overwritten, so re-indexing is a no-op.
		if (!index.exact.has(text)) index.exact.set(text, stamp);
		const key = normalize(text);
		if (key && !index.normalized.has(key)) index.normalized.set(key, stamp);
	}
}

/**
 * Index restored session entries. This is what makes a resumed session show the times the
 * messages were originally sent. Entries are `{ type: "message", message, timestamp }`.
 */
export function addEntries(index: TimestampIndex, entries: unknown): void {
	if (!Array.isArray(entries)) return;
	for (const entry of entries) {
		const e = entry as { type?: unknown; message?: unknown; timestamp?: unknown } | undefined;
		if (!e || e.type !== "message" || !e.message) continue;
		addMessage(index, e.message, e.timestamp);
	}
}

export function lookupStamp(index: TimestampIndex, markdown: string): Stamp | undefined {
	const exact = index.exact.get(markdown);
	if (exact !== undefined) return exact;
	return index.normalized.get(normalize(markdown));
}

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

/**
 * `MM-DD HH:MM:SS` for every message: the date is always visible, and a message keeps the same
 * appearance when the clock crosses midnight while the session is open. Deliberately built from
 * local-time getters rather than `toLocaleString`, so the output does not depend on locale
 * settings.
 */
export function formatStamp(stamp: Stamp): string {
	const sent = new Date(stamp);
	return (
		`${pad(sent.getMonth() + 1)}-${pad(sent.getDate())} ` +
		`${pad(sent.getHours())}:${pad(sent.getMinutes())}:${pad(sent.getSeconds())}`
	);
}

/**
 * The transformer. Pure in (markdown, index): identical input yields identical output, and the
 * result does not depend on the current time, so a width-change re-render cannot alter or
 * duplicate the stamp.
 */
export function transformMarkdown(
	markdown: string,
	context: { isStreaming?: boolean } | undefined,
	index: TimestampIndex,
): string {
	if (context?.isStreaming) return markdown;
	const stamp = lookupStamp(index, markdown);
	if (stamp === undefined) return markdown;
	return appendStamp(markdown, formatStamp(stamp));
}

/**
 * Put the stamp after the last non-empty line, so a trailing blank line cannot separate the
 * stamp from the text it belongs to.
 */
export function appendStamp(markdown: string, stamp: string): string {
	const lines = markdown.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].trim().length > 0) {
			lines[i] = `${lines[i]} (${stamp})`;
			return lines.join("\n");
		}
	}
	return markdown;
}

export default function messageTimestampExtension(pi: ExtensionAPI): void {
	const index = createTimestampIndex();

	// Restored sessions: index everything already in the session before anything renders.
	pi.on("session_start", async (_event, ctx) => {
		try {
			resetTimestampIndex(index);
			addEntries(index, ctx?.sessionManager?.getEntries?.());
		} catch {
			// Never let indexing break the session; a missing index only means no timestamps.
		}
	});

	// Live messages, indexed as they arrive.
	const indexMessage = async (event: { message?: unknown }) => {
		try {
			addMessage(index, event?.message);
		} catch {
			// as above
		}
	};
	pi.on("message_start", indexMessage);
	pi.on("message_end", indexMessage);

	pi.registerMarkdownTransformer((markdown, context) => {
		try {
			return transformMarkdown(markdown, context, index);
		} catch {
			return markdown;
		}
	});

	// Load diagnostic, off unless PI_MESSAGE_TIMESTAMP_DEBUG names a file. It exists so that
	// "pi actually loaded this extension" is a recorded fact rather than an inference from
	// the documented discovery paths.
	const debugLog = process.env.PI_MESSAGE_TIMESTAMP_DEBUG;
	if (debugLog) {
		try {
			appendFileSync(debugLog, `loaded ${new Date().toISOString()} pid=${process.pid}\n`);
		} catch {
			// diagnostic only
		}
	}
}
