import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getAgentDir, SettingsManager, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

export const IDLE_MS = 45 * 60 * 1000;
export const MIN_TOKENS = 200_000;
export const DIGEST_KEY = "idle-compaction-digest";
const ATTEMPT = "idle-compaction-attempt";
const INSTRUCTIONS = "Idle compaction: preserve the user's goals, constraints, decisions, unfinished work, and exact references needed to resume safely.";
const LINE_CAP = 72;

/** The reorientation digest pinned above the editor after idle compaction:
 * the summary's own Goal/In-Progress/Blocked/Next, one line each, so a user
 * returning to a compacted terminal sees where things stand without a
 * keypress. Full summary stays on the transcript's ctrl+o expansion. */
export function digestLines(summary: string, tokensBefore: number): string[] {
	const section = (heading: string): string[] | undefined => {
		const head = summary.match(new RegExp(`^#{2,3} ${heading}\\s*$`, "m"));
		if (!head || head.index === undefined) return undefined;
		const rest = summary.slice(head.index + head[0].length);
		const next = rest.match(/^#{2,3} /m);
		return (next && next.index !== undefined ? rest.slice(0, next.index) : rest).split(/\r?\n/);
	};
	const firstItem = (lines: string[] | undefined): string | undefined => {
		for (const raw of lines ?? []) {
			const text = raw.trim().replace(/^[-*]\s*(\[[ xX]\]\s*)?/, "").replace(/^\d+[.)]\s*/, "").replace(/[`*]/g, "");
			if (text && !/^none\b/i.test(text)) return text.length > LINE_CAP - 5 ? text.slice(0, LINE_CAP - 6).trimEnd() + "…" : text;
		}
		return undefined;
	};
	const rows: [label: string, value: string | undefined][] = [
		["Goal", firstItem(section("Goal"))],
		["Now", firstItem(section("In Progress"))],
		["Block", firstItem(section("Blocked"))],
		["Next", firstItem(section("Next Steps"))],
	];
	const body = rows.filter((row): row is [string, string] => row[1] !== undefined)
		.map(([label, value]) => `${label.padEnd(5)}${value}`);
	const lines = body.length > 0 ? body : summary.split(/\r?\n/).filter((line) => line.trim()).slice(0, 3)
		.map((line) => line.replace(/[`*]/g, "").slice(0, LINE_CAP).trimEnd());
	return [`◇ Compacted while idle · ${tokensBefore.toLocaleString()} tokens · ctrl+o for the full summary`, ...lines];
}

type Controls = {
  enabled(): boolean;
  setEnabled(value: boolean): void;
  autoCompactionEnabled(ctx: ExtensionContext): boolean;
};

export function fileControls(agentDir = getAgentDir()): Controls {
  const path = join(agentDir, "idle-compaction.json");
  return {
    enabled() {
      try { return JSON.parse(readFileSync(path, "utf8")).enabled === true; }
      catch { return false; }
    },
    setEnabled(enabled) {
      const temporary = `${path}.${randomUUID()}.tmp`;
      try {
        writeFileSync(temporary, JSON.stringify({ enabled }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
        renameSync(temporary, path);
      } finally {
        try { unlinkSync(temporary); } catch { /* Rename normally consumed the temporary file. */ }
      }
    },
    autoCompactionEnabled(ctx) {
      const settings = SettingsManager.create(ctx.cwd, agentDir, { projectTrusted: ctx.isProjectTrusted() });
      return settings.drainErrors().length === 0 && settings.getCompactionEnabled();
    },
  };
}

function conversationKey(ctx: ExtensionContext): string | undefined {
  const branch = ctx.sessionManager.getBranch();
  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i];
    // A compacted branch needs new conversation before another idle attempt.
    if (entry.type === "compaction") return;
    if (entry.type === "message" || entry.type === "custom_message") return entry.id;
  }
}

function wasAttempted(ctx: ExtensionContext, key: string): boolean {
  return ctx.sessionManager.getEntries().some((entry) => entry.type === "custom"
    && entry.customType === ATTEMPT && typeof entry.data === "object" && entry.data !== null
    && "conversationKey" in entry.data && entry.data.conversationKey === key);
}

export default function idleCompaction(pi: ExtensionAPI, controls: Controls = fileControls()): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let unsubscribeInput: (() => void) | undefined;
  let attempt: { generation: number; sessionId: string; leafId: string | null } | undefined;

  function cancelTimer() {
    generation++;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function canStart(ctx: ExtensionContext): boolean {
    const tokens = ctx.getContextUsage()?.tokens;
    return ctx.mode === "tui" && !!ctx.model && controls.enabled() && controls.autoCompactionEnabled(ctx)
      && ctx.isIdle() && !ctx.hasPendingMessages() && ctx.ui.getEditorText().trim() === ""
      && typeof tokens === "number" && Number.isFinite(tokens) && tokens >= MIN_TOKENS;
  }

  /** The digest dies on the user's next action; it must never outlive the
   * moment it describes or leak into another session. */
  function hideDigest(ctx: ExtensionContext): void {
    try { if (ctx.mode === "tui") ctx.ui.setWidget(DIGEST_KEY, undefined); } catch { /* A retired context has no UI left. */ }
  }

  function schedule(ctx: ExtensionContext) {
    cancelTimer();
    try {
      if (ctx.mode !== "tui" || attempt || !controls.enabled()) return;
      const key = conversationKey(ctx);
      if (!key || wasAttempted(ctx, key)) return;
      const epoch = generation;
      const sessionId = ctx.sessionManager.getSessionId();
      const leafId = ctx.sessionManager.getLeafId();
      timer = setTimeout(() => {
        timer = undefined;
        try {
          if (generation !== epoch || ctx.sessionManager.getSessionId() !== sessionId || attempt) return;
          if (ctx.sessionManager.getLeafId() !== leafId) {
            schedule(ctx);
            return;
          }
          if (!canStart(ctx)) return;
          // Persist before launching so failures/reloads do not repeatedly bill unchanged history.
          pi.appendEntry(ATTEMPT, { conversationKey: key });
          const current = { generation: epoch, sessionId, leafId: ctx.sessionManager.getLeafId() };
          attempt = current;
          const finish = (success: boolean) => {
            if (attempt !== current) return;
            attempt = undefined;
            try {
              if (ctx.sessionManager.getSessionId() !== sessionId) return;
              ctx.ui.notify(success ? "Idle compaction finished. Original transcript retained."
                : "Idle compaction stopped or failed; no automatic retry for this conversation.", success ? "info" : "warning");
            } catch { /* The runtime may have been replaced while compaction completed. */ }
          };
          ctx.ui.notify("Compacting after 45 minutes idle (context ≥200K).", "info");
          try { ctx.compact({ customInstructions: INSTRUCTIONS, onComplete: () => finish(true), onError: () => finish(false) }); }
          catch { finish(false); }
        } catch { /* A retired context or unavailable settings must never start work. */ }
      }, IDLE_MS);
      timer.unref?.();
    } catch { /* No timer survives a stale context. */ }
  }

  pi.on("session_start", (_event, ctx) => {
    cancelTimer();
    attempt = undefined;
    hideDigest(ctx);
    unsubscribeInput?.();
    unsubscribeInput = ctx.mode === "tui" ? ctx.ui.onTerminalInput(() => { schedule(ctx); }) : undefined;
    schedule(ctx);
  });
  pi.on("agent_settled", (_event, ctx) => { schedule(ctx); });
  pi.on("before_agent_start", (_event, ctx) => { cancelTimer(); hideDigest(ctx); });
  pi.on("input", (_event, ctx) => { cancelTimer(); hideDigest(ctx); });
  pi.on("message_start", (_event, ctx) => { cancelTimer(); hideDigest(ctx); });
  pi.on("model_select", (_event, ctx) => { schedule(ctx); });
  pi.on("session_info_changed", (_event, ctx) => { schedule(ctx); });
  pi.on("session_before_switch", (_event, ctx) => { cancelTimer(); hideDigest(ctx); });
  pi.on("session_before_fork", (_event, ctx) => { cancelTimer(); hideDigest(ctx); });
  pi.on("session_before_tree", (_event, ctx) => { cancelTimer(); hideDigest(ctx); });
  pi.on("session_tree", (_event, ctx) => { schedule(ctx); });
  pi.on("session_before_compact", (event, ctx) => {
    if (event.customInstructions !== INSTRUCTIONS) {
      cancelTimer();
      return;
    }
    if (!attempt) return { cancel: true };
    // compact() awaits abort() before this hook; activity can arrive in that gap.
    const current = attempt;
    try {
      if (generation !== current.generation || ctx.sessionManager.getSessionId() !== current.sessionId
        || ctx.sessionManager.getLeafId() !== current.leafId || !controls.enabled()
        || !controls.autoCompactionEnabled(ctx) || ctx.hasPendingMessages() || ctx.ui.getEditorText().trim() !== "") return { cancel: true };
    } catch { return { cancel: true }; }
  });
  pi.on("session_compact", (event, ctx) => {
    if (!attempt) {
      cancelTimer();
      return;
    }
    // Fired while our attempt is live: the summary reorients the model, the
    // digest reorients the returning user.
    try {
      const entry = event.compactionEntry;
      if (ctx.mode === "tui" && typeof entry?.summary === "string") {
        ctx.ui.setWidget(DIGEST_KEY, digestLines(entry.summary, entry.tokensBefore), { placement: "aboveEditor" });
      }
    } catch { /* A retired context cannot show the digest. */ }
  });
  pi.on("session_shutdown", (_event, ctx) => {
    cancelTimer();
    attempt = undefined;
    hideDigest(ctx);
    unsubscribeInput?.();
    unsubscribeInput = undefined;
  });

  pi.registerCommand("idle-compact", {
    description: "Idle compaction: on, off, or status (45 minutes, at least 200K tokens)",
    handler: async (args, ctx) => {
      const action = args.trim() || "status";
      if (!["on", "off", "status"].includes(action)) {
        ctx.ui.notify("Usage: /idle-compact on|off|status", "warning");
        return;
      }
      if (action !== "status") {
        try { controls.setEnabled(action === "on"); }
        catch { ctx.ui.notify("Could not save idle-compaction setting.", "error"); return; }
        schedule(ctx);
      }
      ctx.ui.notify(`Idle compaction ${controls.enabled() ? "on" : "off"}: 45 minutes, context ≥200K; requires Pi auto-compaction enabled. Applies to future attempts.`, "info");
    },
  });
}
