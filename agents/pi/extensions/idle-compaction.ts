import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { getAgentDir, SettingsManager, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

export type DigestTheme = Pick<ExtensionContext["ui"]["theme"], "fg">;
const identityTheme: DigestTheme = { fg: (_name, text) => text };

export const IDLE_MS = 45 * 60 * 1000;
export const MIN_TOKENS = 200_000;
export const DIGEST_KEY = "idle-compaction-digest";
const ATTEMPT = "idle-compaction-attempt";
const INSTRUCTIONS = "Idle compaction: preserve the user's goals, constraints, decisions, unfinished work, and exact references needed to resume safely. Then add a '## Recap' section: 3-5 short plain-language lines (at most 70 columns each, no markdown emphasis or bullets) capturing the core points for someone returning — what the user wants, where things stand, any blocker, the next step. End the summary with a final line of the form 'Overall progress: ~N%' where N is your honest 0-100 estimate of how much of the user's overall goal is now complete, reassessed against the current goal rather than carried forward from an earlier summary.";
const LINE_CAP = 72;

/** The reorientation digest pinned above the editor after idle compaction.
 * The summarizer's own '## Recap' — 3-5 plain lines written as a summary — is
 * pinned, normalized (bullets and emphasis stripped) and wrapped rather than
 * ellipsized, because written prose reads better than mechanically extracted
 * list items. Rendered rows carry a budget with a visible omission marker, so
 * the digest can never grow unbounded or lose text silently. Summaries without
 * a Recap (older compactions) fall back to one row per section, wrapped the
 * same way. Full summary stays on the transcript's ctrl+o expansion. */
export function digestLines(summary: string, tokensBefore: number, theme: DigestTheme = identityTheme): string[] {
	const section = (heading: string): string[] | undefined => {
		const head = summary.match(new RegExp(`^#{2,3} ${heading}\\s*$`, "m"));
		if (!head || head.index === undefined) return undefined;
		const rest = summary.slice(head.index + head[0].length);
		const next = rest.match(/^#{2,3} /m);
		return (next && next.index !== undefined ? rest.slice(0, next.index) : rest).split(/\r?\n/);
	};
	const clean = (raw: string): string => raw.trim().replace(/^[-*+]\s*(?:\[[ xX]\]\s*)?/, "").replace(/^\d+[.)]\s*/, "")
		.replace(/`([^`]*)`/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1");
	// Wrap cleaned text; normalization happens once, at the call site —
	// wrapping must not strip a second time ("- -flag" would lose "-flag").
	// A line that outgrows the digest folds to the next row; an unbreakable
	// token is cut hard, without a trailing mark.
	const wrap = (text: string, width: number): string[] => {
		const out: string[] = [];
		let line = "";
		for (const word of text.split(/\s+/).filter(Boolean)) {
			if (!line) line = word;
			else if (visibleWidth(line) + 1 + visibleWidth(word) <= width) line += " " + word;
			else { out.push(line); line = word; }
		}
		if (line) out.push(line);
		return (out.length ? out : [""]).map(l => truncateToWidth(l, width, ""));
	};
	const firstItem = (lines: string[] | undefined): string | undefined => {
		for (const raw of lines ?? []) {
			const text = clean(raw);
			// "None" alone is the compaction prompt's empty-section marker; a
			// sentence like "None of the tests pass" is a real blocker.
			if (!text || /^none\s*(?:[—–.:-]|$)/i.test(text)) continue;
			return text;
		}
		return undefined;
	};
	const recap = (section("Recap") ?? []).map(clean).filter(l => l && !/^overall progress:/i.test(l));
	// The prompt asks for five short lines, but a prompt is not enforcement:
	// only the rendered-row budget is, and any overflow leaves a marker.
	const RECAP_ROW_BUDGET = 7;
	let body: string[];
	if (recap.length > 0) {
		const rows = recap.flatMap(line => wrap(line, LINE_CAP - 2).map(l => "  " + l));
		body = rows.length > RECAP_ROW_BUDGET
			? [...rows.slice(0, RECAP_ROW_BUDGET - 1), theme.fg("dim", `  … ${rows.length - RECAP_ROW_BUDGET + 1} more rows in the full summary`)]
			: rows;
	} else {
		const rows: [glyph: string, label: string, semantic: Parameters<DigestTheme["fg"]>[0], value: string | undefined][] = [
			["●", "Goal", "accent", firstItem(section("Goal"))],
			["◉", "Now", "warning", firstItem(section("In Progress"))],
			["⚠", "Block", "error", firstItem(section("Blocked"))],
			["▸", "Next", "dim", firstItem(section("Next Steps"))],
		];
		body = rows.filter((row): row is [string, string, string, string] => row[3] !== undefined)
			.flatMap(([glyph, label, semantic, value]) => {
				const wrapped = wrap(value, LINE_CAP - 8);
				// Two rows per section; overflow is marked, never lost silently. The
				// marker is appended by hand: truncateToWidth ellipsizes only a row
				// that is itself long, and the omitted tail can sit behind a short one.
				const shown = wrapped.slice(0, 2);
				if (wrapped.length > 2) shown[1] = truncateToWidth(shown[1], LINE_CAP - 9, "") + "…";
				return shown.map((line, i) => {
					if (i === 0) return theme.fg(semantic, glyph) + theme.fg("dim", ` ${label.padEnd(5)}`) + " " + line;
					return " ".repeat(8) + line;
			});
		});
	}
	const lines = body.length > 0 ? body
		: [section("Goal"), section("In Progress"), section("Blocked"), section("Next Steps")].some(Boolean)
			? [] // Sections parsed but nothing actionable: the header still orients.
			: summary.split(/\r?\n/).filter((line) => line.trim()).slice(0, 3)
				.map((line) => "  " + truncateToWidth(line.replace(/[`*]/g, ""), LINE_CAP - 2, "…"));
	const progress = progressPercent(summary, section);
	const tokens = `${tokensBefore.toLocaleString()} tokens`;
	const tail = "ctrl+o full summary";
	const head = progress === undefined ? `◇ idle compaction · ${tokens}` : "◇ idle compaction";
	const rule = "─".repeat(Math.max(3, LINE_CAP - visibleWidth(head) - visibleWidth(tail) - 2));
	const header = theme.fg("accent", "◇") + head.slice(1) + " " + theme.fg("dim", rule) + " " + theme.fg("dim", tail);
	if (progress === undefined) return [header, ...lines];
	const filled = Math.round(progress * 18 / 100);
	const bar = "  " + theme.fg("accent", "█".repeat(filled)) + theme.fg("dim", "░".repeat(18 - filled))
		+ theme.fg("accent", ` ~${progress}%`) + theme.fg("dim", ` · ${tokens}`);
	return [header, bar, ...lines];
}

