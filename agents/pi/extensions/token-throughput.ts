import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { setLiveRate, setPhase } from "./lib/working-line.ts";

// Live output throughput for the current assistant message. Streaming values
// estimate tokens from emitted text, thinking, and tool-call JSON. Final values
// use provider output usage when it is meaningful.

const STATUS_KEY = "token-throughput";
const CHARACTERS_PER_TOKEN = 4;
const RENDER_INTERVAL_MS = 120;
const MIN_RATE_DURATION_MS = 50;
/** A phase publishes only after its delta type held this long, so a reply
 * alternating thinking and text within one message does not flicker. */
const PHASE_STABILITY_MS = 300;

type OutputDeltaType = "text_delta" | "thinking_delta" | "toolcall_delta";

interface Usage {
  output: number;
}

interface AssistantStreamEvent {
  type: string;
  delta?: string;
  reason?: string;
}

interface AssistantMessage {
  role?: string;
  usage?: Usage;
  stopReason?: string;
}

function formatCount(tokens: number): string {
  if (tokens >= 10000) return `${Math.round(tokens / 1000)}k`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens)}`;
}

function isOutputDelta(type: string): type is OutputDeltaType {
  return type === "text_delta" || type === "thinking_delta" || type === "toolcall_delta";
}

function phaseFor(type: OutputDeltaType): string {
  return type === "thinking_delta" ? "Thinking" : type === "text_delta" ? "Replying" : "Preparing tool";
}

export default function tokenThroughputExtension(pi: ExtensionAPI): void {
  let active = false;
  let characters = 0;
  let firstDeltaAt: number | undefined;
  let lastDeltaAt: number | undefined;
  let lastRenderAt: number | undefined;
  let streamFailed = false;
  let pendingPhase: string | undefined;
  let pendingPhaseAt: number | undefined;
  let phaseDeadline: ReturnType<typeof setTimeout> | undefined;

  /** Publishes the phase and drops any candidate it supersedes. */
  const publishPhase = (text: string): void => {
    if (phaseDeadline !== undefined) clearTimeout(phaseDeadline);
    phaseDeadline = undefined;
    pendingPhase = undefined;
    pendingPhaseAt = undefined;
    setPhase(text);
  };

  /** A candidate publishes on the deadline even if no further delta arrives:
   * "held for 300ms" is wall-clock, not contingent on the next event. */
  const schedulePhase = (phase: string, now: number): void => {
    pendingPhase = phase;
    pendingPhaseAt = now;
    if (phaseDeadline !== undefined) clearTimeout(phaseDeadline);
    phaseDeadline = setTimeout(() => {
      phaseDeadline = undefined;
      if (pendingPhase !== undefined) publishPhase(pendingPhase);
    }, PHASE_STABILITY_MS);
  };

  const reset = (): void => {
    active = false;
    characters = 0;
    firstDeltaAt = undefined;
    lastDeltaAt = undefined;
    lastRenderAt = undefined;
    streamFailed = false;
    if (phaseDeadline !== undefined) clearTimeout(phaseDeadline);
    phaseDeadline = undefined;
    pendingPhase = undefined;
    pendingPhaseAt = undefined;
    setPhase("");
  };

  const elapsedOutputMs = (): number | undefined => {
    if (firstDeltaAt === undefined || lastDeltaAt === undefined) return undefined;
    const elapsed = lastDeltaAt - firstDeltaAt;
    return elapsed >= MIN_RATE_DURATION_MS ? elapsed : undefined;
  };

  const render = (
    ctx: ExtensionContext,
    options: { final: boolean; exactOutputTokens?: number; failed?: boolean },
  ): void => {
    if (ctx.mode !== "tui") return;

    const now = performance.now();
    if (!options.final && lastRenderAt !== undefined && now - lastRenderAt < RENDER_INTERVAL_MS) return;
    lastRenderAt = now;

    const exact = options.exactOutputTokens !== undefined;
    const count = options.exactOutputTokens ?? characters / CHARACTERS_PER_TOKEN;
    const elapsed = elapsedOutputMs();
    const rate = elapsed === undefined ? undefined : count / (elapsed / 1000);
    const speedText = rate === undefined ? "— tok/s" : `${exact ? "" : "≈"}${rate.toFixed(0)} tok/s`;
    const countText = `${exact ? "" : "≈"}${formatCount(count)} out`;
    const theme = ctx.ui.theme;

    if (options.final) {
      const marker = options.failed ? theme.fg("error", "✗") : theme.fg("success", "✓");
      ctx.ui.setStatus(
        STATUS_KEY,
        `${marker} ${theme.fg("accent", speedText)}${theme.fg("dim", ` · ${countText}`)}`,
      );
      // The working line stops naming a rate once the message is done: a
      // frozen value next to the still-ticking elapsed time would mislead.
      setLiveRate("");
      return;
    }

    // Live values ride the working line next to the elapsed time; the
    // footer slot is reserved for the settled summary. An unmeasurable rate
    // (stream just started) shows nothing rather than a placeholder dash.
    setLiveRate(rate === undefined ? "" : `${exact ? "" : "≈"}${rate.toFixed(0)} tok/s`);
  };

  const clear = (ctx: ExtensionContext): void => {
    reset();
    setLiveRate("");
    if (ctx.mode === "tui") ctx.ui.setStatus(STATUS_KEY, undefined);
  };

  pi.on("message_start", (event, ctx) => {
    if (ctx.mode !== "tui") return;
    const message = event.message as AssistantMessage;
    if (message.role !== "assistant") return;

    reset();
    active = true;
    // Entering waiting cannot flicker: publish at once; the first sustained
    // deltas replace it.
    publishPhase("Waiting for model");
    render(ctx, { final: false });
  });

  pi.on("message_update", (event, ctx) => {
    if (ctx.mode !== "tui" || !active) return;
    const streamEvent = event.assistantMessageEvent as AssistantStreamEvent;
    if (isOutputDelta(streamEvent.type) && streamEvent.delta?.length) {
      const now = performance.now();
      firstDeltaAt ??= now;
      lastDeltaAt = now;
      characters += streamEvent.delta.length;
      const phase = phaseFor(streamEvent.type);
      if (phase !== pendingPhase) schedulePhase(phase, now);
    } else if (streamEvent.type === "error") {
      streamFailed = true;
      // A failed stream produces nothing further to name.
      publishPhase("");
    }
    render(ctx, { final: false });
  });

  pi.on("message_end", (event, ctx) => {
    if (ctx.mode !== "tui" || !active) return;
    const message = event.message as AssistantMessage;
    if (message.role !== "assistant") return;

    const output = message.usage?.output;
    const exactOutputTokens =
      output !== undefined && Number.isFinite(output) && output > 0 ? output : undefined;
    render(ctx, {
      final: true,
      exactOutputTokens,
      failed: streamFailed || message.stopReason === "error" || message.stopReason === "aborted",
    });
    reset();
  });

  pi.on("agent_start", (_event, ctx) => clear(ctx));
  pi.on("session_start", (_event, ctx) => clear(ctx));
  pi.on("session_shutdown", (_event, ctx) => clear(ctx));
}
