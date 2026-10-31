import { stripVTControlCharacters } from "node:util";
import { FooterComponent, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { rgbColor, truncateToWidth } from "@earendil-works/pi-tui";

type HighlightState = { [key: symbol]: (() => ExtensionContext["ui"]["theme"]) | undefined };
const themeKey = Symbol.for("session-name-highlight.theme");

export default function sessionNameHighlight(pi: ExtensionAPI): void {
  const patchKey = Symbol.for("session-name-highlight.footer-v2");
  type Footer = {
    render(width: number): string[];
    session: { sessionManager: { getSessionName(): string | undefined; getSessionId(): string } };
    [key: symbol]: unknown;
  };
  const prototype = FooterComponent.prototype as unknown as Footer;
  if (!prototype[patchKey]) {
    const render = prototype.render;
    prototype.render = function renderHighlightedSession(this: Footer, width: number): string[] {
      const lines = render.call(this, width);
      const theme = (globalThis as unknown as HighlightState)[themeKey]?.();
      if (!theme || !lines[0]) return lines;

      const style = {
        fg: theme.appearance === "light" ? rgbColor(126, 34, 206) : rgbColor(192, 132, 252),
        bold: true,
      };
      const name = this.session.sessionManager.getSessionName();
      if (!name) {
        const label = `Session …${this.session.sessionManager.getSessionId().slice(-8)}`;
        lines[0] = truncateToWidth(`${lines[0]} • ${theme.style(label, style)}`, width, "...");
        return lines;
      }

      const marker = lines[0].lastIndexOf(" • ");
      if (marker < 0) return lines;
      const fragment = stripVTControlCharacters(lines[0].slice(marker + 3));
      if (!fragment || !name.startsWith(fragment.replace(/\.\.\.$/, ""))) return lines;

      // Style only the already-rendered name so native truncation and footer statistics remain intact.
      const start = lines[0].indexOf(fragment, marker + 3);
      if (start < 0) return lines;
      lines[0] = lines[0].slice(0, start) + theme.style(fragment, style) + lines[0].slice(start + fragment.length);
      return lines;
    };
    prototype[patchKey] = true;
  }

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    (globalThis as unknown as HighlightState)[themeKey] = () => ctx.ui.theme;
    ctx.ui.setStatus("session-name", undefined);
  });
  pi.on("session_shutdown", () => {
    delete (globalThis as unknown as HighlightState)[themeKey];
  });
}
