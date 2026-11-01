import { CustomEditor, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { EditorComponent } from "@earendil-works/pi-tui";

type EditorFactory = NonNullable<ReturnType<ExtensionContext["ui"]["getEditorComponent"]>>;
type DecoratedFactory = EditorFactory & { [wrappedFactory]?: EditorFactory };
const wrappedFactory = Symbol.for("pi.input-prompt.wrapped-factory");

/** Cooperating decorators can retain ownership of their underlying editor. */
export function editorFactoryContains(factory: EditorFactory | undefined, target: EditorFactory | undefined): boolean {
	const seen = new Set<EditorFactory>();
	for (let current = factory; current && !seen.has(current); current = (current as DecoratedFactory)[wrappedFactory]) {
		if (current === target) return true;
		seen.add(current);
	}
	return false;
}

/** Display `❯` beside live input without replacing the active editor. */
export function withInputPrompt<T extends EditorComponent>(editor: T, padding = 2): T {
	const render = editor.render.bind(editor);
	const setPaddingX = editor.setPaddingX?.bind(editor);
	const borderColor = editor.borderColor?.bind(editor);
	return new Proxy(editor, {
		get(target, property) {
			if (property === "render") return (width: number) => {
				setPaddingX?.(Math.max(padding, (target as T & { getPaddingX?: () => number }).getPaddingX?.() ?? 0));
				const lines = render(width);
				if (width >= 5 && lines[1]?.startsWith(" ".repeat(padding))) {
					lines[1] = (borderColor?.("❯") ?? "❯") + lines[1].slice(1);
				}
				return lines;
			};
			if (property === "setPaddingX") return (value: number) => setPaddingX?.(Math.max(padding, value));
			const value = Reflect.get(target, property, target);
			return typeof value === "function" ? value.bind(target) : value;
		},
		set(target, property, value) {
			return Reflect.set(target, property, value, target);
		},
	});
}

export default function inputPrompt(pi: ExtensionAPI): void {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		const previous = ctx.ui.getEditorComponent();
		const installed: NonNullable<typeof previous> = (tui, theme, keybindings) =>
			withInputPrompt(previous?.(tui, theme, keybindings) ?? new CustomEditor(tui, theme, keybindings));
		(installed as DecoratedFactory)[wrappedFactory] = previous;
		ctx.ui.setEditorComponent(installed);
		pi.on("session_shutdown", (_event, shutdownCtx) => {
			if (shutdownCtx.mode === "tui" && shutdownCtx.ui.getEditorComponent() === installed) {
				// Factories from the old runtime are stale after session replacement.
				shutdownCtx.ui.setEditorComponent(undefined);
			}
		});
	});
}
