import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const stateKey = Symbol.for("session-uptime.state");
type UptimeState = { sessionId: string; startedAt: number };
type GlobalState = { [key: symbol]: UptimeState | undefined };

export function formatUptime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function sessionUptimeLabel(sessionId: string): string {
  const state = (globalThis as unknown as GlobalState)[stateKey];
  return state?.sessionId === sessionId ? `uptime ${formatUptime(performance.now() - state.startedAt)}` : "";
}

export default function sessionUptime(pi: ExtensionAPI): void {
  let timer: ReturnType<typeof setInterval> | undefined;

  pi.on("session_start", (_event, ctx) => {
    if (timer !== undefined) clearInterval(timer);
    if (ctx.mode !== "tui") return;

    const globals = globalThis as unknown as GlobalState;
    const sessionId = ctx.sessionManager.getSessionId();
    if (globals[stateKey]?.sessionId !== sessionId) {
      globals[stateKey] = { sessionId, startedAt: performance.now() };
    }
    const render = (): void => {
      // Request a footer refresh without adding a separate status-row entry.
      ctx.ui.setStatus("session-uptime", undefined);
    };
    render();
    timer = setInterval(render, 1000);
    timer.unref();
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    if (ctx.mode === "tui") ctx.ui.setStatus("session-uptime", undefined);
    // Keep the start time across extension reloads; a new session ID resets it.
  });
}
