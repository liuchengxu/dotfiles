/**
 * ask_user: Claude Code's AskUserQuestion for pi. The model asks one to four
 * questions, each with two to four labelled options; the user picks with the
 * arrow keys or a number, toggles with Space on a multi-select question, or
 * writes an answer under "Other", which is always added. Several questions
 * get a tab bar and a Submit tab. Adapted from pi's questionnaire example.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

const HEADER_CHARS = 12;
const OTHER = "Other (type your own answer)";

interface Option {
	label: string;
	description?: string;
}

interface Question {
	question: string;
	header: string;
	options: Option[];
	multiSelect: boolean;
}

interface Answer {
	labels: string[];
	custom?: string;
}

interface AskResult {
	questions: Question[];
	answers: (Answer | undefined)[];
	cancelled: boolean;
}

const parameters = {
	type: "object",
	properties: {
		questions: {
			type: "array",
			minItems: 1,
			maxItems: 4,
			description: "One to four questions to ask together",
			items: {
				type: "object",
				properties: {
					question: { type: "string", description: "The complete question, ending with a question mark" },
					header: { type: "string", description: `A short tab label, at most ${HEADER_CHARS} characters, for example "Approach"` },
					options: {
						type: "array",
						minItems: 2,
						maxItems: 4,
						description: "Two to four distinct choices; an Other option for a written answer is added automatically",
						items: {
							type: "object",
							properties: {
								label: { type: "string", description: "The choice, one to five words" },
								description: { type: "string", description: "What the choice means or implies" },
							},
							required: ["label"],
							additionalProperties: false,
						},
					},
					multiSelect: { type: "boolean", description: "Allow several choices (default false)" },
				},
				required: ["question", "header", "options"],
				additionalProperties: false,
			},
		},
	},
	required: ["questions"],
	additionalProperties: false,
} as const;

/** The model-facing answer: JSON, so quotes, newlines, and a label that
 * contains a comma cannot blur where one choice ends. */
function answerJson(question: Question, answer: Answer): string {
	const choices = [...answer.labels, ...(answer.custom ? [answer.custom] : [])];
	return JSON.stringify(question.multiSelect ? choices : choices[0]);
}

function answerText(answer: Answer): string {
	return [...answer.labels, ...(answer.custom ? [answer.custom] : [])].join(", ");
}

function text(message: string, details: AskResult, isError = false) {
	return { content: [{ type: "text" as const, text: message }], details, ...(isError && { isError }) };
}

export default function askUser(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask the user",
		description:
			"Ask the user one to four multiple-choice questions and wait for the answers. Each question has two to four options; the user can also write their own answer.",
		promptGuidelines: [
			"Use ask_user only when you are blocked on a decision that is the user's to make and that the request, the code, or a sensible default cannot settle. Otherwise pick the conventional option, say so, and continue.",
			"In ask_user, put the option you recommend first and end its label with \" (Recommended)\". Do not add an Other option; one is added. Make each question stand on its own, because the user may see only the question.",
			"Do not use ask_user to ask whether to proceed or whether a plan is ready.",
		],
		parameters,

		async execute(_toolCallId, input, signal, _onUpdate, ctx) {
			const questions: Question[] = ((input as { questions?: Partial<Question>[] }).questions ?? []).map((q, index) => ({
				question: String(q.question ?? ""),
				header: String(q.header || `Q${index + 1}`).slice(0, HEADER_CHARS),
				options: (q.options ?? []).map((option) => ({ label: String(option.label), description: option.description })),
				multiSelect: q.multiSelect === true,
			}));
			const empty: AskResult = { questions, answers: [], cancelled: true };
			if (questions.length < 1 || questions.length > 4 || questions.some((q) => q.options.length < 2 || q.options.length > 4)) {
				return text("ask_user needs one to four questions, each with two to four options.", empty, true);
			}
			if (ctx?.mode !== "tui") {
				return text("No interactive UI in this mode: ask the question in plain text instead.", empty, true);
			}

			const dismissed = "The user dismissed the questions without answering. Dismissal approves nothing: do not go ahead with anything that needed these answers.";
			if (signal?.aborted) return text(dismissed, empty);
			// The picker holds the run until done() is called, so an abort must
			// call it too or the run waits for a key press.
			const result = await ctx.ui.custom<AskResult>((tui, theme, _keybindings, done) => {
				const abort = (): void => done(empty);
				signal?.addEventListener("abort", abort, { once: true });
				return questionnaire(questions, tui, theme, (value) => {
					signal?.removeEventListener("abort", abort);
					done(value);
				});
			});
			if (!result || result.cancelled) return text(dismissed, result ?? empty);
			const lines = questions.map((q, index) => `${JSON.stringify(q.question)} = ${answerJson(q, result.answers[index]!)}`);
			return text(`The user answered:\n${lines.join("\n")}`, result);
		},

		renderCall(args, theme) {
			const qs = ((args as { questions?: Partial<Question>[] }).questions ?? []);
			const headers = qs.map((q) => q.header).filter(Boolean).join(", ");
			return new Text(`${theme.fg("toolTitle", "Ask")} ${theme.fg("muted", `${qs.length} question${qs.length === 1 ? "" : "s"}`)}${headers ? theme.fg("dim", ` (${headers})`) : ""}`, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as AskResult | undefined;
			if (!details || details.cancelled) {
				const first = result.content[0];
				return new Text(theme.fg("warning", details?.cancelled ? "Dismissed" : first?.type === "text" ? first.text : ""), 0, 0);
			}
			const lines = details.questions.map((q, index) => `${theme.fg("success", "✓")} ${theme.fg("accent", q.header)}: ${answerText(details.answers[index]!)}`);
			return new Text(lines.join("\n"), 0, 0);
		},
	});
}

