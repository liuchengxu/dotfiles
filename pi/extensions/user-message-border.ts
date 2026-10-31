/**
 * Mark user messages with a leading `❯`, so they are distinguishable at a glance from
 * assistant output. A blockquote-style left border (`│ `) is available as an opt-in and is
 * off by default.
 *
 * The border uses the one rendering hook an extension has, since there is no theme token and
 * no border support on the message container: rendering the message as a Markdown blockquote
 * makes pi's own renderer draw `│ ` on every wrapped line -- a real border that follows
 * wrapping, rather than characters we would have to place ourselves and could not wrap
 * correctly.
 *
 * Display-only: nothing here reaches the session or the model's context. The transformer
 * maps message text to its bordered form deterministically, so the many re-renders pi
 * performs (streaming updates, terminal resizes) cannot stack or alter the border.
 */

type TransformContext = {
	messageType?: "user" | "assistant" | "assistant-thinking";
	isStreaming?: boolean;
};

type MarkdownTransformer = (markdown: string, context: TransformContext) => string;

type ExtensionAPI = {
	registerMarkdownTransformer: (transformer: MarkdownTransformer) => void;
};

/**
 * Prefix every line with `> ` so the renderer treats the block as a quote. Blank lines need
 * a bare `>`: a line with no marker would end the quote and cut the border in half.
 */
export function toBlockquote(markdown: string): string {
	if (!markdown.trim()) return markdown;
	return markdown
		.split("\n")
		.map((line) => (line.length > 0 ? `> ${line}` : ">"))
		.join("\n");
}

/**
 * The marker prefixed to the first line. `❯` is what pi already renders as the user-input
 * prompt, so it needs no new vocabulary; it is also single-width and has no font dependency,
 * unlike an emoji, which is double-width and would push the bordered block out of alignment.
 */
const USER_MARKER = "❯";

/**
 * Prefix the first non-empty line, leaving every other line alone: the marker identifies the
 * message, and repeating it on every line would only add noise.
 */
export function markFirstLine(markdown: string): string {
	const lines = markdown.split("\n");
	const first = lines.findIndex((line) => line.trim().length > 0);
	if (first < 0) return markdown;
	lines[first] = `${USER_MARKER} ${lines[first]}`;
	return lines.join("\n");
}

/**
 * The border is off by default: the marker is what distinguishes the message type, and the
 * border is the heavier of the two. Set PI_USER_MESSAGE_BORDER to 1, true or on to draw it.
 */
function borderEnabled(): boolean {
	const setting = process.env.PI_USER_MESSAGE_BORDER;
	return setting === "1" || setting === "true" || setting === "on";
}

/**
 * The transformer. Only user messages are decorated; assistant text and thinking blocks are
 * returned untouched, and a streaming message is left alone until it is finalized.
 */
export function borderMarkdown(markdown: string, context: TransformContext | undefined): string {
	if (context?.messageType !== "user") return markdown;
	if (context.isStreaming) return markdown;
	const marked = markFirstLine(markdown);
	return borderEnabled() ? toBlockquote(marked) : marked;
}

export default function userMessageBorder(pi: ExtensionAPI): void {
	pi.registerMarkdownTransformer(borderMarkdown);
}
