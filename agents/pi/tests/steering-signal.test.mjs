import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
	"@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
	"@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { default: extension } = await jiti.import(new URL("../extensions/steering-signal.ts", import.meta.url).pathname);
const { InteractiveMode, initTheme } = await jiti.import("@earendil-works/pi-coding-agent");

// Pi's stock display paints with the shared global theme; the fallback test runs it for real.
initTheme();

// Loading the extension applies the prototype patch once; later factory calls are guarded.
extension({ on() {} });
const display = InteractiveMode.prototype.updatePendingMessagesDisplay;
assert.equal(typeof display, "function", "the patch kept a callable updatePendingMessagesDisplay");

// Real SGR codes, so TruncatedText measures the styled text the way it will in the TUI.
const theme = { fg: (color, text) => (color === "accent" ? `\x1b[36m${text}\x1b[0m` : `\x1b[2m${text}\x1b[0m`) };
const strip = (line) => line.replace(/\x1b\[[0-9;]*m/g, "").trim();

/** A host with only the internals the patched display reads. */
function host({ steering = [], followUp = [], key = "Alt+↑" } = {}) {
	const keyActions = [];
	const container = {
		children: [],
		clear() { this.children.length = 0; },
		addChild(child) { this.children.push(child); },
	};
	return {
		pendingMessagesContainer: container,
		keyActions,
		getAllQueuedMessages() { return { steering, followUp }; },
		getAppKeyDisplay(action) { keyActions.push(action); return key; },
		createExtensionUIContext() { return { theme }; },
	};
}

// 120 columns fit every hint wording; narrower render checks pass an explicit width.
const pendingLines = (h, width = 120) => h.pendingMessagesContainer.children.flatMap((child) => child.render(width));

test("a steering message gets one accent line; the hint says when it is sent", () => {
	const h = host({ steering: ["check PR 880"] });
	display.call(h);
	assert.deepEqual(pendingLines(h).map(strip), [
		"",
		"⧗ Steering: check PR 880",
		"↳ sent before the next model request · Alt+↑ to edit queued messages",
	]);
	assert.ok(pendingLines(h)[1].includes("\x1b[36m⧗ Steering:\x1b[0m check PR 880"), "label carries the accent color");
	assert.ok(pendingLines(h)[2].includes("\x1b[2m↳"), "the hint stays dim");
});

test("a follow-up message says it waits for the agent to finish", () => {
	const h = host({ followUp: ["run the tests"] });
	display.call(h);
	assert.deepEqual(pendingLines(h).map(strip), [
		"",
		"⧗ Follow-up: run the tests",
		"↳ sent when the agent finishes · Alt+↑ to edit queued messages",
	]);
});

test("both queues render, steering before follow-up", () => {
	const h = host({ steering: ["first"], followUp: ["second"] });
	display.call(h);
	assert.deepEqual(pendingLines(h).map(strip), [
		"",
		"⧗ Steering: first",
		"⧗ Follow-up: second",
		"↳ steering before the next model request, follow-ups when the agent finishes · Alt+↑ to edit queued messages",
	]);
});

test("the hint names only the timing of the kinds present", () => {
	const hintFor = (h) => {
		display.call(h);
		return strip(pendingLines(h).at(-1));
	};
	assert.equal(hintFor(host({ steering: ["a"] })), "↳ sent before the next model request · Alt+↑ to edit queued messages");
	assert.equal(hintFor(host({ followUp: ["b"] })), "↳ sent when the agent finishes · Alt+↑ to edit queued messages");
	assert.equal(
		hintFor(host({ steering: ["a"], followUp: ["b"] })),
		"↳ steering before the next model request, follow-ups when the agent finishes · Alt+↑ to edit queued messages",
	);
});

test("at 48 columns the message body stays visible, not just the label", () => {
	const h = host({ steering: ["DO NOT DELETE DATABASE"] });
	display.call(h);
	const [line] = pendingLines(h, 48).slice(1);
	assert.equal(strip(line), "⧗ Steering: DO NOT DELETE DATABASE");

	const long = host({ followUp: ["DO NOT DELETE DATABASE until the nightly verify has passed twice"] });
	display.call(long);
	const [longLine] = pendingLines(long, 48).slice(1);
	assert.ok(strip(longLine).startsWith("⧗ Follow-up: DO NOT DELETE DATABASE until"), "the message start survives truncation");
	assert.ok(!strip(longLine).includes("twice"), "only what fits is shown");
});

test("a multi-line message shows only its first line", () => {
	const h = host({ steering: ["first line of the steer\nsecond line"] });
	display.call(h);
	assert.deepEqual(pendingLines(h).map(strip), [
		"",
		"⧗ Steering: first line of the steer",
		"↳ sent before the next model request · Alt+↑ to edit queued messages",
	]);
});

test("an empty queue clears the container and adds nothing", () => {
	const h = host();
	display.call(h);
	assert.equal(h.pendingMessagesContainer.children.length, 0);
});

test("the dequeue key comes from pi's keymap, not a hard-coded binding", () => {
	const h = host({ steering: ["x"], key: "C-x 9" });
	display.call(h);
	assert.deepEqual(h.keyActions, ["app.message.dequeue"]);
	const hint = pendingLines(h).at(-1);
	assert.ok(hint.includes("C-x 9"), "hint shows the configured key");
	assert.ok(!hint.includes("Alt+"), "no hard-coded Alt+Up");
});

test("a broken dependency falls back to pi's stock display", () => {
	const h = host({ steering: ["check PR 880"] });
	h.createExtensionUIContext = () => { throw new Error("renamed in a pi update"); };
	display.call(h);
	const lines = pendingLines(h).map(strip);
	assert.ok(lines.some((line) => /Steering: check PR 880/.test(line)), "pi's original lines render");
	assert.ok(!lines.some((line) => line.includes("⧗")), "the replacement did not run");
});

/** A loaded extension whose footer status the test controls. */
function session({ statusMs = 10, setStatus } = {}, mode = "tui") {
	const handlers = new Map();
	const statuses = [];
	const theme = { fg: (color, text) => `<${color}>${text}</${color}>` };
	const ctx = { mode, ui: { theme, setStatus: setStatus ?? ((key, text) => statuses.push([key, text])) } };
	extension({ on(event, handler) { handlers.set(event, handler); } }, { statusMs });
	const emit = (event, payload = {}) => handlers.get(event)?.(payload, ctx);
	const userMessage = () => ({ role: "user", content: [{ type: "text", text: "hi" }], timestamp: 0 });
	return { statuses, emit, userMessage };
}

const deliveredStatus = "<accent>Queued message delivered to the agent</accent>";

test("the prompt that opens a run is not a delivery; a queued message is, and the status clears", async () => {
	const s = session();
	s.emit("before_agent_start", { type: "before_agent_start", messageType: "user", prompt: "fix it" });
	s.emit("message_start", { message: s.userMessage() });
	s.emit("message_start", { message: { role: "assistant", content: [] } });
	assert.equal(s.statuses.length, 0, "the opening prompt and assistant messages report nothing");
	s.emit("message_start", { message: s.userMessage() });
	assert.deepEqual(s.statuses, [["steering-signal", deliveredStatus]]);
	await sleep(50);
	assert.deepEqual(s.statuses.at(-1), ["steering-signal", undefined], "the status clears after a few seconds");
});

test("a notification-started run's first message is not a delivery", () => {
	const s = session();
	s.emit("before_agent_start", { type: "before_agent_start", messageType: "custom" });
	s.emit("message_start", { message: { role: "custom", customType: "wake", content: [], display: true, timestamp: 0 } });
	assert.equal(s.statuses.length, 0, "the custom trigger message reports nothing");
	s.emit("message_start", { message: s.userMessage() });
	assert.equal(s.statuses.length, 1, "a steer delivered inside that run reports");
});

test("a follow-up drained after settle, with no new before_agent_start, reports delivery", () => {
	const s = session();
	s.emit("before_agent_start", { type: "before_agent_start", messageType: "user", prompt: "fix it" });
	s.emit("message_start", { message: s.userMessage() });
	s.emit("message_start", { message: s.userMessage() });
	assert.equal(s.statuses.length, 1);
});

test("session_shutdown stops the pending clear", async () => {
	const s = session();
	s.emit("before_agent_start", { type: "before_agent_start", messageType: "user" });
	s.emit("message_start", { message: s.userMessage() });
	s.emit("message_start", { message: s.userMessage() });
	s.emit("session_shutdown", { type: "session_shutdown", reason: "quit" });
	await sleep(50);
	assert.deepEqual(s.statuses, [["steering-signal", deliveredStatus]]);
});

test("print and rpc modes show no footer status", () => {
	for (const mode of ["print", "rpc"]) {
		const s = session({}, mode);
		s.emit("before_agent_start", { type: "before_agent_start", messageType: "user" });
		s.emit("message_start", { message: s.userMessage() });
		s.emit("message_start", { message: s.userMessage() });
		assert.equal(s.statuses.length, 0, mode);
	}
});

test("a second delivery within the window restarts the clear timer", async () => {
	const s = session({ statusMs: 150 });
	s.emit("before_agent_start", { type: "before_agent_start", messageType: "user", prompt: "fix it" });
	s.emit("message_start", { message: s.userMessage() });
	s.emit("message_start", { message: s.userMessage() }); // delivery 1: clears at ~150ms
	await sleep(75);
	s.emit("message_start", { message: s.userMessage() }); // delivery 2 restarts: clears at ~225ms
	await sleep(115); // ~190ms: past delivery 1's deadline, before delivery 2's
	assert.equal(s.statuses.length, 2, "both deliveries set the status");
	assert.ok(!s.statuses.some(([, text]) => text === undefined), "the first deadline passed; the status is still set");
	await sleep(90); // ~280ms: past the restarted deadline
	assert.deepEqual(s.statuses.at(-1), ["steering-signal", undefined], "the status clears at the later deadline");
});

test("a stale ctx whose setStatus throws neither escapes the handler nor leaves a timer", async () => {
	const calls = [];
	const s = session({ statusMs: 20, setStatus: (key, text) => {
		calls.push([key, text]);
		throw new Error("stale ctx");
	} });
	s.emit("before_agent_start", { type: "before_agent_start", messageType: "user", prompt: "fix it" });
	s.emit("message_start", { message: s.userMessage() });
	assert.doesNotThrow(() => s.emit("message_start", { message: s.userMessage() }), "the handler swallows the stale ctx");
	await sleep(60);
	assert.deepEqual(calls, [["steering-signal", deliveredStatus]], "only the set ran; no later clear proves no timer is running");
});

test("the clear firing against a stale ctx is swallowed", async () => {
	const calls = [];
	const s = session({ statusMs: 15, setStatus: (key, text) => {
		calls.push([key, text]);
		if (text === undefined) throw new Error("stale ctx");
	} });
	s.emit("message_start", { message: s.userMessage() });
	await sleep(60);
	assert.deepEqual(calls.map(([, text]) => text === undefined), [false, true], "the clear attempt ran and threw inside the extension");
});
