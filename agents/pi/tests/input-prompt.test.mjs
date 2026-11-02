import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
	"@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
} });
const { default: extension } = await jiti.import(new URL("../extensions/input-prompt.ts", import.meta.url).pathname);
const { CustomEditor, InteractiveMode, initTheme } = await jiti.import("@earendil-works/pi-coding-agent");

// setCustomEditorComponent reads pi's shared editor theme.
initTheme();
extension();
extension();

const tui = { requestRender() {}, terminal: { rows: 24, columns: 40 } };
const theme = { borderColor: (text) => text, selectList: {} };
const keybindings = { matches: () => false };
const strip = (line) => line.replace(/\x1b_[^\x07]*\x07/g, "");

test("an editor subclass made after the extension loads still shows the marker", () => {
	// pi-prompt-suggester installs a subclass like this one after its async start.
	class LateEditor extends CustomEditor {
		render(width) {
			return super.render(width);
		}
	}
	const editor = new LateEditor(tui, theme, keybindings, { paddingX: 1 });
	editor.setText("hello");
	assert.match(strip(editor.render(40)[1]), /^> hello/);
});

test("an editor from another CustomEditor copy is marked when pi installs it", () => {
	// pi-prompt-suggester resolves its own bundled pi, so its editor is not a subclass of this CustomEditor.
	class ForeignEditor {
		paddingX = 1;
		text = "";
		setText(text) { this.text = text; }
		getText() { return this.text; }
		getPaddingX() { return this.paddingX; }
		setPaddingX(value) { this.paddingX = value; }
		render(width) { return ["─".repeat(width), " ".repeat(this.paddingX) + this.text, "─".repeat(width)]; }
	}
	const mode = {
		editor: new CustomEditor(tui, theme, keybindings),
		defaultEditor: new CustomEditor(tui, theme, keybindings),
		extensionDialogs: [],
		disposeActiveSelector() {},
		editorContainer: { clear() {}, addChild() {} },
		ui: { setFocus() {}, requestRender() {} },
	};
	InteractiveMode.prototype.setCustomEditorComponent.call(mode, () => new ForeignEditor());
	mode.editor.setText("hello");
	assert.ok(mode.editor instanceof ForeignEditor);
	assert.equal(mode.editor.render(40)[1], "> hello");
});

test("a narrow editor is left alone", () => {
	const editor = new CustomEditor(tui, theme, keybindings, { paddingX: 2 });
	editor.setText("hi");
	assert.match(strip(editor.render(40)[1]), /^> hi/);
	assert.doesNotMatch(strip(editor.render(4)[1] ?? ""), />/);
});
