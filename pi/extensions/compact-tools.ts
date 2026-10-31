import { type ExtensionAPI, UserMessageComponent } from "@earendil-works/pi-coding-agent";
import { Box, Markdown } from "@earendil-works/pi-tui";

function compactUserMessages(): void {
  const patchKey = Symbol.for("compact-tools.user-message-padding-v3");
  const prototype = UserMessageComponent.prototype as unknown as {
    rebuild(this: UserMessageComponent): void;
    [key: symbol]: unknown;
  };
  if (prototype[patchKey]) return;

  const rebuild = prototype.rebuild;
  prototype.rebuild = function rebuildCompactUserMessage(this: UserMessageComponent): void {
    rebuild.call(this);
    const content = (this as unknown as { children: unknown[] }).children[0];
    // Pi 1.0 moved the padding from a wrapping Box into Markdown itself.
    if (!(content instanceof Box) && !(content instanceof Markdown)) return;

    (content as unknown as { paddingY: number }).paddingY = 0;
    // The Markdown's defaultTextStyle carries the theme's userMessageBg
    // closure: keep it, so the panel color comes from the theme, not here.
    content.invalidate();
  };
  prototype[patchKey] = true;
}

export default function compactTools(pi: ExtensionAPI): void {
  compactUserMessages();
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setWorkingIndicator({ frames: [ctx.ui.theme.fg("dim", "●")] });
  });
}
