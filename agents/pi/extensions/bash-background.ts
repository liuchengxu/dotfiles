/**
 * Claude Code-style background bash, ported first-party.
 *
 * Ports from Claude Code's BashTool: the `description` param shown above the
 * command, `run_in_background` (detached spawn, task id, durable log file,
 * completion notification that wakes the agent), in-place auto-background
 * of a foreground command after a budget, Ctrl+B or Ctrl+Shift+B to
 * detach a running call by hand (Ctrl+B stays cursor-left when idle),
 * stall detection for interactive prompts, the
 * bare-`sleep` guard, and bg_status / bg_logs / bg_kill.
 *
 * The label is canonical on the task record (BgTask): every live surface
 * (footer, status, notifications) reads it from there; the notification
 * text is the canonical source for restored transcripts. No consumer
 * re-extracts labels from commands.
 *
 * How in-place conversion works: the bash tool is re-registered with proxy
 * `BashOperations`. The proxy owns an AbortController between pi's executor
 * and the local ops: real aborts and caller timeouts are forwarded only
 * while a call is foreground, so a detached child survives. Each call moves
 * through one state machine, foreground → detached → finished or
 * foreground → finished; output tees to a log file from the first byte, so
 * a detach loses nothing. Detaching resolves the promise the core tool
 * awaits (its composed result is discarded) and returns a notice; the inner
 * execution settles at real exit and fires the notification.
 *
 * Still missing vs Claude, deliberately: no Monitor tool, no TUI dock, and
 * print mode kills detached children at process exit (pi's tracked-pid
 * cleanup), which matches Claude's -p behavior.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { spawn } from "node:child_process";
import {
	closeSync,
	existsSync,
	fstatSync,
	mkdirSync,
	openSync,
	readSync,
	renameSync,
	unlinkSync,
	writeSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import {
	createBashToolDefinition,
	createReadToolDefinition,
	createWriteToolDefinition,
	createEditToolDefinition,
	createGrepToolDefinition,
	createFindToolDefinition,
	createLsToolDefinition,
	createLocalBashOperations,
	type BashOperations,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { renderDiff } from "@earendil-works/pi-coding-agent";
import { Container, matchesKey, Text, truncateToWidth, type Component } from "@earendil-works/pi-tui";
import { colorChangeSummary, countDiffRuns, formatChangeCounts, renderDetailedDiff } from "./lib/tool-presentation.ts";
import { worktreePath } from "./worktree-status.ts";

const LOG_DIR = join(homedir(), ".pi", "agent", "bg-tasks");
const NOTIFY_TAIL_BYTES = 1500;
const STALL_CHECK_MS = 45_000;
const STALL_TAIL_BYTES = 2048;
const KILL_GRACE_MS = 5_000;
const SLOW_FOREGROUND_SECONDS = 60;
/** Claude's assistant-mode budget. Overridable for tests. */
const BUDGET_MS = Number(process.env.PI_BG_BUDGET_MS ?? 5_000);
const MANUAL_BG_HINT_MS = Number(process.env.PI_BG_HINT_MS ?? 2_000);
/** Ends every background-start result. Models read "you will be notified" as
 * a cue to poll, or to call pi-subagents' bg_wait, which cannot see these tasks
 * and answers "No active run matched". */
const WAIT_GUIDANCE = "You will be woken when it completes. Meanwhile do other work, or end the turn if nothing else is left. Do not call bg_wait or poll bg_status/bg_logs. When the notice arrives, read the output and continue the task it belongs to. Use bg_kill to stop it.";

/** The running tasks the footer dock renders one line each for. Shared through
 * globalThis, as worktree-status does: another extension's import of this file
 * may load a second module instance. */
const runningKey = Symbol.for("pi.bash-background.running");
interface RunningBgTask {
	id: string;
	label: string;
	startedAt: number;
	state: BgState;
}
type SharedRunning = { [runningKey]?: RunningBgTask[] };

/** The dock's view of a task. The description is validated with its edges trimmed, so the record
 * can still carry edge newlines that would split a footer row; shape the label here, once. Cut by
 * code points: a UTF-16 slice could leave a lone surrogate half of an emoji at 30. */
export function dockTask(task: BgTask): RunningBgTask {
	const label = (task.description ?? task.command).replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
	return {
		id: task.id,
		label: [...label].slice(0, 30).join(""),
		startedAt: task.startedAt,
		state: task.state,
	};
}

type BgState = "running" | "stopping" | "completed" | "failed" | "killed" | "matched";
type CallState = "foreground" | "detached" | "finished";

interface BgTask {
	id: string;
	command: string;
	description?: string;
	cwd: string;
	pid: number;
	logPath: string;
	startedAt: number;
	executionStartedAt?: number;
	finishedAt?: number;
	bytes: number;
	state: BgState;
	exit?: { code?: number; signal?: number };
	notified: boolean;
	/** Set on a watch: the pattern whose non-match an exit should report. */
	watchPattern?: string;
	/** The process still exists, whatever the task state (a matched watch
	 * can keep running; `matched` is a notification state, not liveness). */
	processAlive: boolean;
	/** A stall warning fired; terminal notifications still get through. */
	stallNotified: boolean;
	/** bg_kill asked for this task's death: its exit is a kill, not a failure. */
	killRequested: boolean;
	/** A bg_status or bg_logs result showed the agent this task's final
	 * state, so its held completion notification adds nothing. */
	finalSeen: boolean;
	[Symbol.for("pi.bash-background.poll-key")]?: string;
}

const FINAL_STATES: ReadonlySet<BgState> = new Set(["completed", "failed", "killed"]);

interface NoticeMessage {
	customType: "bg-task-notification";
	details: { id: string; label: string; state: BgState; summary: string };
	content: string;
	display: true;
}

/** A notification held during a run; `final` is the task state at send. */
interface HeldNotice {
	task: BgTask;
	message: NoticeMessage;
	final: boolean;
}

function exitText(exit: NonNullable<BgTask["exit"]>): string {
	return String(exit.code ?? `signal ${exit.signal ?? "unknown"}`);
}

/** One foreground bash call moving through the proxy. */
interface ActiveCall {
	toolCallId: string;
	command: string;
	description?: string;
	state: CallState;
	logPath: string;
	logFd: number;
	startedAt: number;
	executionStartedAt?: number;
	bytes: number;
	/** Resolves the promise the core tool awaits; only once. */
	settleOuter: ((value: { exitCode: number | null }) => void) | null;
	innerPromise: Promise<{ exitCode: number | null }>;
	controller: AbortController;
	execStarted: boolean;
	/** The shell's pid, for graceful kills after a detach. */
	childPid?: number;
	/** Woken by the budget timer or a detach shortcut; carries why, for the notice. */
	detachRequested: Promise<"budget" | "user">;
	requestDetach: () => void;
	/** The delayed hint is rendered beside this foreground call. */
	hintRequested: boolean;
	/** Becomes the task once detached. */
	task?: BgTask;
}

const parameters = {
	type: "object",
	properties: {
		command: { type: "string", description: "The command to execute" },
		timeout: { type: "number", description: "Optional timeout in seconds" },
		description: {
			type: "string",
			description:
				"Clear, concise description of what this command does in active voice, 5-10 words. Shown to the user above the command. Examples: 'List files in current directory', 'Run the workspace test suite'.",
		},
		run_in_background: {
			type: "boolean",
			description:
				"Set to true to run this command in the background from the start. Use when the command is known to take more than a few seconds: the call returns at once with a task id and a log file, and a completion notification arrives when it exits.",
		},
	},
	required: ["command"],
	additionalProperties: false,
} as const;

function tailBytes(path: string, bytes: number): string {
	const fd = openSync(path, "r");
	try {
		const size = fstatSync(fd).size;
		const start = Math.max(0, size - bytes);
		const buffer = Buffer.alloc(size - start);
		readSync(fd, buffer, 0, buffer.length, start);
		return buffer.toString("utf8");
	} finally {
		closeSync(fd);
	}
}

