/**
 * Steering signal: make pi's queued messages visible at both moments the
 * stock UI underplays.
 *
 * Waiting: replaces InteractiveMode's dim "Steering: ..." lines with one line
 * per queued message — a short accent label ("⧗ Steering:" / "⧗ Follow-up:")
 * before the message in the default color, so the message and not the label
 * survives narrow terminals — plus one dim hint naming when the kinds present
 * go out and showing the configured dequeue key. The queue is read through
 * getAllQueuedMessages(), so messages queued during compaction are included,
 * and the key through getAppKeyDisplay(), so a custom binding is shown.
 * Rendering only clears and fills the pending container: pi calls this from
 * paths that request their own render, so requesting one here could recurse.
 *
 * Delivered: a queued user message that reaches the model mid-run shows
 * "Queued message delivered to the agent" in the footer for a few seconds.
 * The run's opening prompt is the one user message before_agent_start
 * announces (messageType "user"); a notification-triggered run announces none
 * (messageType "custom"), and its trigger message_start carries role
 * "custom", so it never passes the role filter. One limit: a message queued
 * during an idle manual /compact is sent by pi as a new prompt
 * (before_agent_start with messageType "user"), so no delivered status
 * appears for it.
 *
 * The transcript stays unmarked: session entries do not record how a message
 * was delivered, so a durable "steered" label cannot be truthful (see the
 * review in ~/notes/liuchengxu/dotfiles/2026-11-02-pi-steering-signal/).
 *
 * The prototype change survives /reload; removing this extension requires a
 * restart.
 */
import { InteractiveMode, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Spacer, TruncatedText } from "@earendil-works/pi-tui";

const patchKey = Symbol.for("pi.steering-signal.v1");
const statusKey = "steering-signal";
const statusText = "Queued message delivered to the agent";

/** One line per queued message: a short kind label, then the message body. */
export interface QueuedLinePart {
	label: string;
	message: string;
}

/** Which queues hold messages; the hint names only the kinds present. */
export interface QueuedKinds {
	steering: boolean;
	followUp: boolean;
}

export function queuedLineParts(steering: readonly string[], followUp: readonly string[]): QueuedLinePart[] {
	return [
		...steering.map((message) => ({ label: "⧗ Steering:", message })),
		...followUp.map((message) => ({ label: "⧗ Follow-up:", message })),
	];
}

/** The dim line under the messages; at least one kind is always present. */
export function dequeueHintLine(kinds: QueuedKinds, key: string): string {
	const timing =
		kinds.steering && kinds.followUp
			? "steering before the next model request, follow-ups when the agent finishes"
			: kinds.steering
				? "sent before the next model request"
				: "sent when the agent finishes";
	return `↳ ${timing} · ${key} to edit queued messages`;
}

function renderPendingMessages(host: any): void {
	const { steering, followUp } = host.getAllQueuedMessages();
	const parts = queuedLineParts(steering, followUp);
	host.pendingMessagesContainer.clear();
	if (parts.length === 0) return;
	const { theme } = host.createExtensionUIContext();
	const dequeueKey = host.getAppKeyDisplay("app.message.dequeue");
	host.pendingMessagesContainer.addChild(new Spacer(1));
	for (const part of parts) {
		// Accent carries the signal; the message body stays default so it reads.
		const line = `${theme.fg("accent", part.label)} ${part.message}`;
		host.pendingMessagesContainer.addChild(new TruncatedText(line, 1, 0));
	}
	const kinds: QueuedKinds = { steering: steering.length > 0, followUp: followUp.length > 0 };
	host.pendingMessagesContainer.addChild(new TruncatedText(theme.fg("dim", dequeueHintLine(kinds, dequeueKey)), 1, 0));
}

function patchPendingDisplay(): void {
	const proto = InteractiveMode.prototype as any;
	// No method to wrap means a future pi layout; leave the stock UI in place.
	if (proto[patchKey] || typeof proto.updatePendingMessagesDisplay !== "function") return;
	const original = proto.updatePendingMessagesDisplay;
	proto.updatePendingMessagesDisplay = function (this: any) {
		try {
			renderPendingMessages(this);
		} catch {
			// A pi update that renamed any internal this reads must fall back
			// to the stock display rather than break the queue UI.
			original.call(this);
		}
	};
	proto[patchKey] = true;
}

export default function steeringSignal(pi: ExtensionAPI, options: { statusMs?: number } = {}): void {
	const statusMs = options.statusMs ?? 4_000;
	let openingUserMessages = 0;
	let clearTimer: ReturnType<typeof setTimeout> | undefined;
	let statusCtx: ExtensionContext | undefined;

	const clearStatus = (): void => {
		const ctx = statusCtx;
		statusCtx = undefined;
		if (!ctx) return;
		try {
			ctx.ui.setStatus(statusKey, undefined);
		} catch {
			// The ctx can go stale before the timer fires, e.g. across a
			// session switch; nothing left to clear then.
		}
	};

	const showDelivered = (ctx: ExtensionContext): void => {
		if (clearTimer) clearTimeout(clearTimer);
		statusCtx = ctx;
		try {
			ctx.ui.setStatus(statusKey, ctx.ui.theme.fg("accent", statusText));
		} catch {
			statusCtx = undefined;
			return;
		}
		clearTimer = setTimeout(clearStatus, statusMs);
		clearTimer.unref?.();
	};

	pi.on("before_agent_start", (event) => {
		openingUserMessages = event.messageType === "user" ? 1 : 0;
	});

	pi.on("message_start", (event, ctx) => {
		if (event.message?.role !== "user") return;
		// The message that opened the run is not a delivery.
		if (openingUserMessages > 0) {
			openingUserMessages--;
			return;
		}
		if (ctx.mode !== "tui") return;
		showDelivered(ctx);
	});

	pi.on("session_shutdown", () => {
		if (clearTimer) clearTimeout(clearTimer);
		clearTimer = undefined;
		statusCtx = undefined;
	});

	patchPendingDisplay();
}
