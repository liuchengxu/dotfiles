import { stripVTControlCharacters } from "node:util";
import { FooterComponent, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { rgbColor, sliceByColumn, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { sessionUptimeLabel } from "./session-uptime.ts";

type Model = { provider: string; id: string; reasoning?: boolean };
type Footer = {
  render(width: number): string[];
  footerData: { getExtensionStatuses(): ReadonlyMap<string, string> };
  session: {
    state: { model?: Model; thinkingLevel: string };
    routedModel?: { model: Model; thinkingLevel?: string };
    sessionManager: { getSessionName(): string | undefined; getSessionId(): string };
  };
  [key: symbol]: unknown;
};
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

      const model = this.session.state.model;
      let label = `(${model.provider}) ${model.id}`;
      if (model.reasoning) label += ` • ${this.session.state.thinkingLevel === "off" ? "thinking off" : this.session.state.thinkingLevel}`;
      const routed = this.session.routedModel;
      if (routed) label += ` → ${routed.model.id}${routed.thinkingLevel ? ` • ${routed.thinkingLevel}` : ""}`;
      const statuses = this.footerData.getExtensionStatuses();
      const quota = statuses.get("usage");
      const quotaPrefix = QUOTA_PREFIX[model.provider] ?? model.provider;
      const quotaText = quota ? stripVTControlCharacters(quota) : "";
      const moveQuota = quotaText === quotaPrefix || quotaText.startsWith(`${quotaPrefix} `);
      const cleanStatus = (value: string): string => value.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
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
        .filter(([key]) => !activityKeys.includes(key) && key !== "token-throughput" && !(moveQuota && key === "usage"))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => cleanStatus(value))
        .filter(Boolean);
      lines[1] = sliceByColumn(lines[1], 0, visibleWidth(stripVTControlCharacters(lines[1]).slice(0, boundary)));
      const stats = stripVTControlCharacters(lines[1]);
      const context = /(?<usage>\d+(?:\.\d+)?%|\?)\/(?<limit>[\d.]+[kM]?)/.exec(stats);
      if (context?.groups) {
        const percent = context.groups.usage === "?" ? undefined : Number.parseFloat(context.groups.usage);
        const filled = percent === undefined ? 0 : Math.round(Math.max(0, Math.min(100, percent)) / 10);
        const bar = percent === undefined ? "??????????" : "█".repeat(filled) + "░".repeat(10 - filled);
        const color = percent === undefined ? "muted" : percent > 90 ? "error" : percent > 70 ? "warning" : "accent";
        const start = visibleWidth(stats.slice(0, context.index));
        const end = start + visibleWidth(context[0]);
        lines[1] = sliceByColumn(lines[1], 0, start)
          + theme.fg(color, `Context ${bar} ${context.groups.usage} (${context.groups.limit})`)
          + sliceByColumn(lines[1], end, visibleWidth(stats));
      }
      return [modelLine, lines[1], lines[0], ...(activityLine ? [activityLine] : []), ...(remaining.length ? [remaining.join(" • ")] : [])]
        .map((line) => truncateToWidth(line, width, "..."));
    };
    prototype[patchKey] = true;
  });

  pi.on("session_shutdown", () => {
    delete (globalThis as unknown as ThemeState)[themeKey];
  });
}
