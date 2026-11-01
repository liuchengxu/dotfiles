import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type Theme = { fg(color: "muted" | "borderMuted", text: string): string };

// Reuses the working-status border style: "── message ──────" across the full width.
class DashedStatusLine extends Text {
  constructor(
    private readonly message: string,
    private readonly theme: Theme,
  ) {
    super("", 1, 0);
  }

  override render(width: number): string[] {
    if (width <= 0) return super.render(width);
    const label = this.theme.fg("muted", this.message);
    const labelWidth = visibleWidth(this.message);
    const line = labelWidth + 5 <= width
      ? this.theme.fg("borderMuted", "── ") + label + this.theme.fg("borderMuted", ` ${"─".repeat(width - labelWidth - 4)}`)
      : this.theme.fg("borderMuted", "── ") + truncateToWidth(label, width - 3, "…");
    return ["", line];
  }
}

export default function modelSwitchNotice(pi: ExtensionAPI): void {
  pi.registerEntryRenderer<{ text: string }>("model-switch-notice", (entry, _options, theme) =>
    new DashedStatusLine(entry.data.text, theme),
  );
  pi.on("model_select", (event, ctx) => {
    const previous = event.previousModel;
    if (!ctx.hasUI || event.source === "restore" || !previous) return;
    if (previous.provider === event.model.provider && previous.id === event.model.id) return;

    const providerChanged = previous.provider !== event.model.provider;
    const from = `${previous.name || previous.id}${providerChanged ? ` (${previous.provider})` : ""}`;
    const to = `${event.model.name || event.model.id}${providerChanged ? ` (${event.model.provider})` : ""}`;
    pi.appendEntry("model-switch-notice", { text: `Model changed: ${from} → ${to}` });
  });
}
