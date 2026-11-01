import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// The OpenAI SDK reports every transport failure as the same "Connection error."
// (APIConnectionError default; timeouts say "Request timed out."). The errno or
// proxy cause never reaches the message Pi persists, so the transcript cannot
// tell a flaky VPN from a dead endpoint. This extension keeps the original
// wording and adds the one fact that identifies the failing leg — the provider
// and model of the request — plus what already happens next (automatic retry).
const genericError = /^(Connection error\.?|Request timed out\.?|fetch failed\.?|Terminated\.?)$/i;

const hint = (model: string): string =>
	` — request to ${model} failed before a response (network, proxy, or VPN). Automatic retries may follow; if this persists, check the connection or switch models.`;

function label(model: { provider: string; id: string } | undefined): string {
	return model ? `${model.provider}/${model.id}` : "the model provider";
}

function isGenericFailure(errorMessage: string | undefined): boolean {
	return typeof errorMessage === "string" && genericError.test(errorMessage.trim());
}

export function enrichError(errorMessage: string, model: { provider: string; id: string } | undefined): string {
	const original = errorMessage.trim().replace(/\.$/, "");
	return `${original}.${hint(label(model))}`;
}

export default function connectionErrorDisplay(pi: ExtensionAPI): void {
	let selected: { provider: string; id: string } | undefined;

	pi.on("model_select", event => {
		selected = { provider: event.model.provider, id: event.model.id };
	});

	pi.on("message_end", (event, ctx) => {
		const message = event.message as { role: string; stopReason?: string; errorMessage?: string };
		if (message.role !== "assistant" || message.stopReason !== "error") return;
		if (!isGenericFailure(message.errorMessage)) return;
		// model_select fires only on explicit switches; ctx.model also covers the
		// session's initial model, so the first failure after a restart is named.
		const model = ctx?.model ?? selected;
		// Idempotent: an enriched message no longer matches the generic pattern.
		return { message: { ...event.message, errorMessage: enrichError(message.errorMessage!, model) } };
	});
}
