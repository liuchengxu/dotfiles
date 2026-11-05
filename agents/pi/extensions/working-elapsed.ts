import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { basename } from "node:path";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { getLiveRate, getPhase, onLiveRate } from "./lib/working-line.ts";

export default function workingElapsed(pi: ExtensionAPI): void {
  let timer: ReturnType<typeof setInterval> | undefined;
  let startedAt = 0;
  let activity = "";
  let currentCtx: ExtensionContext | undefined;
  let turnSummary = "";
  let redrawSummary = () => {};

  const stop = (ctx: ExtensionContext, keepSummary = false): void => {
    if (!keepSummary) turnSummary = "";
    redrawSummary();
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
    // A live tool names itself; between tools the model phase names the wait.
    const label = activity || getPhase();
    ctx.ui.setWorkingMessage(
      `Working${label ? ` · ${label}` : ""} · ${elapsed}${rate ? ` · ${rate}` : ""}`,
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

  // Name the step the reader is waiting on. A bash command shows its
  // description; file tools show the file's basename — the one argument
  // field that is both informative and safe to print. Everything else keeps
  // the generic verb. The running row holds the same fact; this puts it in
  // the footer, next to the elapsed time.
  const active = new Map<string, string>();

  pi.on("tool_execution_start", (event, ctx) => {
    const args = event.args as { description?: unknown; path?: unknown } | undefined;
    const phase: Record<string, string> = { read: "Reading", write: "Writing", edit: "Editing", grep: "Searching", find: "Finding", bash: "Running" };
    let label = phase[event.toolName] ?? event.toolName.replace(/^mcp__.+?__/, "").replace(/[_-]+/g, " ");
    if (event.toolName === "bash" && typeof args?.description === "string" && args.description.trim()) {
      label = args.description.trim();
    } else if (["read", "write", "edit"].includes(event.toolName) && typeof args?.path === "string" && args.path.trim()) {
      // One line and control-free: filenames are unvalidated input, so strip
      // every control character (a filename with an escape could restyle the
      // line), collapse runs of spaces, then cut.
      const name = basename(args.path).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/ +/g, " ").trim();
      if (name) label = `${label} ${name.slice(0, 40)}`;
    }
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

  pi.on("agent_end", (_event, ctx) => {
    const seconds = Math.round((performance.now() - startedAt) / 1000);
    const duration = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const done = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    turnSummary = `Worked for ${duration} · done ${done}`;
    stop(ctx, true);
    redrawSummary();
  });
  pi.on("session_start", (_event, ctx) => {
    stop(ctx);
    if (ctx.mode !== "tui") return;
    ctx.ui.setWidget("turn-summary", (tui, theme) => {
      redrawSummary = () => tui.requestRender();
      return {
        invalidate() {},
        render: (width: number) => turnSummary ? [truncateToWidth(theme.fg("dim", turnSummary), width)] : [],
      };
    });
  });
  pi.on("session_shutdown", (_event, ctx) => {
    stopRateListener();
    stop(ctx);
    redrawSummary = () => {};
  });
}
