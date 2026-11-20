import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.env.PI_PACKAGE_ROOT ?? dirname(dirname(dirname(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()))));
const { createJiti } = await import(pathToFileURL(join(root, "node_modules/jiti/lib/jiti.mjs")));
const jiti = createJiti(import.meta.url, { alias: {
	"@earendil-works/pi-coding-agent": join(root, "dist/index.js"),
	"@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { applyComplete, applyStarted, clearRegistry, lastToolLine, prune, recordLaunch, subagentLines, visibleRows, workflowLabel, LINGER_MS, MAX_ROWS } = await jiti.import(new URL("../extensions/lib/subagent-runs.ts", import.meta.url).pathname);
const { refreshRunProgress, maybeBrief } = await jiti.import(new URL("../extensions/subagent-dock.ts", import.meta.url).pathname);
const { stripVTControlCharacters } = await import("node:util");

const theme = { fg: (_token, text) => text };
const row = (overrides = {}) => ({ id: "r1", agent: "worker", goal: "Probe the todo panel", startedAt: 1_000, state: "running", ...overrides });

test("a launch plus a started event yields a running row with the unredacted goal", () => {
	recordLaunch("call-1", "worker", "Investigate whether a pi extension\ncan customize the todo panel");
	applyStarted({ id: "run-9", agent: "worker", toolCallId: "call-1" });
	assert.deepEqual(visibleRows(1_000).map((entry) => [entry.id, entry.agent, entry.goal, entry.state]), [["run-9", "worker", "Investigate whether a pi extension", "running"]]);
});

test("the goal falls back to the agent chain when no tool call links the start", () => {
	applyStarted({ id: "run-10", agent: "reviewer", agents: ["worker", "reviewer"], chain: ["worker", "reviewer"] });
	assert.equal(visibleRows(1_000).find((entry) => entry.id === "run-10")?.goal, "worker→reviewer");
});

test("a completion lingers with its duration, then folds; failure marks the row", () => {
	applyStarted({ id: "run-11", agent: "worker" });
	applyComplete({ runId: "run-11", state: "complete", timestamp: 4_000 });
	assert.equal(visibleRows(4_000 + LINGER_MS - 1).find((entry) => entry.id === "run-11")?.state, "done");
	assert.equal(visibleRows(4_000 + LINGER_MS).find((entry) => entry.id === "run-11"), undefined, "past the linger the row folds");
	applyStarted({ id: "run-12", agent: "worker" });
	applyComplete({ runId: "run-12", state: "rejected", timestamp: 9_000 });
	assert.equal(visibleRows(9_000).find((entry) => entry.id === "run-12")?.state, "failed");
});

test("workflow-internal steps never earn a row, and a stopped run is not a success", () => {
	applyStarted({ id: "run-13", agent: "worker", parentWorkflowRunId: "wf-1" });
	assert.equal(visibleRows().find((entry) => entry.id === "run-13"), undefined, "an awaited child never appears");
	applyStarted({ id: "run-14", agent: "worker" });
	applyComplete({ runId: "run-14", state: "stopped", timestamp: 5_000 });
	assert.equal(visibleRows(5_000).find((entry) => entry.id === "run-14")?.state, "stopped");
	applyComplete({ runId: "run-14", state: "complete", timestamp: 20_000 });
	assert.equal(visibleRows(20_000).find((entry) => entry.id === "run-14")?.state, "stopped", "a replayed completion cannot flip the verdict");
});

test("prune drops lingered rows and stale launch labels; clear empties the registry", () => {
	clearRegistry();
	applyStarted({ id: "run-15", agent: "worker" });
	applyComplete({ runId: "run-15", state: "complete", timestamp: 1_000 });
	prune(1_000 + LINGER_MS);
	assert.equal(visibleRows(1_000 + LINGER_MS).length, 0);
	recordLaunch("call-stale", "worker", "never launched");
	prune(Date.now() + 3_600_000);
	clearRegistry();
	applyStarted({ id: "run-16", agent: "worker" });
	assert.equal(visibleRows().length, 1, "a fresh session starts empty");
});

test("lines carry agent, goal, and elapsed; terminal rows show their verdict", () => {
	const running = row();
	const done = row({ id: "r2", agent: "reviewer", goal: "Adjudicate findings", startedAt: 2_000, endedAt: 9_000, state: "done" });
	const lines = subagentLines([running, done], 80, theme, 10_000);
	assert.match(lines[0], /worker ◆ Probe the todo panel 9s/);
	assert.match(lines[1], /reviewer ◆ Adjudicate findings ✓ 7s/);
});

test("three rows render and the rest count", () => {
	const rows = Array.from({ length: 5 }, (_, i) => row({ id: `r${i}`, startedAt: i + 1 }));
	const lines = subagentLines(rows, 80, theme, 10_000);
	assert.equal(lines.length, MAX_ROWS + 1);
	assert.equal(lines.at(-1), "+2 more");
});

test("a cramped row keeps the time beside a truncated goal", () => {
	const line = subagentLines([row()], 24, theme, 60_000)[0];
	const plain = stripVTControlCharacters(line);
	assert.ok(plain.includes("59s"), `time survives: ${plain}`);
	assert.ok(plain.length <= 24, `fits the width: ${JSON.stringify(plain)}`);
});

test("lastToolLine names the newest call or result and redacts secrets", () => {
	const call = JSON.stringify({ type: "message", message: { role: "assistant", content: [
		{ type: "toolCall", name: "bash", arguments: { command: "ls -la /tmp", timeout: 20 } } ] } });
	assert.equal(lastToolLine(call), "bash ls -la /tmp");
	const result = JSON.stringify({ type: "message", message: { role: "toolResult", toolName: "read", content: [{ type: "text", text: "(50 lines truncated)" }] } });
	assert.equal(lastToolLine(`${call}\n${result}`), "read (50 lines truncated)", "a result outranks the earlier call");
	assert.equal(lastToolLine(`{"bad json\n${call}`), "bash ls -la /tmp", "a torn first line is skipped, and so is a trailing bad one");
	assert.equal(lastToolLine("thinking only\n{}"), undefined, "no tool record yields nothing");
	const secret = JSON.stringify({ type: "message", message: { role: "assistant", content: [
		{ type: "toolCall", name: "bash", arguments: { command: "curl https://user:hunter2@host/api" } } ] } });
	assert.equal(lastToolLine(secret), "bash curl https://<redacted>", "credentials never reach the dock");
});

test("a running row trails its goal with the live activity inside the width", () => {
	const line = subagentLines([row({ progress: "bash cargo test -p prover-service" })], 80, theme, 10_000)[0];
	const plain = stripVTControlCharacters(line);
	assert.match(plain, /Probe the todo panel · bash cargo test -p prover-service 9s/);
	const done = subagentLines([row({ progress: "bash cargo test", endedAt: 9_000, state: "done" })], 80, theme, 10_000)[0];
	assert.ok(!stripVTControlCharacters(done).includes("· "), "a settled row carries no live activity");
});

test("neither the goal nor the activity is ever cut mid-word", () => {
	const goal = "Investigate whether a pi extension can customize the todo panel rendering";
	const progress = "bash sleep 12; echo probe step 3 done";
	for (const width of [40, 47, 55, 60, 72]) {
		const plain = stripVTControlCharacters(subagentLines([row({ goal, progress })], width, theme, 60_000)[0]);
		assert.ok(plain.length <= width, `fits at ${width}: ${JSON.stringify(plain)}`);
		assert.ok(plain.includes("59s"), `time survives at ${width}: ${plain}`);
		const [shownGoal, shownActivity] = plain.replace(/ 59s$/, "").split(" · ");
		assert.ok(goal.startsWith(shownGoal.trim().replace(/^.*?◆ /, "")), `goal is whole words at ${width}: ${shownGoal}`);
		if (shownActivity !== undefined) {
			assert.ok(progress.startsWith(shownActivity.trim()), `activity is whole words at ${width}: ${shownActivity}`);
		}
	}
});

test("a row too narrow for the activity shows the goal alone, never a torn word", () => {
	const plain = stripVTControlCharacters(subagentLines([row({ progress: "read SKILL.md" })], 30, theme, 60_000)[0]);
	assert.ok(!plain.includes("· "), `activity dropped whole: ${JSON.stringify(plain)}`);
	assert.ok(/ probe| panel| todo/.test(plain) || !plain.includes("Pro"), `goal ends on a word: ${JSON.stringify(plain)}`);
	assert.ok(plain.length <= 30 && plain.includes("59s"), `time still survives: ${JSON.stringify(plain)}`);
});

test("a long goal yields width to the activity, and a cramped row drops it", () => {
	const long = row({ goal: "Investigate whether a pi extension can customize the todo panel rendering", progress: "read SKILL.md" });
	const plain = stripVTControlCharacters(subagentLines([long], 60, theme, 60_000)[0]);
	assert.ok(plain.includes("read SKILL.md"), `activity shares the row: ${plain}`);
	assert.ok(plain.includes("· ") && plain.length <= 60, `fits: ${JSON.stringify(plain)}`);
	const cramped = stripVTControlCharacters(subagentLines([row({ progress: "read SKILL.md" })], 26, theme, 60_000)[0]);
	assert.ok(!cramped.includes("· ") && cramped.length <= 26, `no torn activity: ${JSON.stringify(cramped)}`);
});

test("the model brief replaces the raw line once it lands, and only for the activity it describes", async () => {
	const line = subagentLines([row({ progress: "bash sleep 12; echo probe step 3", brief: "waiting between probe steps" })], 80, theme, 10_000)[0];
	assert.match(stripVTControlCharacters(line), /Probe the todo panel · waiting between probe steps 9s/);
	const raw = subagentLines([row({ progress: "bash sleep 12; echo probe step 3" })], 80, theme, 10_000)[0];
	assert.match(stripVTControlCharacters(raw), / · bash sleep 12; echo probe step 3 9s/);

	const calls = [];
	const registry = {
		find: () => ({ id: "cheap" }),
		hasConfiguredAuth: () => true,
		streamSimple: (_model, context) => {
			calls.push(context.messages[0].content);
			return { result: async () => ({ stopReason: "stop", content: [{ type: "text", text: "running cargo tests" }] }) };
		},
	};
	const running = row({ progress: "bash cargo test -p service" });
	maybeBrief(registry, [running], 10_000);
	assert.equal(calls.length, 1, "a changed activity earns one call");
	maybeBrief(registry, [running], 12_000);
	assert.equal(calls.length, 1, "the same raw line never re-calls");
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(running.brief, "running cargo tests");
	running.progress = "bash cargo clippy -p service";
	maybeBrief(registry, [running], 30_000);
	assert.equal(calls.length, 2, "a changed line calls again past the throttle");
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(running.brief, "running cargo tests", "the in-flight brief for the old line never lands");
});

test("a missing key or failed call keeps the raw line", async () => {
	const noAuth = { find: () => undefined, hasConfiguredAuth: () => false, streamSimple: () => { throw new Error("unreachable"); } };
	const running = row({ progress: "bash cargo test" });
	maybeBrief(noAuth, [running]);
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(running.brief, undefined);
});

test("refreshRunProgress resolves a run tree read-only and stamps its newest call", () => {
	const root = mkdtempSync(join(tmpdir(), "sa-dock-"));
	try {
		const runDir = join(root, "--proj--", "2026-11-20T sess-ion", "run-abc");
		mkdirSync(join(runDir, "run-0"), { recursive: true });
		mkdirSync(join(runDir, "run-1"), { recursive: true });
		writeFileSync(join(runDir, "run-0", "session.jsonl"), JSON.stringify({ type: "message", message: { role: "assistant", content: [
			{ type: "toolCall", name: "read", arguments: { path: "/old/SKILL.md" } } ] } }) + "\n");
		writeFileSync(join(runDir, "run-1", "session.jsonl"), "junk".repeat(20_000) + "\n" + JSON.stringify({ type: "message", message: { role: "toolResult", toolName: "bash", content: [{ type: "text", text: "3 tests pass" }] } }) + "\n");
		const running = row({ id: "run-abc" });
		const done = row({ id: "run-done", endedAt: 1, state: "done" });
		refreshRunProgress(root, [running, done]);
		assert.equal(running.progress, "bash 3 tests pass", "the newest run-N wins");
		assert.equal(done.progress, undefined, "settled rows are not read");
		running.brief = "stale words";
		writeFileSync(join(runDir, "run-1", "session.jsonl"), JSON.stringify({ type: "message", message: { role: "toolResult", toolName: "read", content: [{ type: "text", text: "40 lines" }] } }) + "\n");
		refreshRunProgress(root, [running]);
		assert.equal(running.progress, "read 40 lines");
		assert.equal(running.brief, undefined, "a changed activity retires its stale brief");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a workflow row shows its phases, not its own name twice", () => {
	recordLaunch("call-wf", "workflow", workflowLabel("workflows/review-fanout.mjs"));
	applyStarted({ id: "run-20", agent: "workflow", toolCallId: "call-wf",
		workflowGraph: { phases: [{ title: "Scout" }, { title: "Review" }] } });
	assert.equal(visibleRows(1_000).find((entry) => entry.id === "run-20")?.goal, "Scout → Review");
});

test("a workflow with no phases falls back to the script name, then the step count", () => {
	clearRegistry();
	recordLaunch("call-wf-2", "workflow", workflowLabel("/tmp/fanout.mjs"));
	applyStarted({ id: "run-21", agent: "workflow", toolCallId: "call-wf-2" });
	assert.equal(visibleRows(1_000).find((entry) => entry.id === "run-21")?.goal, "fanout");
	applyStarted({ id: "run-22", agent: "workflow", chainStepCount: 3 });
	assert.equal(visibleRows(1_000).find((entry) => entry.id === "run-22")?.goal, "3 steps");
	applyStarted({ id: "run-23", agent: "workflow" });
	assert.equal(visibleRows(1_000).find((entry) => entry.id === "run-23")?.goal, "unlabelled",
		"an unnamed workflow never repeats its agent column");
});

test("workflowLabel names what the caller typed", () => {
	assert.equal(workflowLabel(true), "", "an inline script has no name to show");
	assert.equal(workflowLabel("workflows/council.js"), "council");
	assert.equal(workflowLabel("/abs/path/fanout.mjs"), "fanout");
	assert.equal(workflowLabel(undefined), "");
});

test("an inline workflow with no phases shows its agent chain", () => {
	clearRegistry();
	applyStarted({ id: "run-25", agent: "workflow", agents: ["scout", "reviewer"], chain: ["scout", "reviewer"] });
	assert.equal(visibleRows(1_000).find((entry) => entry.id === "run-25")?.goal, "scout→reviewer");
});

test("long phase lists count what they omit", () => {
	clearRegistry();
	applyStarted({ id: "run-24", agent: "workflow",
		workflowGraph: { phases: [{ title: "Scout" }, { title: "Draft" }, { title: "Review" }, { title: "Verify" }, { title: "Post" }] } });
	assert.equal(visibleRows(1_000).find((entry) => entry.id === "run-24")?.goal, "Scout → Draft → Review +2");
});