/** The summarizer's own estimate when present (it read everything); else the
 * Done share of the summary's list items. Both are impressions, not metrics. */
function progressPercent(summary: string, section: (heading: string) => string[] | undefined): number | undefined {
	// A complete standalone line only: prose mentions, negated values, and
	// percentages on a following line must not read as the summarizer's own.
	const stated = [...summary.matchAll(/^overall progress:[ \t]*~?[ \t]*(\d{1,3})[ \t]*%[ \t]*$/gim)]
		.map((match) => Number(match[1])).filter((value) => value <= 100);
	if (stated.length > 0) return stated.at(-1);
	const items = (heading: string) => (section(heading) ?? []).filter((line) => {
		const text = line.replace(/[`*]/g, "");
		return /^\s*(?:[-*+]|\d+[.)])\s/.test(text) && !/^\s*(?:[-*+]|\d+[.)])\s*none\s*(?:[—–.:-]|$)/i.test(text);
	}).length;
	const done = items("Done");
	const remaining = items("In Progress") + items("Blocked");
	return done + remaining > 0 ? Math.round((done / (done + remaining)) * 100) : undefined;
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
  let digestPinned = false;

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
    try {
      if (ctx.mode === "tui" && digestPinned) {
        ctx.ui.setWidget(DIGEST_KEY, undefined);
        digestPinned = false;
      }
    } catch { /* A retired context has no UI left. */ }
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
    unsubscribeInput = ctx.mode === "tui" ? ctx.ui.onTerminalInput(() => { hideDigest(ctx); schedule(ctx); }) : undefined;
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
      hideDigest(ctx);
      return;
    }
    try {
      const entry = event.compactionEntry;
      if (ctx.mode === "tui" && typeof entry?.summary === "string") {
        ctx.ui.setWidget(DIGEST_KEY, digestLines(entry.summary, entry.tokensBefore, ctx.ui.theme), { placement: "aboveEditor" });
        digestPinned = true;
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
