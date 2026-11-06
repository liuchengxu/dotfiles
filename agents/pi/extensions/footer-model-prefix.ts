import { stripVTControlCharacters } from "node:util";
import { getCurrentSystemMessage, type Message } from "@earendil-works/pi-ai";
import { estimateTokens, FooterComponent, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { rgbColor, sliceByColumn, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { formatUptime, sessionUptimeLabel } from "./session-uptime.ts";

// bash-background publishes its running tasks for the dock here; globalThis
// and the same symbol key as there, because the extensions load as separate
// module instances.
const runningBgKey = Symbol.for("pi.bash-background.running");
type RunningBgTask = { id: string; label: string; startedAt: number; state: string };
type RunningBgGlobal = { [key: symbol]: RunningBgTask[] | undefined };

type Model = { provider: string; id: string; reasoning?: boolean };
type Footer = {
  render(width: number): string[];
  footerData: { getExtensionStatuses(): ReadonlyMap<string, string> };
  session: {
    state: { model?: Model; thinkingLevel: string };
    routedModel?: { model: Model; thinkingLevel?: string };
    sessionManager: {
      getSessionName(): string | undefined;
      getSessionId(): string;
      buildSessionProjection(): { messages: Message[] };
    };
  };
  getSessionStats?(): { contextUsage?: { percent: number | null; contextWindow: number } };
  [key: symbol]: unknown;
};
const estimateKey = Symbol.for("footer-model-prefix.context-estimate");
const themeKey = Symbol.for("footer-model-prefix.theme");
type ThemeState = { [key: symbol]: (() => ExtensionContext["ui"]["theme"]) | undefined };

// pi-usage statuslines start with a provider label that need not equal the Pi
// provider id (formatUsageStatusline in @narumitw/pi-usage owns these strings).
const QUOTA_PREFIX: Record<string, string> = {
  "openai": "chatgpt",
  "openai-codex": "codex",
  "vercel-ai-gateway": "vercel",
  "github-copilot": "copilot",
  "opencode-go": "zen",
  "kimi-coding": "kimi",
  "moonshotai": "moonshot",
  "moonshotai-cn": "moonshot",
  "minimax": "minimax",
  "minimax-cn": "minimax",
  "zai": "zai",
  "zai-coding-cn": "zai",
};

function quotaMeter(quota: string, theme: ExtensionContext["ui"]["theme"]): string {
  return quota.replace(/\b(\d+(?:\.\d+)?)%/g, (label, value: string) => {
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent > 100) return label;
    const filled = Math.round(percent / 10);
    return theme.fg("accent", "█".repeat(filled))
      + theme.fg("dim", "░".repeat(10 - filled))
      + theme.fg("accent", ` ${label}`);
  });
}

/**
 * The context size pi estimates when it trusts no reported usage (the fallback of
 * estimateProjectedContextTokens in pi's compaction.js): the current system message plus every
 * other message.
 */
export function estimateContextTokens(messages: Message[]): number {
  const system = getCurrentSystemMessage(messages);
  let tokens = system ? estimateTokens(system) : 0;
  for (const message of messages) if (message.role !== "system") tokens += estimateTokens(message);
  return tokens;
}

/** One-line status text: newlines and tabs collapse to spaces, runs of spaces to one. */
const cleanStatus = (value: string): string => value.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();

/**
 * After a compaction pi reports the context as unknown until the next reply, although it has the
 * estimate above. Recompute it only when pi's own stats cache moves (session, leaf, entry count, or
 * model), never per frame. Undefined when pi knows the size or anything here is missing.
 */
function estimatedPercent(footer: Footer): number | undefined {
  let stats: ReturnType<NonNullable<Footer["getSessionStats"]>> | undefined;
  try {
    // getSessionStats is private to pi's footer; without it the display stays unknown.
    stats = footer.getSessionStats?.();
    const usage = stats?.contextUsage;
    if (!usage || usage.percent !== null || !(usage.contextWindow > 0)) return undefined;
    const cached = footer[estimateKey] as { stats: unknown; percent?: number } | undefined;
    if (cached?.stats === stats) return cached.percent;
    const tokens = estimateContextTokens(footer.session.sessionManager.buildSessionProjection().messages);
    const percent = (tokens / usage.contextWindow) * 100;
    footer[estimateKey] = { stats, percent };
    return percent;
  } catch {
    // A failure is cached for the snapshot too, so it is not retried every frame.
    if (stats) footer[estimateKey] = { stats, percent: undefined };
    return undefined;
  }
}

export default function footerModelPrefix(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    (globalThis as unknown as ThemeState)[themeKey] = () => ctx.ui.theme;

    const prototype = FooterComponent.prototype as unknown as Footer;
    const patchKey = Symbol.for("footer-model-prefix.render");
    if (prototype[patchKey]) return;
    const render = prototype.render;
    prototype.render = function renderModelPrefix(this: Footer, width: number): string[] {
      const theme = (globalThis as unknown as ThemeState)[themeKey]?.();
      if (!theme || !this.session.state.model) return render.call(this, width);

      // Recover the native stats/model boundary before narrow-terminal truncation removes it.
      const lines = render.call(this, Math.max(width, 4096));
      const boundary = stripVTControlCharacters(lines[1] ?? "").search(/ {2,}/);
      if (boundary < 0) return render.call(this, width);

      const sessionLabel = this.session.sessionManager.getSessionName()
        || `Session …${this.session.sessionManager.getSessionId().slice(-8)}`;
      const heading = stripVTControlCharacters(lines[0]);
      const suffix = ` • ${sessionLabel}`;
      if (heading.endsWith(suffix)) {
        const pathWidth = visibleWidth(heading.slice(0, -suffix.length));
        const uptime = sessionUptimeLabel(this.session.sessionManager.getSessionId());
        lines[0] = `${sliceByColumn(lines[0], pathWidth + 3, visibleWidth(heading))}${uptime ? ` • ${theme.fg("muted", uptime)}` : ""} • ${sliceByColumn(lines[0], 0, pathWidth)}`;
      }
      const statuses = this.footerData.getExtensionStatuses();
      // The task worktree sits beside the cwd's branch instead of in the statuses line. The branch,
      // when pi's cwd has one, is the only paren group at the line's end: a parenthesis in the
      // session name or path cannot steal the splice, and with no branch the worktree falls back
      // to the line's end. The prefix is measured in display columns, so wide characters in the
      // path cannot shift the cut.
      const worktree = statuses.get("worktree");
      if (worktree) {
        const plain = stripVTControlCharacters(lines[0]);
        const branch = / \([^()]*\)$/.exec(plain);
        const at = branch ? visibleWidth(plain.slice(0, branch.index + branch[0].length)) : visibleWidth(plain);
        lines[0] = `${sliceByColumn(lines[0], 0, at)} ${cleanStatus(worktree)}${sliceByColumn(lines[0], at, visibleWidth(plain))}`;
      }

      const model = this.session.state.model;
      let label = `(${model.provider}) ${model.id}`;
      if (model.reasoning) label += ` • ${this.session.state.thinkingLevel === "off" ? "thinking off" : this.session.state.thinkingLevel}`;
      const routed = this.session.routedModel;
      if (routed) label += ` → ${routed.model.id}${routed.thinkingLevel ? ` • ${routed.thinkingLevel}` : ""}`;
      const quota = statuses.get("usage");
      const quotaPrefix = QUOTA_PREFIX[model.provider] ?? model.provider;
      const quotaText = quota ? stripVTControlCharacters(quota) : "";
      const moveQuota = quotaText === quotaPrefix || quotaText.startsWith(`${quotaPrefix} `);
      const speed = statuses.get("token-throughput");
      const modelParts = [theme.style(label, {
        fg: theme.appearance === "light" ? rgbColor(3, 105, 161) : rgbColor(56, 189, 248),
      }), moveQuota && quota ? cleanStatus(quota) : "", speed ? cleanStatus(speed) : ""];
      let modelLine = modelParts.filter(Boolean).join(" • ");
      if (model.provider === "openai-codex" && moveQuota) {
        const meteredParts = [...modelParts];
        meteredParts[1] = quotaMeter(modelParts[1], theme);
        const meteredLine = meteredParts.filter(Boolean).join(" • ");
        if (visibleWidth(meteredLine) <= width) modelLine = meteredLine;
      }
      const activityKeys = ["activity-summary", "subagent-count"];
      const activityLine = activityKeys.map((key) => statuses.get(key))
        .filter((value): value is string => Boolean(value))
        .map(cleanStatus).filter(Boolean).join(" • ");
      const remaining = Array.from(statuses.entries())
        .filter(([key]) => !activityKeys.includes(key) && key !== "token-throughput" && key !== "worktree" && !(moveQuota && key === "usage"))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => cleanStatus(value))
        .filter(Boolean);
      lines[1] = sliceByColumn(lines[1], 0, visibleWidth(stripVTControlCharacters(lines[1]).slice(0, boundary)));
      const stats = stripVTControlCharacters(lines[1]);
      const context = /(?<usage>\d+(?:\.\d+)?%|\?)\/(?<limit>[\d.]+[kM]?)/.exec(stats);
      if (context?.groups) {
        const estimate = context.groups.usage === "?" ? estimatedPercent(this) : undefined;
        const percent = estimate ?? (context.groups.usage === "?" ? undefined : Number.parseFloat(context.groups.usage));
        const usageText = estimate === undefined ? context.groups.usage : `~${estimate.toFixed(1)}%`;
        const filled = percent === undefined ? 0 : Math.round(Math.max(0, Math.min(100, percent)) / 10);
        const bar = percent === undefined ? "??????????" : "█".repeat(filled) + "░".repeat(10 - filled);
        const color = percent === undefined ? "muted" : percent > 90 ? "error" : percent > 70 ? "warning" : "accent";
        const start = visibleWidth(stats.slice(0, context.index));
        const end = start + visibleWidth(context[0]);
        lines[1] = sliceByColumn(lines[1], 0, start)
          + theme.fg(color, `Context ${bar} ${usageText} (${context.groups.limit})`)
          + sliceByColumn(lines[1], end, visibleWidth(stats));
      }
      const bgLines = ((globalThis as unknown as RunningBgGlobal)[runningBgKey] ?? []).map((task) => {
        // Being in the dock is the running state; stopping and matched are alive but not plainly running, as bg_status renders them.
        const state = task.state === "stopping" || task.state === "matched" ? ` ${task.state}` : "";
        const suffix = theme.fg("dim", `${formatUptime(Date.now() - task.startedAt)}${state}`);
        const head = theme.fg("accent", `bg${task.id.replace(/^bg-/, "")} \u25C6 `) + task.label;
        // The time stays visible beside any label: the label truncates into the
        // space left by the suffix, not the whole row off its edge.
        const room = width - visibleWidth(suffix) - 1;
        return room > 0 ? truncateToWidth(head, room, "") + " " + suffix : truncateToWidth(head + " " + suffix, width, "...");
      });
      return [modelLine, lines[1], lines[0], ...(activityLine ? [activityLine] : []), ...(remaining.length ? [remaining.join(" • ")] : []), ...bgLines]
        .map((line) => truncateToWidth(line, width, "..."));
    };
    prototype[patchKey] = true;
  });

  pi.on("session_shutdown", () => {
    delete (globalThis as unknown as ThemeState)[themeKey];
  });
}
