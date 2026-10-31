/** Local, read-only /agents dashboard. See lib/agents-dashboard.md. */
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { clean, HEARTBEAT_MS, recordKey, scanRecords, writeRecord, type AgentRecord, type AgentRow } from "./lib/live-agent-state.ts";

export default function agentsDashboard(pi: ExtensionAPI) {
  const dir = join(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"), "live-agents");
  let context: ExtensionContext | undefined;
  let record: AgentRecord | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let running = false;
  let prompts = 0;
  let dashboardOpen = false;
  let warned = false;
  let closeDashboard: (() => void) | undefined;
  const tools = new Map<string, string>();

  function publish(ctx = context) {
    if (!record || !ctx) return;
    record.name = clean(ctx.sessionManager.getSessionName() || `Session ${record.sessionId.slice(-8)}`);
    record.model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "No model";
    record.tool = [...tools.values()].at(-1) || "";
    const state = prompts > 0 ? "Waiting" : running ? "Running" : "Idle";
    if (state !== record.state) record.updatedAt = Date.now();
    record.state = state;
    record.heartbeatAt = Date.now();
    save();
  }
  function save() {
    if (!record) return;
    try { writeRecord(dir, record); }
    catch {
      if (!warned && context?.hasUI) {
        warned = true;
        context.ui.notify("Agents dashboard cannot write its local status file.", "warning");
      }
    }
  }
  function stop() {
    clearInterval(heartbeat);
    heartbeat = undefined;
    closeDashboard?.();
    closeDashboard = undefined;
    if (record) {
      record.state = "Stopped";
      record.tool = "";
      record.updatedAt = record.heartbeatAt = Date.now();
      save();
    }
    record = undefined;
    context = undefined;
    tools.clear();
    prompts = 0;
    running = false;
  }
  pi.on("session_start", (_event, ctx) => {
    stop();
    context = ctx;
    warned = false;
    running = !ctx.isIdle();
    record = {
      version: 1, sessionId: ctx.sessionManager.getSessionId(), pid: process.pid,
      name: "", cwd: ctx.cwd, model: "", tool: "", state: "Idle",
      updatedAt: Date.now(), heartbeatAt: Date.now(),
    };
    publish(ctx);
    heartbeat = setInterval(() => publish(), HEARTBEAT_MS);
    heartbeat.unref?.();
  });
  pi.on("session_shutdown", stop);
  pi.on("agent_start", (_event, ctx) => { context = ctx; running = true; publish(); });
  // agent_end is not final idle: retries and queued work may still follow.
  pi.on("agent_settled", (_event, ctx) => { context = ctx; running = false; tools.clear(); publish(); });
  pi.on("model_select", (event, ctx) => {
    context = ctx;
    publish();
    if (record) { record.model = `${event.model.provider}/${event.model.id}`; save(); }
  });
  pi.on("tool_execution_start", (event, ctx) => {
    context = ctx; tools.set(event.toolCallId, clean(event.toolName)); publish();
  });
  pi.on("tool_execution_end", (event, ctx) => {
    context = ctx; tools.delete(event.toolCallId); publish();
  });
  pi.on("ui_prompt_start", (_event, ctx) => {
    if (dashboardOpen) return;
    context = ctx; prompts++; publish();
  });
  pi.on("ui_prompt_end", (_event, ctx) => {
    if (dashboardOpen) return;
    context = ctx; prompts = Math.max(0, prompts - 1); publish();
  });

  pi.registerCommand("agents", {
    description: "Live Pi sessions across projects (read-only, no tmux)",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/agents requires interactive terminal mode.", "warning");
        return;
      }
      if (dashboardOpen) return;
      dashboardOpen = true;
      try {
        await ctx.ui.custom<void>((tui, theme, keys, done) => {
          let rows: AgentRow[] = [];
          let selected = "";
          let showAll = false;
          let detail = false;
          let disposed = false;
          const refresh = () => {
            rows = scanRecords(dir).filter(r => showAll || !["Stopped", "Stale"].includes(r.displayState));
            if (!rows.some(r => recordKey(r) === selected)) selected = rows[0] ? recordKey(rows[0]) : "";
            tui.requestRender();
          };
          const timer = setInterval(refresh, 1000);
          timer.unref?.();
          const dispose = () => { disposed = true; clearInterval(timer); };
          const finish = () => { if (disposed) return; dispose(); done(); };
          closeDashboard = finish;
          refresh();
          return {
            dispose,
            invalidate() {},
            render(width: number) {
              if (width <= 0) return [];
              const index = Math.max(0, rows.findIndex(r => recordKey(r) === selected));
              const capacity = Math.max(1, Math.floor(((tui.terminal.rows || 24) - (detail ? 13 : 7)) / 2));
              const start = Math.max(0, Math.min(index - Math.floor(capacity / 2), rows.length - capacity));
              const lines = [theme.fg("accent", theme.bold(`Agents · ${rows.length} ${showAll ? "tracked" : "live"} sessions`)),
                theme.fg("dim", "↑↓ select · Enter details · a live/all · r refresh · Esc close"), ""];
              if (!rows.length) lines.push("No live sessions. Run /reload in each Pi terminal to register it.");
              for (const row of rows.slice(start, start + capacity)) {
                const current = record && recordKey(row) === recordKey(record) ? " [this]" : "";
                const color = row.displayState === "Waiting" ? "warning" : row.displayState === "Running" ? "accent" : "muted";
                lines.push(`${recordKey(row) === selected ? "›" : " "} ${theme.fg(color, row.displayState.padEnd(7))} ${clean(row.name)}${current}${row.tool ? ` · ${clean(row.tool)}` : ""}`);
                lines.push(theme.fg("dim", `  ${clean(row.cwd)} · ${clean(row.model)}`));
              }
              if (rows.length > capacity) lines.push(theme.fg("dim", `${start + 1}–${Math.min(rows.length, start + capacity)} of ${rows.length}`));
              const row = rows[index];
              if (detail && row) {
                lines.push("", `Session: ${clean(row.sessionId)}`, `PID: ${row.pid}`, `Project: ${clean(row.cwd)}`,
                  `Model: ${clean(row.model)}`, `Heartbeat: ${Math.max(0, Math.floor((Date.now() - row.heartbeatAt) / 1000))}s ago`);
              }
              lines.push("", theme.fg("dim", "Read-only · main-agent state, not detached jobs · /name gives sessions a task label"));
              return lines.map(line => truncateToWidth(line, width));
            },
            handleInput(data: string) {
              if (keys.matches(data, "tui.select.cancel") || data === "q") { finish(); return; }
              if (data === "a") { showAll = !showAll; refresh(); return; }
              if (data === "r") { refresh(); return; }
              if (keys.matches(data, "tui.select.confirm")) { detail = !detail; tui.requestRender(); return; }
              const direction = keys.matches(data, "tui.select.up") ? -1 : keys.matches(data, "tui.select.down") ? 1 : 0;
              if (direction && rows.length) {
                const index = Math.max(0, rows.findIndex(r => recordKey(r) === selected));
                selected = recordKey(rows[Math.max(0, Math.min(rows.length - 1, index + direction))]);
                tui.requestRender();
              }
            },
          };
        });
      } finally { dashboardOpen = false; closeDashboard = undefined; }
    },
  });
}