type Theme = { fg(color: string, text: string): string; bg(color: string, text: string): string };

/** The interactive component; exported for tests. */
export function questionnaire(questions: Question[], tui: { requestRender(): void }, theme: Theme, done: (result: AskResult) => void) {
	const several = questions.length > 1;
	const submitTab = questions.length;
	const answers: (Answer | undefined)[] = questions.map(() => undefined);
	const toggled = questions.map(() => new Set<number>());
	let tab = 0;
	let cursor = 0;
	let writing = false;

	const editorTheme: EditorTheme = {
		borderColor: (s) => theme.fg("accent", s),
		selectList: {
			selectedPrefix: (t) => theme.fg("accent", t),
			selectedText: (t) => theme.fg("accent", t),
			description: (t) => theme.fg("muted", t),
			scrollInfo: (t) => theme.fg("dim", t),
			noMatch: (t) => theme.fg("warning", t),
		},
	};
	const editor = new Editor(tui as never, editorTheme);

	const refresh = (): void => tui.requestRender();
	const finish = (cancelled: boolean): void => done({ questions, answers, cancelled });
	const complete = (): boolean => answers.every(Boolean);
	const otherIndex = (): number => questions[tab]!.options.length;

	function advance(): void {
		if (!several) return finish(false);
		tab = answers.findIndex((answer) => !answer);
		if (tab === -1) tab = submitTab;
		cursor = 0;
		refresh();
	}

	function save(custom?: string): void {
		const q = questions[tab]!;
		const labels = q.multiSelect ? [...toggled[tab]!].sort((a, b) => a - b).map((i) => q.options[i]!.label) : custom === undefined ? [q.options[cursor]!.label] : [];
		answers[tab] = { labels, ...(custom && { custom }) };
		advance();
	}

	editor.onSubmit = (value) => {
		writing = false;
		editor.setText("");
		const written = value.trim();
		if (!written && !(questions[tab]!.multiSelect && toggled[tab]!.size > 0)) return refresh();
		save(written || undefined);
	};

	function choose(index: number): void {
		const q = questions[tab]!;
		if (index === otherIndex()) {
			cursor = index;
			writing = true;
			return refresh();
		}
		if (!q.multiSelect) {
			cursor = index;
			return save();
		}
		const set = toggled[tab]!;
		if (set.has(index)) set.delete(index);
		else set.add(index);
		// The saved answer no longer matches the boxes: confirm it again.
		answers[tab] = undefined;
		cursor = index;
		refresh();
	}

	function handleInput(data: string): void {
		if (writing) {
			if (matchesKey(data, Key.escape)) {
				writing = false;
				editor.setText("");
				return refresh();
			}
			editor.handleInput(data);
			return refresh();
		}
		if (several && (matchesKey(data, Key.tab) || matchesKey(data, Key.right))) {
			tab = (tab + 1) % (questions.length + 1);
			cursor = 0;
			return refresh();
		}
		if (several && (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left))) {
			tab = (tab + questions.length) % (questions.length + 1);
			cursor = 0;
			return refresh();
		}
		if (matchesKey(data, Key.escape)) return finish(true);
		if (tab === submitTab) {
			if (matchesKey(data, Key.enter) && complete()) finish(false);
			return;
		}
		const q = questions[tab]!;
		if (matchesKey(data, Key.up)) {
			cursor = Math.max(0, cursor - 1);
			return refresh();
		}
		if (matchesKey(data, Key.down)) {
			cursor = Math.min(otherIndex(), cursor + 1);
			return refresh();
		}
		const digit = /^[1-9]$/.test(data) ? Number(data) - 1 : -1;
		if (digit >= 0 && digit <= otherIndex()) return choose(digit);
		if (q.multiSelect && data === " " && cursor < otherIndex()) return choose(cursor);
		if (matchesKey(data, Key.enter)) {
			if (cursor === otherIndex() || !q.multiSelect) return choose(cursor);
			if (toggled[tab]!.size > 0) save();
		}
	}

	function render(width: number): string[] {
		const w = Math.max(1, width);
		const lines: string[] = [];
		const wrap = (prefix: string, body: string): void => {
			const pad = visibleWidth(prefix);
			if (pad >= w) return void lines.push(...wrapTextWithAnsi(prefix + body, w));
			wrapTextWithAnsi(body, w - pad).forEach((line, i) => lines.push(`${i === 0 ? prefix : " ".repeat(pad)}${line}`));
		};
		lines.push(theme.fg("accent", "─".repeat(w)));
		if (several) {
			const tabs = questions.map((q, i) => {
				const label = ` ${answers[i] ? "■" : "□"} ${q.header} `;
				return i === tab ? theme.bg("selectedBg", theme.fg("text", label)) : theme.fg(answers[i] ? "success" : "muted", label);
			});
			const submit = " ✓ Submit ";
			tabs.push(tab === submitTab ? theme.bg("selectedBg", theme.fg("text", submit)) : theme.fg(complete() ? "success" : "dim", submit));
			wrap(" ", tabs.join(" "));
			lines.push("");
		}
		if (tab === submitTab) {
			for (const [i, q] of questions.entries()) {
				wrap(" ", `${theme.fg("muted", `${q.header}: `)}${answers[i] ? answerText(answers[i]!) : theme.fg("warning", "unanswered")}`);
			}
			lines.push("");
			wrap(" ", complete() ? theme.fg("success", "Enter to submit · Esc to dismiss") : theme.fg("warning", "Answer every question to submit"));
		} else {
			const q = questions[tab]!;
			wrap(" ", theme.fg("text", q.question));
			lines.push("");
			[...q.options, { label: OTHER }].forEach((option: Option, i) => {
				const selected = i === cursor;
				const box = q.multiSelect && i < otherIndex() ? (toggled[tab]!.has(i) ? "[x] " : "[ ] ") : "";
				wrap(selected ? theme.fg("accent", "> ") : "  ", theme.fg(selected ? "accent" : "text", `${i + 1}. ${box}${option.label}`));
				if (option.description) wrap("     ", theme.fg("muted", option.description));
			});
			if (writing) {
				lines.push("");
				for (const line of editor.render(Math.max(1, w - 2))) lines.push(` ${line}`);
			}
			lines.push("");
			const keys = writing
				? "Enter to submit · Esc to go back"
				: [q.multiSelect ? "Space or number to toggle · Enter to confirm" : "↑↓ or number to choose · Enter to select", several ? "Tab for next question" : "", "Esc to dismiss"].filter(Boolean).join(" · ");
			wrap(" ", theme.fg("dim", keys));
		}
		lines.push(theme.fg("accent", "─".repeat(w)));
		return lines.map((line) => truncateToWidth(line, w));
	}

	return {
		render,
		handleInput,
		invalidate() {},
		// Pi sets focus on the component; the editor draws its cursor marker
		// (used for IME placement) only when focused.
		get focused() { return editor.focused; },
		set focused(value: boolean) { editor.focused = value; },
	};
}
