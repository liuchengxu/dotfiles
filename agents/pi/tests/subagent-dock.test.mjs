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
	"@earendil-works/pi-tui": join(root, "node_modules/@earendil-works/pi-tui/dist/index.js"),
} });
const { applyComplete, applyStarted, recordLaunch, subagentLines, visibleRows, LINGER_MS, MAX_ROWS } = await jiti.import(new URL("../extensions/lib/subagent-runs.ts", import.meta.url).pathname);

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

test("an awaited-by-workflow completion is an internal step, not a row", () => {
	applyStarted({ id: "run-13", agent: "worker" });
	applyComplete({ runId: "run-13", state: "complete", awaitedByWorkflow: true });
	assert.equal(visibleRows().find((entry) => entry.id === "run-13")?.state, "running", "the internal step never settles the row");
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
	assert.ok(line.includes("59s"), `time survives: ${line}`);
	assert.ok(line.length <= 30, `fits the width: ${JSON.stringify(line)}`);
});
