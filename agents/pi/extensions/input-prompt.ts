import { CustomEditor, InteractiveMode } from "@earendil-works/pi-coding-agent";

const patchKey = Symbol.for("pi.input-prompt.v2");
const marker = ">";
const padding = 2;

type PromptEditor = {
	render(width: number): string[];
	getPaddingX?: () => number;
	setPaddingX?: (value: number) => void;
	borderColor?: (text: string) => string;
};
type Mode = { editor?: PromptEditor; setCustomEditorComponent?: (factory: unknown) => void };

function withMarker(render: PromptEditor["render"]): PromptEditor["render"] {
	return function (this: PromptEditor, width: number): string[] {
		if ((this.getPaddingX?.() ?? 0) < padding) this.setPaddingX?.(padding);
		const lines = render.call(this, width);
		if (width >= 5 && lines[1]?.startsWith(" ".repeat(padding))) {
			lines[1] = (this.borderColor?.(marker) ?? marker) + lines[1].slice(1);
		}
		return lines;
	};
}

/**
 * Display `>` beside live input. The prototype patch covers pi's editor and every subclass of pi's
 * `CustomEditor`, including one a package installs later. pi-prompt-suggester extends the `CustomEditor` of
 * its own bundled pi copy instead, so editors pi installs from another class are marked one by one.
 */
export default function inputPrompt(): void {
	const prototype = CustomEditor.prototype as unknown as PromptEditor & { [patchKey]?: true };
	if (prototype[patchKey]) return;
	prototype[patchKey] = true;
	prototype.render = withMarker(prototype.render);
	const mode = InteractiveMode.prototype as unknown as Mode;
	const setCustomEditorComponent = mode.setCustomEditorComponent;
	if (typeof setCustomEditorComponent !== "function") return;
	mode.setCustomEditorComponent = function (this: Mode, factory: unknown) {
		setCustomEditorComponent.call(this, factory);
		const editor = this.editor;
		if (editor && !(editor instanceof CustomEditor) && typeof editor.render === "function") {
			editor.render = withMarker(editor.render);
		}
	};
}
