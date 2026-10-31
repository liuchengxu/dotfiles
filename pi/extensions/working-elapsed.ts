import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getLiveRate, onLiveRate } from "./lib/working-line.ts";

export default function workingElapsed(pi: ExtensionAPI): void {
  let timer: ReturnType<typeof setInterval> | undefined;
  let startedAt = 0;
  let activity = "";
  let currentCtx: ExtensionContext | undefined;

  const stop = (ctx: ExtensionContext): void => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    activity = "";
    currentCtx = undefined;
    active.clear();
    if (ctx.mode === "tui") ctx.ui.setWorkingMessage();
  };

  const render = (ctx: ExtensionContext): void => {
    if (ctx.mode !== "tui") return;
    const seconds = Math.floor((performance.now() - startedAt) / 1000);
    const elapsed = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    // The live stream rate joins the line only while a message streams: it
    // goes stale the moment a tool takes over and the clock keeps ticking.
    const rate = getLiveRate();
    ctx.ui.setWorkingMessage(
      `Working${activity ? ` · ${activity}` : ""} · ${elapsed}${rate ? ` · ${rate}` : ""}`,
    );
  };

  pi.on("agent_start", (_event, ctx) => {
    stop(ctx);
    if (ctx.mode !== "tui") return;

    currentCtx = ctx;
    startedAt = performance.now();
    render(ctx);
    timer = setInterval(() => render(ctx), 1000);
    timer.unref();
  });

  // A rate change outside the one-second tick still lands promptly.
  const stopRateListener = onLiveRate(() => {
    if (currentCtx) render(currentCtx);
  });

  // Name the step the reader is waiting on: a bash command's description,
  // or the tool name otherwise. The running row holds the same fact; this
  // puts it in the footer, next to the elapsed time.
  const active = new Map<string, string>();

  pi.on("tool_execution_start", (event, ctx) => {
    const args = event.args as { description?: unknown } | undefined;
    const label = event.toolName === "bash" && typeof args?.description === "string" && args.description.trim()
      ? args.description.trim()
      : event.toolName.replace(/^mcp__.+?__/, "").replace(/[_-]+/g, " ");
    active.set(event.toolCallId, label);
    activity = label;
    render(ctx);
  });

  // A finished call is no longer the thing the reader waits on: the footer
  // falls back to another live call, or to plain Working.
  pi.on("tool_execution_end", (event, ctx) => {
    active.delete(event.toolCallId);
    activity = [...active.values()].at(-1) ?? "";
    render(ctx);
  });

  pi.on("agent_end", (_event, ctx) => stop(ctx));
  pi.on("session_start", (_event, ctx) => stop(ctx));
  pi.on("session_shutdown", (_event, ctx) => {
    stopRateListener();
    stop(ctx);
  });
}
