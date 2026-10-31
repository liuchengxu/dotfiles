import { randomUUID } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function subagentCount(pi: ExtensionAPI): void {
  let dispose: (() => void) | undefined;

  pi.on("session_start", (_event, ctx) => {
    dispose?.();
    if (ctx.mode !== "tui") return;

    let pending: (() => void) | undefined;
    let knownActive = false;
    const refresh = (): void => {
      if (pending) return;
      const requestId = randomUUID();
      const timeout = setTimeout(() => {
        pending?.();
        ctx.ui.setStatus("subagent-count", knownActive ? "Agents ?" : undefined);
      }, 10000);
      timeout.unref();
      const unsubscribe = pi.events.on(`subagents:rpc:v1:reply:${requestId}`, (payload) => {
        pending?.();
        const reply = payload as { version?: number; success?: boolean; data?: { fleet?: { version?: number; totalActive?: number } } };
        const fleet = reply.data?.fleet;
        const count = fleet?.totalActive;
        if (reply.version !== 1 || !reply.success || fleet?.version !== 1 || !Number.isSafeInteger(count) || count! < 0) {
          ctx.ui.setStatus("subagent-count", knownActive ? "Agents ?" : undefined);
          return;
        }
        knownActive = count! > 0;
        ctx.ui.setStatus("subagent-count", knownActive ? ctx.ui.theme.fg("accent", `Agents ${count} active`) : undefined);
      });
      pending = () => {
        clearTimeout(timeout);
        unsubscribe();
        pending = undefined;
      };
      pi.events.emit("subagents:rpc:v1:request", { version: 1, requestId, method: "status", params: {} });
    };
    const unsubscribeReady = pi.events.on("subagents:rpc:v1:ready", refresh);
    const timer = setInterval(refresh, 2000);
    timer.unref();
    dispose = () => {
      clearInterval(timer);
      pending?.();
      unsubscribeReady();
      ctx.ui.setStatus("subagent-count", undefined);
    };
    refresh();
  });

  pi.on("session_shutdown", () => {
    dispose?.();
    dispose = undefined;
  });
}