/** Claude's heuristic, simplified: a quiet tail that ends like a prompt. */
function looksLikePrompt(text: string): boolean {
	const tail = text.slice(-STALL_TAIL_BYTES);
	const lastLine = tail.slice(tail.lastIndexOf("\n") + 1).trimEnd();
	return /([:>?]\s*$|\?\s*\[y\/n\]\s*:?\s*$|%\s*$|#\s*$|\$\s*$)/.test(lastLine);
}

export default function bashBackground(pi: ExtensionAPI) {
	mkdirSync(LOG_DIR, { recursive: true });
	const tasks = new Map<string, BgTask>();
	const active = new Map<string, ActiveCall>();
	const callRequestDetachers = new Map<string, (value: "budget" | "user") => void>();
	/** Carries the ActiveCall from execute() into the proxy exec(), across
	 * any awaits in the core tool's prefix. */
	const callContext = new AsyncLocalStorage<ActiveCall>();
	const local = createLocalBashOperations();
	let counter = 0;
	/** Between agent_start and agent_settled, notifications are held. */
	let agentRunning = false;
	const held: HeldNotice[] = [];
	/** One redraw per running bash call, keyed by toolCallId: every partial
	 * render replaces its entry, so the ticker cannot multiply them. */
	const redrawHints = new Map<string, () => void>();
	let hintTicker: NodeJS.Timeout | undefined;
	let stopTerminalInput: (() => void) | undefined;
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui" || hintTicker) return;
		hintTicker = setInterval(() => {
			for (const redraw of redrawHints.values()) redraw();
		}, 250);
		hintTicker.unref();
		stopTerminalInput?.();
		stopTerminalInput = ctx.ui.onTerminalInput((data) => {
			if (!matchesKey(data, "ctrl+b") || !detachNewestForeground()) return undefined;
			return { consume: true };
		});
	});
	pi.on("session_shutdown", () => {
		clearInterval(hintTicker);
		hintTicker = undefined;
		redrawHints.clear();
		stopTerminalInput?.();
		stopTerminalInput = undefined;
		held.length = 0;
		agentRunning = false;
	});

	function nextTaskId(): string {
		counter += 1;
		return `bg-${counter}`;
	}

	/** Terminal notifications: one per task, deduplicated. */
	function notify(task: BgTask, summary: string, lastOutput?: string): void {
		if (task.notified) return;
		task.notified = true;
		sendNotification(task, summary, lastOutput);
	}

	function sendNotification(task: BgTask, summary: string, lastOutput?: string): void {
		const duration = Math.round((Date.now() - task.startedAt) / 1000);
		const parts = [
			`<bg-task-notification>`,
			`<id>${task.id}</id>`,
			`<command>${task.command}</command>`,
			`<status>${task.state}</status>`,
			task.exit ? `<exit>${exitText(task.exit)}</exit>` : "",
			`<duration>${duration}s</duration>`,
			`<log>${task.logPath}</log>`,
			`<summary>${summary}</summary>`,
			`</bg-task-notification>`,
		];
		if (lastOutput !== undefined) parts.push(`Last output:\n${lastOutput.trimEnd()}`);
		const message: NoticeMessage = {
			customType: "bg-task-notification",
			details: { id: task.id, label: task.description ?? "Background command", state: task.state, summary },
			content: parts.filter(Boolean).join("\n"),
			display: true,
		};
		// A follow-up queued during a run cannot be withdrawn, and pi drains
		// each one as its own turn after the final answer. Hold it instead and
		// decide at settle whether the agent still needs it.
		if (agentRunning) held.push({ task, message, final: FINAL_STATES.has(task.state) });
		else deliver(message, true);
	}

	function deliver(message: NoticeMessage, wake: boolean): void {
		try {
			pi.sendMessage(message, wake ? { triggerTurn: true, deliverAs: "followUp" } : { triggerTurn: false });
		} catch {
			// The session was replaced, reloaded or shut down: there is no
			// one left to notify, and a throw here would kill the process.
		}
	}

	/** Held notices the agent still needs. A completion it already read
	 * through bg_status or bg_logs is dropped; stall warnings and watch
	 * matches are never final, so they always get through. */
	function takeHeld(): HeldNotice[] {
		return held.splice(0).filter((notice) => !(notice.final && notice.task.finalSeen));
	}

	pi.on("agent_start", () => {
		agentRunning = true;
	});
	pi.on("agent_before_settle", (event) => {
		try {
			const due = takeHeld();
			if (due.length === 0) return;
			// Not gated on event.context.canContinue: it previews the context
			// before these entries, and after a final answer it is false. Pi
			// checks continuation again after committing them.
			if (event.outcome !== "completed") {
				held.unshift(...due);
				return;
			}
			return {
				// Pi replaces the proposed entries with each handler's result.
				entries: [...(event.entries ?? []), ...due.map((notice) => ({ type: "custom_message" as const, ...notice.message }))],
				continue: true,
			};
		} catch {
			return;
		}
	});
	pi.on("agent_settled", (event) => {
		agentRunning = false;
		// One wake for the batch: each woken message would start its own
		// run. An aborted run means the user stopped the agent: record what
		// happened without starting a turn.
		const due = takeHeld();
		due.forEach((notice, index) => deliver(notice.message, !event.aborted && index === due.length - 1));
	});

	/** Pi gives a call made by another tool (a codemode script) the id
	 * `<parent id>/<n>`, and only the script's output reaches the model, so
	 * such a result is no evidence that the agent saw anything. */
	function reachesModel(toolCallId: string): boolean {
		return !toolCallId.includes("/");
	}

	function watchStall(task: BgTask): void {
		const started = task.bytes;
		const timer = setInterval(() => {
			if (!task.processAlive) {
				clearInterval(timer);
				return;
			}
			if (task.bytes !== started) {
				watchStall(task);
				clearInterval(timer);
				return;
			}
			const tail = tailBytes(task.logPath, STALL_TAIL_BYTES);
			if (looksLikePrompt(tail) && !task.stallNotified) {
				// A stall warning must not consume the completion
				// notification: it carries its own one-shot flag.
				task.stallNotified = true;
				sendNotification(
					task,
					`"${task.description ?? task.command.slice(0, 40)}" appears to be waiting for interactive input`,
					tail.slice(-400),
				);
				clearInterval(timer);
			}
		}, STALL_CHECK_MS);
		timer.unref?.();
	}

	function startBackground(command: string, description: string | undefined, cwd: string): string {
		const id = nextTaskId();
		return spawnLogged(command, description, cwd, () => id).id;
	}

	/** Spawn detached with piped output teed into the log by us, so both
	 * the byte counter and any matcher see every chunk. */
	function spawnLogged(
		command: string,
		description: string | undefined,
		cwd: string,
		assignId: () => string,
		onChunk?: (task: BgTask, chunk: Buffer) => void,
	): { id: string; task: BgTask } {
		const id = assignId();
		const logPath = join(LOG_DIR, `${Date.now()}-${id}.log`);
		const logFd = openSync(logPath, "a");
		const child = spawn(resolveShell(), ["-c", command], {
			cwd,
			detached: true,
			stdio: ["ignore", "pipe", "pipe"],
		});
		const task: BgTask = {
			id,
			command,
			description,
			cwd,
			pid: child.pid ?? -1,
			logPath,
			startedAt: Date.now(),
			bytes: 0,
			state: "running",
			notified: false,
			processAlive: true,
			stallNotified: false,
			killRequested: false,
			finalSeen: false,
		};
		tasks.set(id, task);
		const tee = (chunk: Buffer): void => {
			task.bytes += chunk.length;
			try {
				writeSync(logFd, chunk);
			} catch {
				// A full disk must not kill the watcher.
			}
			onChunk?.(task, chunk);
		};
		child.stdout?.on("data", tee);
		child.stderr?.on("data", tee);
		let logClosed = false;
		const closeLogOnce = (): void => {
			if (logClosed) return;
			logClosed = true;
			try {
				closeSync(logFd);
			} catch {
				// Already closed elsewhere.
			}
		};
		// `close`, not `exit`: the pipes drain after exit, and the log must
		// stay open until they have, or late output is lost or worse.
		child.on("close", (code, signal) => {
			closeLogOnce();
			task.processAlive = false;
			task.finishedAt ??= Date.now();
			task.exit = { code: code ?? undefined, signal: signal ?? undefined };
			task.state = signal || task.killRequested ? "killed" : code === 0 ? "completed" : "failed";			const tail = tailBytes(task.logPath, NOTIFY_TAIL_BYTES);
			const summary = signal
				? `killed by signal ${signal}`
				: task.killRequested && (code ?? 0) > 128
					? `killed on request (exit code ${code})`
					: code === 0
					? task.watchPattern
						? `completed without ${JSON.stringify(task.watchPattern)} ever matching`
						: "completed successfully"
					: `failed with exit code ${code}`;
			notify(task, summary, tail);
		});
		// A spawn that never was (no such shell, a gone cwd) must fail the
		// task, not the host process.
		child.on("error", (error) => {
			task.processAlive = false;
			task.finishedAt ??= Date.now();
			task.state = "failed";
			notify(task, `could not start: ${error.message}`);
			closeLogOnce();
		});
		child.unref();
		watchStall(task);
		return { id, task };
	}

	/** The shell the foreground backend would pick, so a backgrounded
	 * command keeps the same command language. */
	function resolveShell(): string {
		if (existsSync("/bin/bash")) return "/bin/bash";
		// pi's own resolver: /bin/bash, then bash on PATH, then sh. The
		// login shell is never used, so background commands keep the
		// foreground command language on every host.
		for (const dir of (process.env.PATH ?? "").split(":")) {
			if (dir && existsSync(join(dir, "bash"))) return join(dir, "bash");
		}
		return "/bin/sh";
	}

	/** The proxy operations: pi's local execution behind our controller. */
	const proxyOps: BashOperations = {
		exec: (command, cwd, options) => {
			const call = callContext.getStore() ?? null;
			if (call) {
				call.execStarted = true;
				call.executionStartedAt ??= Date.now();
			}
			const controller = new AbortController();
			// A call cancelled before this point must not start its command:
			// forward an already-aborted signal synchronously, or the fresh
			// controller below hides the cancellation from the backend.
			if (options.signal?.aborted && call?.state === "foreground") {
				controller.abort();
			}
			// The shell's pid, written by a prepended line, lets bg_kill stop
			// a detached call with the advertised TERM-then-KILL grace
			// instead of an immediate abort-kill.
			const pidPath = call ? `${call.logPath}.pid` : null;
			const pidCommand = pidPath
				? `printf %s $$ > '${pidPath.replace(/'/g, "'\\''")}'; ${command}`
				: command;
			if (pidPath) {
				const readPid = (attempts: number): void => {
					try {
						const pid = Number.parseInt(tailBytes(pidPath, 16).trim(), 10);
						if (Number.isSafeInteger(pid) && pid > 0) {
							call!.childPid = pid;
							if (call!.task) call!.task.pid = pid;
							return;
						}
					} catch {
						// Not written yet.
					}
					if (attempts > 0) {
						const timer = setTimeout(() => readPid(attempts - 1), 50);
						timer.unref?.();
					}
				};
				readPid(20);
			}
			options.signal?.addEventListener("abort", () => {
				if (call?.state === "foreground") controller.abort();
			});
			return new Promise((resolveOuter, rejectOuter) => {
				const inner = local.exec(pidCommand, cwd, {
					onData: (data) => {
						if (call) {
							call.bytes += data.length;
							if (call.task) call.task.bytes = call.bytes;
							try {
								writeSync(call.logFd, data);
							} catch {
								// A full disk must not kill the command.
							}
						}
						// Once detached the core tool has finalized: feed it
						// nothing more; the log keeps everything.
						if (!call || call.state === "foreground") options.onData(data);
					},
					// The caller's timeout stays the caller's deadline, even
					// after a detach: silently cancelling it would change the
					// command's contract.
					timeout: options.timeout,
					env: options.env,
					signal: controller.signal,
				});
				if (call) {
					call.innerPromise = inner;
					call.settleOuter = resolveOuter;
					call.controller = controller;
				}
				inner.then(
					(result) => {
						if (call) finishCall(call, result.exitCode);
						resolveOuter(result);
					},
					(error) => {
						const detached = call?.state === "detached";
						const timeoutSeconds = /^timeout:(.+)$/.exec(
							error instanceof Error ? error.message : String(error),
						)?.[1];
						if (call) {
							finishCall(
								call,
								null,
								timeoutSeconds === undefined ? undefined : `exceeded its ${timeoutSeconds}s timeout`,
							);
						}
						// Preserve foreground errors after cleanup changes the state.
						if (detached) resolveOuter({ exitCode: null });
						else rejectOuter(error);
					},
				);
			});
		},
	};

	function finishCall(call: ActiveCall, exitCode: number | null, failureSummary?: string): void {
		if (call.state === "finished") return;
		call.state = "finished";
		active.delete(call.toolCallId);
		// End liveness before log I/O: log failures must not retain a dead task.
		if (call.task) {
			call.task.processAlive = false;
			call.task.finishedAt ??= Date.now();
		}
		try {
			closeSync(call.logFd);
		} catch {
			// Cleanup can also follow an already-closed log.
		}
		if (!call.task) {
			try {
				unlinkSync(call.logPath);
			} catch {
				// Already gone.
			}
			return;
		}
		const task = call.task;
		task.exit = { code: exitCode ?? undefined };
		task.state = task.killRequested ? "killed" : exitCode === 0 ? "completed" : "failed";
		let tail: string;
		try {
			tail = tailBytes(task.logPath, NOTIFY_TAIL_BYTES);
		} catch {
			tail = "Output log unavailable.";
		}
		notify(
			task,
			task.killRequested ? "killed on request" : failureSummary ??
				(exitCode === 0 ? "completed successfully" : `failed with exit code ${exitCode}`),
			tail,
		);
	}

	/** Convert a foreground call into a background task, in place. */
	function detach(call: ActiveCall): BgTask | null {
		if (call.state !== "foreground") return null;
		call.state = "detached";
		const id = nextTaskId();
		const logPath = join(LOG_DIR, `${Date.now()}-${id}.log`);
		closeSync(call.logFd);
		renameSync(call.logPath, logPath);
		const task: BgTask = {
			id,
			command: call.command,
			description: call.description,
			cwd: process.cwd(),
			// The proxy's child is alive and its pid, when captured, is
			// call.childPid: bg_kill, the footer and stall watching all
			// read these.
			pid: call.childPid ?? -1,
			logPath,
			startedAt: call.startedAt,
			executionStartedAt: call.executionStartedAt,
			bytes: call.bytes,
			state: "running",
			notified: false,
			processAlive: true,
			stallNotified: false,
			killRequested: false,
			finalSeen: false,
		};
		tasks.set(id, task);
		call.task = task;
		backgroundTimings.set(call.toolCallId, task);
		// Reopen the renamed log so streaming continues into it.
		call.logFd = openSync(logPath, "a");
		// Wake the core tool without killing the child: the real signal is
		// no longer forwarded, so the child outlives the call.
		call.settleOuter?.({ exitCode: null });
		call.settleOuter = null;
		watchStall(task);
		return task;
	}

	function detachNewestForeground(): boolean {
		const call = [...active.values()].reverse().find((candidate) => candidate.state === "foreground");
		if (!call) return false;
		call.requestDetach();
		return true;
	}

	// Ctrl+B works only while a foreground call exists, preserving cursor-left
	// at other times. Ctrl+Shift+B remains as an explicit alternative.
	pi.registerShortcut("ctrl+shift+b", {
		description: "Move the running foreground bash command to the background",
		handler: () => { detachNewestForeground(); },
	});

	function isBareSleep(command: string): boolean {
		return /^\s*sleep\s+\d+(\.\d+)?\s*$/.test(command);
	}

	const original = createBashToolDefinition(process.cwd(), { operations: proxyOps });

	const builtInRenderers = Object.fromEntries([
		createReadToolDefinition, createWriteToolDefinition, createEditToolDefinition,
		createGrepToolDefinition, createFindToolDefinition, createLsToolDefinition,
	].map(create => {
		const definition = create(process.cwd());
		return [definition.name, definition];
	}));

	/** Pi passes a renderer the component it returned last, and the built-in
	 * renderers reuse it (`lastComponent ?? new Container()`, then `clear()`).
	 * After a collapsed render that component is one of ours, which has no
	 * such methods, so a delegate gets none and builds its own. */
	function forDelegate<T extends { lastComponent?: unknown }>(context: T): T {
		return { ...context, lastComponent: undefined };
	}

	function renderBashCall(
		args: { command?: unknown; description?: unknown },
		theme: { fg: (token: string, text: string) => string; bold: (text: string) => string },
		expanded = false,
		cwd?: string,
		detailsCollapsed = false,
		manualHint = false,
	): Component {
		const description = typeof args.description === "string" ? args.description : "bash";
		const command = typeof args.command === "string" ? args.command : "";
		if (expanded) {
			const lines = [description, `  ⎿ $ ${command}`];
			if (cwd) lines.push(`  ⎿ cwd ${cwd}`);
			return new Text(lines.join("\n"), 0, 0);
		}
		return {
			render(width) {
				if (width <= 0) return [];
				// Collapsed: label line, then the first command line on its own row
				// so long commands stay readable instead of truncating into the label.
				return [
					theme.fg("toolTitle", description.replace(/\s+/g, " ").trim()),
					...(!detailsCollapsed ? [theme.fg("accent", `  ⎿ $ ${command.split(/\r?\n/).find(line => line.trim())?.trim() ?? ""}`)] : []),
				...(manualHint ? [theme.fg("dim", "  Ctrl+B to run in background")] : []),
				].map(line => truncateToWidth(line, width));
			},
			invalidate() {},
		};
	}

	function editLineSummary(diff: string): string | undefined {
		const summary = formatChangeCounts(countDiffRuns(diff));
		return summary || (diff.trim() ? undefined : "no line changes");
	}

	/// The numbered display diff between a file's previous text and the new
	/// one, in the edit tool's format so one renderer serves both. Context is
	/// trimmed to three lines around each change; a diff too large to compute
	/// is absent rather than approximate.
	function writeDiffText(oldText: string, newText: string): string | undefined {
		// A single trailing newline is the file's last line ending, not a line
		// of content: both sides drop it, so a newline-only change shows none.
		const splitLines = (text: string) => {
			if (text === "") return [];
			const lines = text.split("\n");
			if (lines.length > 1 && lines.at(-1) === "") lines.pop();
			return lines;
		};
		const oldLines = splitLines(oldText);
		const newLines = splitLines(newText);
		if (oldLines.length * newLines.length > 4_000_000) return undefined;
		const width = newLines.length + 1;
		const lengths = new Uint32Array((oldLines.length + 1) * width);
		for (let i = oldLines.length - 1; i >= 0; i--) {
			for (let j = newLines.length - 1; j >= 0; j--) {
				lengths[i * width + j] = oldLines[i] === newLines[j]
					? lengths[(i + 1) * width + j + 1] + 1
					: Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
			}
		}
		const pad = String(Math.max(oldLines.length, newLines.length)).length;
		const number = (n: number) => String(n).padStart(pad, " ");
		const lines: string[] = [];
		let i = 0;
		let j = 0;
		let oldNumber = 1;
		let newNumber = 1;
		while (i < oldLines.length && j < newLines.length) {
			if (oldLines[i] === newLines[j]) {
				lines.push(` ${number(oldNumber)} ${oldLines[i]}`);
				i++;
				j++;
				oldNumber++;
				newNumber++;
			} else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
				lines.push(`-${number(oldNumber)} ${oldLines[i]}`);
				i++;
				oldNumber++;
			} else {
				lines.push(`+${number(newNumber)} ${newLines[j]}`);
				j++;
				newNumber++;
			}
		}
		for (; i < oldLines.length; i++, oldNumber++) lines.push(`-${number(oldNumber)} ${oldLines[i]}`);
		for (; j < newLines.length; j++, newNumber++) lines.push(`+${number(newNumber)} ${newLines[j]}`);
		const isChange = (line: string) => line.startsWith("-") || line.startsWith("+");
		const kept = lines.filter((line, index) =>
			isChange(line) || lines.some((other, distance) => Math.abs(distance - index) <= 3 && isChange(other)));
		return kept.join("\n");
	}

	/// A write's previous text, bounded, so a huge file never blocks the
	/// write it feeds. Binary and unreadable files have no diff.
	function boundedReadText(path: string): string | undefined {
		try {
			const descriptor = openSync(path, "r");
			try {
				const size = fstatSync(descriptor).size;
				if (size > 512 * 1024) return undefined;
				const buffer = Buffer.alloc(size);
				readSync(descriptor, buffer, 0, size, 0);
				const text = buffer.toString("utf8");
				return text.includes("\0") ? undefined : text;
			} finally {
					closeSync(descriptor);
			}
		} catch {
			return undefined;
		}
	}

	// Read-only inspection commands are probes like read/grep/find: a live row
	// while they run, nothing when they finish. The classifier is deliberately
	// conservative — anything that can write, execute code, or substitute a
	// command keeps its permanent row.
	const READ_ONLY_COMMANDS = new Set([
		"cat", "head", "tail", "less", "more", "rg", "grep", "ls", "find", "pwd",
		"wc", "stat", "file", "du", "df", "which", "type", "whoami", "date",
		"uname", "echo", "printf", "sort", "cut", "column", "tree",
		"jq", "bat", "true", "test", "[", "man", "cd", "shasum", "md5sum",
		// NOT uniq: its second operand is an output file (uniq in.txt out.txt).
	]);
	const READ_ONLY_GIT = new Set([
		"status", "log", "diff", "show", "blame", "shortlog", "describe", "rev-parse",
	]);
	// `git tag` and `git remote` only list when nothing follows the
	// subcommand: `git tag v1` creates one, `git remote add origin …` writes
	// the config.
	const READ_ONLY_GIT_BARE = new Set(["remote", "tag"]);

	function commandName(token: string): string {
		const name = token.split("/").pop() ?? token;
		return name;
	}

	function readOnlySegment(segment: string): boolean {
		// Redirections, heredoc-to-file forms, command substitution and
		// backticks all escape the allowlist: keep the row.
		if (/[>]/.test(segment) || /\$\(/.test(segment) || segment.includes("`") || segment.includes("<(")) return false;
		const tokens = segment.trim().split(/\s+/).filter(Boolean);
		while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) tokens.shift();
		if (!tokens.length) return false;
		const name = commandName(tokens[0]);
		if (name === "git") {
			let index = 1;
			let subcommand = "";
			while (index < tokens.length) {
				const token = tokens[index];
				if (token === "-C") { index += 2; continue; }
				if (token.startsWith("-")) { index += 1; continue; }
				subcommand = token;
				break;
			}
			// `git diff --output=changes.patch` writes a patch file; so do
			// `log` and `show` with the same option.
			if (/--output(=|\s|$)/.test(segment)) return false;
			if (READ_ONLY_GIT.has(subcommand)) return true;
			if (READ_ONLY_GIT_BARE.has(subcommand)) {
				const tail = tokens.slice(index + 1);
				// An explicit listing flag makes any pattern that follows a
				// selector: `git tag -l "v*"` reads.
				if (tail.some(token => token === "-l" || token === "--list" || token === "-n")) return true;
				return tail.every(token => token.startsWith("-"));
			}
			return false;
		}
		if (name === "sed") {
			// i edits in place; BSD sed (macOS) also edits in place on I.
			if (tokens.some(token => /^-[A-Za-z]*[iI]/.test(token))) return false;
			// A script file's contents are unknown: it may write.
			if (/(^|\s)(--file(=|\s|$)|-[a-zA-Z]*f)/.test(segment)) return false;
			// A `w` or `e` at command position — glued to an address as in
			// `1,5w`, a standalone letter, or ending the script — writes a
			// file or runs a command.
			return !tokens.slice(1).some(token => !token.startsWith("-")
				&& (/\b[we]\b/.test(token) || /[we]'?"?$/.test(token)));
		}
		if (name === "find") {
			return !/-\-?(delete|exec|execdir|ok|okdir|fls|fprint|fprintf|fprint0)\b/.test(segment);
		}
		if (name === "sort") {
			// -o may attach its file or hide inside a short-flag cluster.
			return !/(^|\s)(--output(=|\s|$)|-[a-zA-Z]*o)/.test(segment);
		}
		if (name === "tree") {
			return !/(^|\s)(--output(=|\s|$)|-o)/.test(segment);
		}
		return READ_ONLY_COMMANDS.has(name);
	}

	function readOnlyInspection(command: string): boolean {
		if (!command.trim()) return false;
		// Output silencing writes nothing: drop `>/dev/null`-style
		// redirects and bare fd duplication (`2>&1`) before the split,
		// so they neither trip the redirect escape nor the `&` splitter.
		// Every other redirection still escapes readOnlySegment.
		const silenced = command
			.replace(/\d*>>?\s*\/dev\/null\b/g, " ")
			.replace(/\d?>>&\d\b/g, " ");
		return silenced.split(/\|\||&&|;|\||\n|&/).every(segment => !segment.trim() || readOnlySegment(segment));
	}

	const backgroundTimings = new Map<string, { id?: string; startedAt: number; executionStartedAt?: number; finishedAt?: number; processAlive: boolean; state?: BgState; exit?: { code?: number; signal?: number } }>();

	/// What one codemode run changed through nested edit and write calls:
	/// those calls add no transcript rows of their own, so this aggregate is
	/// the only visible trace, and the run's row persists to carry it.
	const nestedEdits = new Map<string, { added: number; removed: number; changed: number; files: Set<string> }>();
	const renderedBackgroundOutcomes = new Set<string>();

	function backgroundElapsed(toolCallId: string | undefined): string {
		const task = toolCallId ? backgroundTimings.get(toolCallId) : undefined;
		return task ? taskElapsed(task) : "";
	}

	function taskElapsed(task: BgTask): string {
		if (!task.processAlive && task.finishedAt === undefined) return "";
		const seconds = Math.max(0, Math.floor(((task.finishedAt ?? Date.now()) - (task.executionStartedAt ?? task.startedAt)) / 1000));
		const minutes = Math.floor(seconds / 60);
		return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
	}

	/** A detached task's part of a row: its id, a state word only where the
	 * row's icon does not already say it, the elapsed time, and the exit. A
	 * row without the header's spinner (`iconless`) also says "Running". */
	function backgroundTag(task: BgTask, iconless = false): string {
		const state = task.processAlive
			? task.state === "stopping" ? "Stopping" : task.state === "matched" ? "Matched" : iconless ? "Running" : ""
			: task.state === "killed" ? "Stopped" : task.state === "failed" ? "Failed" : "";
		const exit = task.processAlive || !task.exit ? ""
			: task.exit.code !== undefined ? `exit code ${task.exit.code}`
			: task.exit.signal !== undefined ? `signal ${task.exit.signal}` : "";
		const outcome = state && exit ? `${state} (${exit})` : state || exit;
		// The outcome precedes the time, so a narrow row truncates the time
		// first and keeps the exit code.
		return [task.id, outcome, taskElapsed(task)].filter(Boolean).join(" · ");
	}

	const runningHeaders = new Map<string, () => void>();
	pi.on("session_start", () => {
		const timer = setInterval(() => {
			for (const invalidate of runningHeaders.values()) invalidate();
		}, 120);
		timer.unref();
		pi.on("session_shutdown", () => {
			clearInterval(timer);
			runningHeaders.clear();
			backgroundTimings.clear();
			nestedEdits.clear();
			renderedBackgroundOutcomes.clear();
		});
	});

	function operationHeader(component: Component, theme: { fg: (token: string, text: string) => string }, context: { isPartial?: boolean; isError?: boolean; toolCallId?: string; invalidate?: () => void; state?: Record<string, unknown> }): Component {
		return {
			render(width) {
				if (width < 3) return component.render(width);
				const liveTask = context.toolCallId ? backgroundTimings.get(context.toolCallId) : undefined;
				const [color, icon] = context.isError || liveTask?.state === "failed" ? ["error", "✗"]
					: context.isPartial || liveTask?.processAlive ? ["accent", ["⠋", "⠙", "⠹", "⠸"][Math.floor(Date.now() / 120) % 4]]
					: ["success", "⏺"];
				// A detached task's id, time, and outcome ride on this one line
				// instead of a second row.
				const suffix = liveTask ? ` · ${backgroundTag(liveTask)}` : context.isPartial ? " · Running" : "";
				return component.render(width - 2).map((line, index) => {
					if (index === 0 && suffix) {
						line = truncateToWidth(line, Math.max(0, width - 2 - suffix.length), "") + theme.fg("muted", suffix);
					}
					return truncateToWidth(`${index === 0 ? theme.fg(color, icon) : " "} ${line}`, width);
				});
			},
			invalidate() { component.invalidate(); },
		};
	}

	// Tiered disclosure, deny-by-default. Always-quiet tools belong to their
	// own widgets and never draw a row. Every other tool draws its live row
	// only while it runs and VANISHES when it succeeds — including tools this
	// extension has never seen. A row persists past success only when the
	// call changed durable state: a mutation tool, or a bash command that is
	// not a read-only inspection. Failures always persist, whatever the tool.
	const alwaysQuiet = new Set(["subagent", "subagents_enable", "subagent_supervisor", "todo"]);
	// A loaded skill changes what the model does next; the reader must see
	// which one, the way Claude Code names it.
	const SKILL_PATH = /(^|\/)skills\/([^/]+)\/SKILL\.md$/;
	function skillName(path: string): string | undefined {
		return SKILL_PATH.exec(path)?.[2];
	}

	const mutationTools = new Set(["write", "edit", "bg_kill", "bg_watch"]);
	// Mutation-shaped names keep a row even for tools this extension has
	// never seen: an mcp create/delete/write is a state change, not a probe.
	const MUTATION_NAME = /write|create|update|delete|remove|edit|put|post|patch|apply|save|upload|send|kill|move|copy/i;
	function persistsWhenDone(name: string, args: Record<string, unknown> | undefined): boolean {
		if (mutationTools.has(name) || MUTATION_NAME.test(name)) return true;
		if (name === "bash") return !readOnlyInspection(String(args?.command ?? ""));
		if (name === "read" && skillName(String(args?.path ?? "")) !== undefined) return true;
		return false;
	}
	pi.registerToolRenderer((toolName, next) => ({
		renderShell: "self",
		renderCall(args, theme, context) {
			// A detached process stays live after its tool call returns.
			if (context.toolCallId) {
				const live = context.isPartial || backgroundTimings.get(context.toolCallId)?.processAlive;
				if (!live) runningHeaders.delete(context.toolCallId);
				else if (context.invalidate) runningHeaders.set(context.toolCallId, context.invalidate);
			}
			if (!context.expanded && !context.isPartial && context.isError && context.state?.detailsCollapsed) {
				return new Container();
			}
			if (toolName === "bash") {
				const input = args as { command?: unknown; description?: unknown };
				if (!context.expanded && context.isPartial &&
					(typeof input.description !== "string" || !input.description.trim())) {
					return new Container();
				}
				// The turn settled and the activity summary carries the count:
				// the folded rows come back with Ctrl+O.
				if (!context.expanded && !context.isPartial && !context.isError && context.state?.folded) {
					return new Container();
				}
				if (!context.expanded && context.state?.causal) {
					const name = typeof input.description === "string" && input.description.trim()
						? input.description.trim()
						: "bash";
					const hint = (String(input.command ?? "").split(/\r?\n/).find(line => line.trim()) ?? "").trim();
					return {
						render(width) {
							return width > 0 ? [truncateToWidth(theme.fg("muted", `└ ${name.replace(/\s+/g, " ")}${hint ? ` · ${hint}` : ""}`), width)] : [];
						},
						invalidate() {},
					};
				}
				if (!context.expanded && !context.isPartial && !context.isError
					&& readOnlyInspection(String(input?.command ?? ""))) {
					return new Container();
				}
				const call = context.toolCallId ? active.get(context.toolCallId) : undefined;
				const hintRequested = call?.state === "foreground" && call.hintRequested;
				return operationHeader(renderBashCall(input, theme, context.expanded, context.cwd, context.state?.detailsCollapsed === true && !context.isPartial, hintRequested), theme, context);
			}
			if (context.expanded) return (next() ?? builtInRenderers[toolName])?.renderCall?.(args, theme, forDelegate(context)) ?? new Text(`${toolName}\n${JSON.stringify(args, null, 2)}`, 0, 0);
			const input = args as Record<string, unknown>;
			const value = (key: string) => typeof input[key] === "string" ? input[key] as string : "";
			const labels: Record<string, string> = {
				read: "Read file", write: "Write file", edit: "Update file",
				grep: "Search file contents", find: "Find files", ls: "List directory",
				tool_search: "Find available tools", codemode: "Run tool script",
				bg_status: "Check background tasks", bg_logs: "Read background task log",
				bg_kill: "Stop background task", bg_watch: "Watch command output",
				bg_wait: "Wait for background task",
				todo: "Update task list",
			};
			// Built at render time, so a path stays relative to the worktree the footer names now,
			// not the one it named when pi last called renderCall.
			const describe = () => {
				let label = labels[toolName] ?? toolName.replace(/^mcp__/, "").replace(/[_-]+/g, " ");
				const path = worktreePath(value("path"));
				let detail = path || value("query") || value("pattern") || value("id");
				if (toolName === "write") {
					label = `Write (${path || "file"})`;
					detail = "";
				} else if (toolName === "read") {
					const skill = skillName(value("path"));
					if (skill) {
						label = `Skill(${skill})`;
						detail = "";
					} else {
						label = `Read (${path || "file"})`;
					}
					const offset = Number(args?.offset ?? 0);
					const streaming = context.argsComplete === false && context.isPartial === true;
					detail = offset > 0 && !streaming ? `from line ${offset}` : "";

				} else if (toolName === "codemode") {
					const lines = value("code").split("\n");
					label = lines.map(line => /^\s*\/\/\s?(.*)$/.exec(line)?.[1]).find(text => text?.trim())?.trim() || label;
					const aggregate = context.toolCallId ? nestedEdits.get(context.toolCallId) : undefined;
					if (aggregate) {
						const counts = colorChangeSummary(formatChangeCounts(aggregate), theme);
						const files = `${aggregate.files.size} file${aggregate.files.size === 1 ? "" : "s"}`;
						label = `${label} (${counts ? `${counts} · ` : ""}${files})`;
					}
					detail = "js " + (lines.find(line => line.trim() && !/^\s*\/\//.test(line)) ?? "").trim();
				} else if (toolName === "edit") {
					label = `Update ${path || "file"}`;
					detail = "";
				} else if (toolName === "bg_watch") {
					label = value("description") || label;
					detail = value("command");
				} else if (toolName.startsWith("mcp__")) {
					label = value("instruction") || label;
					detail = toolName;
				}
				return { label, detail };
			};
			const headerLabel = () => {
				const { label } = describe();
				if (toolName === "bg_kill") {
					const task = tasks.get(value("id"));
					const action = context.isError ? "Could not stop" : task?.processAlive
						? task.killRequested ? "Stopping" : "Stop"
						: task?.state === "killed" ? "Stopped" : task ? "Already finished" : "Stop";
					return `${action}: ${task?.description ?? value("id") ?? "background task"}`;
				}
				if (toolName === "write") {
					const summary = context.state?.editLineSummary;
					if (typeof summary === "string") {
						return `${label} (${colorChangeSummary(summary, theme)})`.replace(/\s+/g, " ").trim();
					}
					if (context.state?.writeSettled) {
						const lines = value("content") ? value("content").replace(/\n$/, "").split("\n").length : 0;
						return `${label} (${lines} line${lines === 1 ? "" : "s"})`.replace(/\s+/g, " ").trim();
					}
					return label.replace(/\s+/g, " ").trim();
				}
				const summary = toolName === "edit" ? context.state?.editLineSummary : undefined;
				return `${label}${typeof summary === "string" ? ` (${colorChangeSummary(summary, theme)})` : ""}`.replace(/\s+/g, " ").trim();
			};
			if (alwaysQuiet.has(toolName)) return new Container();
			// A failed turn names its own steps: the rows a causal reveal
			// marked draw one muted line instead of vanishing.
			if (context.state?.causal) {
				return {
					render(width) {
						if (width <= 0) return [];
						const { detail } = describe();
						const hint = detail ? ` · ${(detail.split(/\r?\n/).find(line => line.trim()) ?? "").trim()}` : "";
						return [truncateToWidth(theme.fg("muted", `\u2514 ${headerLabel()}${hint}`), width)];
					},
					invalidate() {},
				};
			}
			if (!context.isPartial && !context.isError && !persistsWhenDone(toolName, args)
				&& !(toolName === "codemode" && context.toolCallId && nestedEdits.has(context.toolCallId))) {
				return new Container();
			}
			return operationHeader({
				render(width) {
					if (width <= 0) return [];
					// Collapsed: label line, then detail on its own row — long tool
				// names and arguments must not truncate into the label.
					const lines = [theme.fg("toolTitle", headerLabel())];
					const { detail } = describe();
					if (detail) lines.push(theme.fg("accent", "  ⎿ " + (detail.split(/\r?\n/).find(line => line.trim()) ?? "").trim()));
					return lines.map(line => truncateToWidth(line, width));
				},
				invalidate() {},
			}, theme, context);
		},
		renderResult(result, options, theme, context) {
			if (toolName === "bash" && context.toolCallId
				&& !(options as { isPartial?: boolean }).isPartial && !context.isPartial) {
				redrawHints.delete(context.toolCallId);
			}
			if ((toolName === "edit" || toolName === "write") && context.state) {
				const diff = (result as { details?: { diff?: unknown } }).details?.diff;
				if (context.isError || options.isPartial || context.isPartial) {
					delete context.state.editLineSummary;
					delete context.state.editLineSummaryDiff;
					delete context.state.writeSettled;
				} else if (typeof diff === "string") {
					if (context.state.editLineSummaryDiff !== diff) {
						context.state.editLineSummary = editLineSummary(diff);
						context.state.editLineSummaryDiff = diff;
					}
					if (toolName === "write") context.state.writeSettled = true;
				} else if (toolName === "write") {
					delete context.state.editLineSummary;
					delete context.state.editLineSummaryDiff;
					context.state.writeSettled = true;
				}
			}
			if (!options.expanded && context.isError) {
				const lines = result.content.filter(block => block.type === "text").flatMap(block => block.text.split(/\r?\n/)).map(line => line.trim()).filter(Boolean);
				const error = lines.find(line => /error|failed|rejected|terminated|denied|not found|no such/i.test(line)) ?? "Operation failed (Ctrl+O for details)";
				const args = context.args as { description?: unknown; path?: unknown } | undefined;
				const label = context.state?.detailsCollapsed && typeof args?.description === "string" && args.description.trim()
					? args.description.trim().replace(/\s+/g, " ")
					: context.state?.detailsCollapsed && typeof args?.path === "string" ? `${toolName} ${args.path}` : toolName;
				return {
					render(width) {
						return width > 0 ? [truncateToWidth(theme.fg("error", `✗ ${label}: ${error.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")}`), width)] : [];
					},
					invalidate() {},
				};
			}
			if (!options.expanded) {
				const callId = context.toolCallId;
				if (toolName === "bash" && callId && (options as { isPartial?: boolean }).isPartial) {
					redrawHints.set(callId, () => context.invalidate());
				}
				if (toolName === "bash" && callId && !(options as { isPartial?: boolean }).isPartial) {
					redrawHints.delete(callId);
				}
				if (toolName === "bash" && (options as { isPartial?: boolean }).isPartial) {
					// While the command runs, the tail of its output streams
					// under the row: the reader watches the work, not a spinner.
					const text = result.content.filter(block => block?.type === "text").map(block => (block as { text?: string }).text ?? "").join("\n");
					// Strip terminal control sequences, not only SGR: erase-line
					// and cursor CSI (\x1b[K, \x1b[?25l), OSC payloads, and lone
					// escapes would otherwise leak as visible garbage.
					const tail = text
						// CRLF is a line ending, not an overwrite: normalize
						// before the carriage-return rule below.
						.replace(/\r\n/g, "\n")
						.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
						.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
						.replace(/\x1b./g, "")
						.split("\n")
						.map(line => {
							// A carriage return overwrites the line; only the
							// last segment of a progress line survives.
							const segments = line.split("\r");
							return segments[segments.length - 1];
						})
						.map(line => line.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, " ").trimEnd())
						.filter(line => line.trim())
						.slice(-3);
					if (!tail.length) return new Container();
					return {
						render(width) {
							return width > 0 ? tail.map(line => truncateToWidth(theme.fg("dim", `  ${line}`), width)) : [];
						},
						invalidate() {},
					};
				}
				if (toolName === "bash") {
					// The render seam passes {content, details}; the handoff
					// id travels in details.
					const moved = /^(?:detached|started) (bg-\S+)$/.exec(
						String((result as { details?: { handoff?: unknown } }).details?.handoff ?? ""),
					);
					if (moved) {
						// The call row may have vanished as a read-only probe; the
						// handoff row is then the only place the work is named.
						const args = (context as { args?: { description?: unknown; command?: unknown } }).args;
						const name = typeof args?.description === "string" && args.description.trim()
							? args.description.trim()
							: (String(args?.command ?? "").split(/\r?\n/).find(line => line.trim()) ?? "").trim();
						const headingHidden = context.state?.causal || context.state?.folded
							|| readOnlyInspection(String(args?.command ?? ""));
						return {
							render(width) {
								if (width <= 0) return [];
								const task = context.toolCallId ? backgroundTimings.get(context.toolCallId) : undefined;
								if (task?.id !== moved[1]) return [truncateToWidth(theme.fg("muted", `↳ ${headingHidden && name ? `${name} · ` : ""}${moved[1]}`), width)];
								// The header shows the outcome, so its notification row is redundant.
								if (!task.processAlive && FINAL_STATES.has(task.state)) renderedBackgroundOutcomes.add(task.id);
								// The header carries the tag; this row exists only when the
								// header is hidden and the work would go unnamed.
								if (!headingHidden) return [];
								return [truncateToWidth(theme.fg(task.state === "failed" ? "error" : "muted", `↳ ${name ? `${name} · ` : ""}${backgroundTag(task, true)}`), width)];
							},
							invalidate() {},
						};
					}
				}
				if (toolName === "read") {
					// An image the model read is content, not a probe: the
					// collapse keeps one mechanical line naming it.
					const images = result.content.filter(block => block?.type === "image").length;
					if (images > 0) {
						return {
							render(width) {
								return width > 0 ? [truncateToWidth(theme.fg("muted", `🖼 ${images} image${images === 1 ? "" : "s"} · Ctrl+O for the picture`), width)] : [];
							},
							invalidate() {},
						};
					}
				}
				if (toolName === "edit" || toolName === "write") {
					// Claude Code shows the colored diff under the edit
					// header. The tool carries the display diff in
					// details.diff; renderDiff paints it with the theme's
					// diff tokens. Bounded, with the rest behind Ctrl+O.
					const diff = (result as { details?: { diff?: unknown } }).details?.diff;
					if (typeof diff === "string" && diff.trim().length > 0 && !context.state?.causal && !context.state?.detailsCollapsed) {
						const limit = 12;
						const lines = renderDiff(renderDetailedDiff(diff, theme)).split("\n");
						const shown = lines.slice(0, limit);
						if (lines.length > shown.length) {
							shown.push(theme.fg("dim", `… ${lines.length - shown.length} more diff lines · Ctrl+O for the full change`));
						}
						return {
							render(width) {
								return width > 0 ? shown.map(line => truncateToWidth(line, width)) : [];
							},
							invalidate() {},
						};
					}
				}
				return new Container();
			}
			return (next() ?? builtInRenderers[toolName])?.renderResult?.(result, options, theme, forDelegate(context)) ?? new Text(result.content.filter(block => block.type === "text").map(block => block.text).join("\n"), 0, 0);
		},
	}));

	pi.registerTool({
		...original,
		promptGuidelines: [
			...(original.promptGuidelines ?? []),
			"Every bash call MUST fill `description`: a clear, concise label in active voice, 5-10 words, shown to the user above the command (example: 'Check the git status'). Do not omit it.",
			"Pass run_in_background: true when a command is expected to take more than a few seconds; the call returns at once and a completion notification brings the result.",
		],
		parameters,
		description: `${original.description} Commands that run past ${Math.round(BUDGET_MS / 1000)}s move to the background automatically (the call returns a task id and a completion notification arrives later); Ctrl+B or Ctrl+Shift+B converts the running command by hand. Pass run_in_background: true to start in the background from the beginning.`,
		renderCall(args, theme, context) {
			return renderBashCall(args, theme, context.expanded, context.cwd);
		},
		async execute(toolCallId, input, signal, onUpdate, ctx): Promise<{ content: unknown[]; structuredContent?: unknown; isError?: boolean }> {
			const { description, run_in_background, ...rest } = input as typeof input & {
				description?: string;
				run_in_background?: boolean;
			};
			if (!description?.trim()) {
				return {
					content: [
						{
							type: "text",
							text: "Every bash call needs a short human-readable `description` (5-10 words, active voice): it is the label the user reads. Retry with it filled in.",
						},
					],
					isError: true,
				};
			}
			if (run_in_background) {
				const cwd = ctx?.cwd ?? process.cwd();
				// A deadline the platform timer cannot represent would fire
				// at once and kill a healthy task; clamp like the core does.
				const timeoutSeconds =
					typeof rest.timeout === "number" &&
					Number.isFinite(rest.timeout) &&
					rest.timeout > 0
						? Math.min(rest.timeout, 86_400)
						: undefined;
				const id = startBackground(rest.command, description, cwd);
				const timing = tasks.get(id);
				if (timing) backgroundTimings.set(toolCallId, timing);
				const label = description ?? rest.command.slice(0, 60);
				// The caller's deadline still applies to a background start.
				if (timeoutSeconds !== undefined) {
					const task = tasks.get(id);
					const timer = setTimeout(
						() => {
							if (task?.processAlive && task.pid > 0) {
								task.killRequested = true;
								killTree(task.pid);
							}
						},
						timeoutSeconds * 1000,
					);
					timer.unref?.();
				}
				return {
					content: [
						{
							type: "text",
							text: [
								`Background task ${id} started: ${label}`,
								`Command: ${rest.command}`,
								`Output is being written to: ${tasks.get(id)?.logPath}`,
								WAIT_GUIDANCE,
							].join("\n"),
						},
					],
					structuredContent: {
						output: `started ${id}`,
						truncated: false,
						exit_code: 0,
						wall_time_seconds: 0,
					},
					details: { handoff: `started ${id}` },
				};
			}
			if (isBareSleep(rest.command)) {
				return {
					content: [
						{
							type: "text",
							text: "Blocked: a bare sleep in the foreground wastes the turn. Run waiting in the background with run_in_background: true instead.",
						},
					],
					isError: true,
				};
			}

			// Foreground through the proxy: the call can be detached while
			// it runs.
			// Nested call ids carry '/' and '|'; a file name must not.
			const safeId = toolCallId.replace(/[^a-zA-Z0-9_-]/g, "_");
			const logPath = join(tmpdir(), `pi-bg-${Date.now()}-${safeId}.log`);
			const call: ActiveCall = {
				toolCallId,
				command: rest.command,
				description,
				state: "foreground",
				logPath,
				logFd: openSync(logPath, "a"),
				startedAt: Date.now(),
				bytes: 0,
				settleOuter: null,
				innerPromise: Promise.resolve({ exitCode: 0 }),
				execStarted: false,
				childPid: undefined,
				controller: new AbortController(),
				detachRequested: new Promise<"budget" | "user">((resolve) => {
					callRequestDetachers.set(toolCallId, resolve);
				}),
				requestDetach: () => {},
				hintRequested: false,
			};
			let budgetTimer: NodeJS.Timeout | undefined;
			const requestDetach = () => {
				callRequestDetachers.get(toolCallId)?.("user");
			};
			call.requestDetach = requestDetach;

			const budget = new Promise<"budget" | "user">((resolve) => {
				budgetTimer = setTimeout(() => resolve("budget"), BUDGET_MS);
				budgetTimer.unref?.();
			});

			active.set(toolCallId, call);
			const hintTimer = setTimeout(() => {
				if (call.state === "foreground") call.hintRequested = true;
			}, MANUAL_BG_HINT_MS);
			hintTimer.unref?.();
			const coreExecute = callContext.run(call, async () => {
				try {
					const result = await original.execute(toolCallId, rest, signal, onUpdate, ctx);
					if (!call.execStarted) finishCall(call, 0);
					return result;
				} catch (error) {
					finishCall(call, null);
					throw error;
				}
			});

			let outcome;
			try {
				outcome = await Promise.race([
					coreExecute.then((result) => ({ kind: "done" as const, result })),
					Promise.race([budget, call.detachRequested]).then((why) => ({
						kind: "detach" as const,
						why,
					})),
				]);
			} finally {
				clearTimeout(budgetTimer);
				clearTimeout(hintTimer);
				callRequestDetachers.delete(toolCallId);
			}

			if (outcome.kind === "done") {
				return outcome.result as { content: unknown[] };
			}
			const task = detach(call);
			if (!task) {
				// Lost the race against completion: the core result stands.
				const result = await coreExecute;
				return result as { content: unknown[] };
			}
			// The core promise settles at real exit; its result is discarded.
			coreExecute.then(
				() => {},
				() => {},
			);
			const label = description ?? rest.command.slice(0, 60);
			const by = outcome.why === "user" ? "moved to the background by keyboard shortcut" : `ran past ${Math.round(BUDGET_MS / 1000)}s and was moved to the background`;
			return {
				content: [
					{
						type: "text",
						text: [
							`Command ${by}.`,
							`Background task ${task.id}: ${label}`,
							`Command: ${rest.command}`,
							`It is still running. Output is being written to: ${task.logPath}`,
							WAIT_GUIDANCE,
						].join("\n"),
					},
				],
				structuredContent: {
					output: `detached ${task.id}`,
					truncated: false,
					exit_code: 0,
					wall_time_seconds: Math.round(BUDGET_MS / 1000),
				},
				details: { handoff: `detached ${task.id}` },
			};
		},
	});

	// A write's effect on the reader is how many lines changed, not how many
	// the file holds: pair the previous text with the new one and let the
	// write row show the same +N/-N/~N counts and diff body as an edit.
	pi.registerTool({
		...builtInRenderers.write,
		async execute(toolCallId, input, signal, onUpdate, ctx) {
			const native = builtInRenderers.write;
			if (!native) return undefined;
			const requested = String((input as { path?: unknown }).path ?? "");
			const absolute = isAbsolute(requested) ? requested : join(process.cwd(), requested);
			const previous = requested ? boundedReadText(absolute) : undefined;
			const result = await native.execute(toolCallId, input, signal, onUpdate, ctx);
			if (result && !result.isError && previous !== undefined) {
				const content = (input as { content?: unknown }).content;
				if (typeof content === "string") {
					const diff = writeDiffText(previous, content);
					if (diff !== undefined) {
						return { ...result, details: { ...(result.details ?? {}), diff } };
					}
				}
			}
			return result;
		},
	});

	pi.registerTool({
		name: "bg_status",
		label: "Background task status",
		description:
			"List the background bash tasks of this session: id, state, exit code once finished, command, duration, log size. Use this to see how many shells are running.",
		parameters: {
			type: "object",
			properties: {},
			additionalProperties: false,
		} as const,
		async execute(toolCallId) {
			const rows = [...tasks.values()].map((task) => {
				const duration = Math.round((Date.now() - task.startedAt) / 1000);
				const label = task.description ?? task.command.slice(0, 60);
				if (FINAL_STATES.has(task.state) && reachesModel(toolCallId)) task.finalSeen = true;
				return [
					`${task.id}  ${task.state.padEnd(9)} ${String(duration).padStart(5)}s  ${task.bytes}B${task.exit ? `  exit ${exitText(task.exit)}` : ""}`,
					`  \u23BF ${label}`,
					`      ${task.command.slice(0, 70)}`,
				].join("\n");
			});
			return {
				content: [
					{
						type: "text",
						text: rows.length ? rows.join("\n") : "No background tasks.",
					},
				],
			};
		},
	});

	pi.registerTool({
		name: "bg_logs",
		label: "Background task logs",
		description:
			"Read the tail of a background task's output, after a header line with its state and exit code. Takes the task id and an optional number of tail bytes (default 2000).",
		parameters: {
			type: "object",
			properties: {
				id: { type: "string", description: "Task id, for example bg-1" },
				bytes: { type: "number", description: "How many tail bytes to read (default 2000)" },
			},
			required: ["id"],
			additionalProperties: false,
		} as const,
		async execute(toolCallId, input) {
			const task = tasks.get((input as { id: string }).id);
			if (!task) {
				return {
					content: [{ type: "text", text: "No such background task." }],
					isError: true,
				};
			}
			const bytes = (input as { bytes?: number }).bytes ?? 2000;
			const header = `[${task.id} ${task.state}${task.exit ? `, exit ${exitText(task.exit)}` : ""}]`;
			const text = `${header}\n${tailBytes(task.logPath, bytes) || "(no output yet)"}`;
			if (FINAL_STATES.has(task.state) && reachesModel(toolCallId)) task.finalSeen = true;
			return { content: [{ type: "text", text }] };
		},
	});

	pi.registerTool({
		name: "bg_kill",
		label: "Kill background task",
		description:
			"Stop a background task: SIGTERM to its process group, SIGKILL after 5 seconds if it survives.",
		parameters: {
			type: "object",
			properties: {
				id: { type: "string", description: "Task id, for example bg-1" },
			},
			required: ["id"],
			additionalProperties: false,
		} as const,
		async execute(_id, input) {
			const task = tasks.get((input as { id: string }).id);
			if (!task) {
				return {
					content: [{ type: "text", text: "No such background task." }],
					isError: true,
				};
			}
			backgroundTimings.set(_id, task);
			if (!task.processAlive) {
				return {
					content: [
						{ type: "text", text: `${task.id} already ${task.state}.` },
					],
				};
			}
			if (task.pid > 0) {
				killTree(task.pid);
			} else {
				// A detached foreground call whose pid is not known yet:
				// aborting the proxy signal still stops the child.
				for (const call of active.values()) {
					if (call.task === task) call.controller.abort();
				}
			}
			task.state = "stopping";
			task.killRequested = true;
			return {
				content: [
					{ type: "text", text: `Sent SIGTERM to ${task.id} (${task.command.slice(0, 60)}).` },
				],
			};
		},
	});

	function killTree(pid: number): void {
		try {
			process.kill(-pid, "SIGTERM");
		} catch {
			return;
		}
		const timer = setTimeout(() => {
			try {
				process.kill(-pid, "SIGKILL");
			} catch {
				// Already gone.
			}
		}, KILL_GRACE_MS);
		timer.unref?.();
	}

	/** A watch: the notification fires on an output match, not on exit. */
	function startWatch(
		command: string,
		pattern: string,
		killOnMatch: boolean,
		description: string | undefined,
		cwd: string,
	): string | string {
		let regex: RegExp;
		try {
			regex = new RegExp(pattern);
		} catch (error) {
			return `Invalid pattern: ${error instanceof Error ? error.message : String(error)}`;
		}
		// A small carry-over keeps a match from splitting across chunks.
		let carry = "";
		const { id } = spawnLogged(command, description, cwd, () => nextTaskId(), (task, chunk) => {
			// Test the whole window first; trim only what carries to the
			// next chunk, or a match early in a large chunk is lost.
			const window = carry + chunk.toString("utf8");
			carry = window.slice(-8192);
			if (task.state === "running" && regex.test(window)) {
				task.state = "matched";
				notify(
					task,
					`output matched ${JSON.stringify(pattern)}`,
					tailBytes(task.logPath, NOTIFY_TAIL_BYTES),
				);
				if (killOnMatch && task.pid > 0) killTree(task.pid);
			}
		});
		tasks.get(id)!.watchPattern = pattern;
		return id;
	}

	pi.registerTool({
		name: "bg_watch",
		label: "Watch a command's output",
		description:
			"Run a command in the background and get one notification when its output matches a pattern (a regex), instead of waiting for exit. For tailing logs and polling until a condition appears. With killOnMatch the process is stopped after the match. If it exits first, the notification says so.",
		parameters: {
			type: "object",
			properties: {
				command: {
					type: "string",
					description: "The command to watch, for example a follow or poll loop",
				},
				pattern: {
					type: "string",
					description: "JavaScript regex that fires the notification when it matches streamed output",
				},
				killOnMatch: {
					type: "boolean",
					description: "Stop the process after the match (default false)",
				},
				description: {
					type: "string",
					description: "Short human-readable description of the watch, shown to the user as its label",
				},
			},
			required: ["command", "pattern", "description"],
			additionalProperties: false,
		} as const,
		async execute(_id, input, _signal, _onUpdate, ctx) {
			const params = input as {
				command: string;
				pattern: string;
				killOnMatch?: boolean;
				description?: string;
			};
			const started = startWatch(
				params.command,
				params.pattern,
				params.killOnMatch ?? false,
				params.description,
				ctx?.cwd ?? process.cwd(),
			);
			if (!started.startsWith("bg-")) {
				return { content: [{ type: "text", text: started }], isError: true };
			}
			const task = tasks.get(started);
			return {
				content: [
					{
						type: "text",
						text: [
							`Watch ${started} started: ${params.description ?? params.command.slice(0, 60)}`,
							`Command: ${params.command}`,
							`Fires when output matches: ${params.pattern}`,
							`Output is being written to: ${task?.logPath}`,
						].join("\n"),
					},
				],
			};
		},
	});

	pi.registerCommand("bg", {
		description: "List the background bash tasks of this session",
		handler: async (_args, ctx) => {
			const rows = [...tasks.values()]
				.map(
					(task) =>
						`${task.id}  ${task.state}\n  \u23BF ${task.description ?? task.command.slice(0, 60)}\n    ${task.command.slice(0, 70)}  ${task.logPath}`,
				)
				.join("\n");
			ctx.ui.notify(rows || "No background tasks.", "info");
		},
	});

	pi.registerMessageRenderer("bg-task-notification", (message, options, theme) => {
		const text = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
		if (options.expanded) return new Text(text, 0, 0);
		const details = message.details as { id?: string; label?: string; state?: string; summary?: string } | undefined;
		const id = details?.id ?? /<id>(.*?)<\/id>/.exec(text)?.[1] ?? "?";
		const summary = details?.summary ?? /<summary>(.*?)<\/summary>/s.exec(text)?.[1] ?? "";
		const state = details?.state ?? /<status>(.*?)<\/status>/.exec(text)?.[1];
		const exit = /<exit>(.*?)<\/exit>/.exec(text)?.[1];
		const outcome = state === "completed" && summary === "completed successfully"
			? `completed${exit !== undefined ? ` (exit code ${exit})` : ""}`
			: summary;
		const color = state === "failed" ? "error" : state === "killed" ? "muted" : state === "running" ? "warning" : "success";
		const icon = state === "failed" ? "✗" : state === "killed" ? "■" : state === "running" ? "?" : "⏺";
		return {
			render(width) {
				if (width <= 0) return [];
				if (["completed", "failed", "killed"].includes(state ?? "") && renderedBackgroundOutcomes.has(id)) return [];
				return [truncateToWidth(theme.fg(color, `${icon} Background command "${details?.label ?? id}" ${outcome}`.replace(/\s+/g, " ")), width)];
			},
			invalidate() {},
		};
	});

	// The dock: footer-model-prefix renders one footer line per entry of the
	// published snapshot; setStatus carries no text and is only the render
	// heartbeat that keeps the seconds ticking while pi is otherwise idle.
	let dockTimer: ReturnType<typeof setInterval> | undefined;
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		// A rebind fires session_start again; the old tick dies with its stale ctx.
		if (dockTimer !== undefined) clearInterval(dockTimer);
		let published = false;
		const timer = setInterval(() => {
			const running = [...tasks.values()].filter((task) => task.processAlive).map(dockTask);
			(globalThis as unknown as SharedRunning)[runningKey] = running;
			if (running.length > 0 || published) {
				published = running.length > 0;
				try {
					ctx.ui.setStatus("bg-tasks", undefined);
				} catch {
					// The ctx went stale between ticks; the interval dies with the
					// session's shutdown handler.
				}
			}
		}, 1000);
		dockTimer = timer;
		timer.unref?.();
		pi.on("session_shutdown", () => {
			if (dockTimer !== undefined) clearInterval(dockTimer);
			dockTimer = undefined;
			(globalThis as unknown as SharedRunning)[runningKey] = [];
			ctx.ui.setStatus("bg-tasks", undefined);
		});
	});

	// Every bash start needs a label, not only background ones: a foreground
	// call can detach at the budget and become a task, and its label must
	// already exist then. Refused on the spot; the model retries labeled.
	pi.on("tool_call", (event) => {
		if (event.toolName !== "bash") return;
		const input = event.input as { description?: string };
		const label = input.description?.trim() ?? "";
		if (!label) {
			return {
				block: true,
				reason:
					"Every bash call needs a short human-readable `description` (5-10 words, active voice): it is the label the user reads, and a foreground call that detaches keeps it. Retry with it filled in.",
			};
		}
		if (/[\u0000-\u001f\u007f-\u009f]/.test(label)) {
			return {
				block: true,
				reason: "The `description` must not contain terminal control characters. Retry with plain text.",
			};
		}
	});

	// The dead-loop guard: bg_wait belongs to pi-subagents and never matches
	// these tasks, so calling it for one is always wrong. bg_logs/bg_status
	// are legitimate to read once, but repeated calls with no state change
	// mean the model is polling instead of waiting for the notification.
	// Eligibility resets when the task's state or output size changes, so a
	// completed task or fresh output is always readable.
	const pollTimes = new Map<string, number[]>();
	const pollKey = Symbol.for("pi.bash-background.poll-key");
	const POLL_COOLDOWN_MS = 30_000;
	const POLL_MAX = 2;
	const POLL_STATUS_MAX = 3;
	let statusTimes: number[] = [];
	pi.on("tool_call", (event) => {
		const input = event.input as { id?: string };
		const id = typeof input?.id === "string" ? input.id : undefined;
		if (event.toolName === "bg_wait" && id && tasks.has(id)) {
			return {
				block: true,
				reason: `${id} is a background bash task, not a subagent run. Do not call bg_wait for it; do other work or end your turn.`,
			};
		}
		if (event.toolName === "bg_status") {
			// bg_status lists all tasks (no id parameter): rate-limit globally.
			const now = Date.now();
			statusTimes = statusTimes.filter((t) => now - t < POLL_COOLDOWN_MS);
			if (statusTimes.length >= POLL_STATUS_MAX) {
				return {
					block: true,
					reason: `You have listed background tasks ${statusTimes.length} times in the last ${POLL_COOLDOWN_MS / 1000}s. Do other work or end your turn; do not poll again.`,
				};
			}
			statusTimes.push(now);
			return;
		}
		if (event.toolName !== "bg_logs" || !id) return;
		const task = tasks.get(id);
		if (task) {
			const key = `${task.state}:${task.bytes}`;
			if (task[pollKey] !== key) {
				task[pollKey] = key;
				pollTimes.delete(id);
			}
		}
		const now = Date.now();
		const times = (pollTimes.get(id) ?? []).filter((t) => now - t < POLL_COOLDOWN_MS);
		if (times.length >= POLL_MAX) {
			const state = task ? task.state : "unknown";
			return {
				block: true,
				reason: `You have checked ${id} ${times.length} times in the last ${POLL_COOLDOWN_MS / 1000}s (state: ${state}). Do other work or end your turn; do not poll again.`,
			};
		}
		times.push(now);
		pollTimes.set(id, times);
	});

	// Nested edit and write calls made by a codemode script leave no rows of
	// their own; their diffs roll up onto the script's row so the change stays
	// visible after the script finishes.
	pi.on("tool_result", (event) => {
		const parent = (event as { parentToolCallId?: string }).parentToolCallId;
		if (!parent) return;
		if (event.toolName !== "edit" && event.toolName !== "write") return;
		if (event.isError) return;
		const diff = (event as { details?: { diff?: unknown } }).details?.diff;
		if (typeof diff !== "string") return;
		let aggregate = nestedEdits.get(parent);
		if (!aggregate) {
			if (nestedEdits.size >= 256) {
				const oldest = nestedEdits.keys().next().value;
				if (oldest !== undefined) nestedEdits.delete(oldest);
			}
			aggregate = { added: 0, removed: 0, changed: 0, files: new Set() };
			nestedEdits.set(parent, aggregate);
		}
		const counts = countDiffRuns(diff);
		aggregate.added += counts.added;
		aggregate.removed += counts.removed;
		aggregate.changed += counts.changed;
		aggregate.files.add(String((event as { input?: { path?: unknown } }).input?.path ?? "unknown"));
	});

	// Background tasks live with the session (Claude parity): they stop
	// when Pi shuts down.
	pi.on("session_shutdown", () => {
		for (const task of tasks.values()) {
			if (task.processAlive && task.pid > 0) {
				try {
					process.kill(-task.pid, "SIGKILL");
				} catch {
					// Already gone.
				}
			}
		}
	});

	// Hidden work made visible: nested tool calls share one session-owned footer.
	let stopNestedTracking: (() => void) | undefined;
	pi.on("session_shutdown", () => {
		stopNestedTracking?.();
		stopNestedTracking = undefined;
	});
	pi.on("session_start", (_event, ctx) => {
		stopNestedTracking?.();
		stopNestedTracking = undefined;
		if (ctx.mode !== "tui") return;
		let running = 0;
		let last = "";
		const show = (): void => {
			try {
				ctx.ui.setStatus(
					"bg-nested",
					running > 0
						? ctx.ui.theme.fg("muted", `\u23BF ${last} (+${running - 1})`)
						: undefined,
				);
			} catch {
				// Stale ctx between ticks.
			}
		};
		const stopStarts = pi.on("tool_execution_start", (event) => {
			if (!event.parentToolCallId) return;
			running += 1;
			const args = event.args && typeof event.args === "object" ? event.args as Record<string, unknown> : {};
			const hint =
				typeof args.command === "string"
					? String(args.command).slice(0, 40)
					: typeof args.path === "string"
						? String(args.path).slice(-40)
						: "";
			last = `${event.toolName}${hint ? ` ${hint}` : ""}`;
			show();
		});
		const done = (event: { parentToolCallId?: string }): void => {
			if (!event.parentToolCallId) return;
			running = Math.max(0, running - 1);
			show();
		};
		const stopEnds = pi.on("tool_execution_end", done);
		stopNestedTracking = () => {
			stopStarts();
			stopEnds();
			running = 0;
			try {
				ctx.ui.setStatus("bg-nested", undefined);
			} catch {
				// The previous session can already be disposed.
			}
		};
	});

	// The teacher for slow foreground calls that complete without a detach
	// (a budget long enough that the call finished under it, but slowly).
	pi.on("tool_result", (event) => {
		if (event.toolName !== "bash" || event.isError) return;
		const structured = event.structuredContent as
			| { wall_time_seconds?: number }
			| undefined;
		const seconds = structured?.wall_time_seconds ?? 0;
		if (seconds < SLOW_FOREGROUND_SECONDS) return;
		const s = event.input as { run_in_background?: boolean };
		if (s.run_in_background) return;
		return {
			content: [
				...event.content,
				{
					type: "text",
					text: `\nThis command blocked the conversation for ${Math.round(seconds)}s. Next time a command is expected to run long, pass run_in_background: true and pick up its result from the completion notification.`,
				},
			],
			// Replacing content without passing structuredContent through
			// drops it, and codemode callers read exactly that.
			structuredContent: event.structuredContent,
		};
	});
}
