import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Independent implementation inspired by FrederickAlt/pi-agent-dashboard's
// per-session status files and heartbeat TTL. No upstream source is copied.
export type AgentState = "Running" | "Waiting" | "Idle" | "Stopped";
export interface AgentRecord {
  version: 1;
  sessionId: string;
  pid: number;
  name: string;
  cwd: string;
  model: string;
  state: AgentState;
  tool: string;
  updatedAt: number;
  heartbeatAt: number;
}
export type AgentRow = AgentRecord & { displayState: AgentState | "Stale" };
export const HEARTBEAT_MS = 5_000;
export const STALE_MS = 20_000;
export const clean = (s: string): string => s.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
export const recordKey = (r: Pick<AgentRecord, "sessionId" | "pid">): string => `${r.sessionId}:${r.pid}`;

export function writeRecord(dir: string, record: AgentRecord): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(record.sessionId)) throw new Error("Invalid session ID");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  // PID separates even two instances that open the same saved session.
  const file = join(dir, `${record.sessionId}-${record.pid}.json`);
  const temp = `${file}.tmp`;
  writeFileSync(temp, JSON.stringify(record), { mode: 0o600 });
  renameSync(temp, file);
}

function valid(value: unknown): value is AgentRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as AgentRecord;
  return r.version === 1 && ["sessionId", "name", "cwd", "model", "tool"].every(k => typeof (r as any)[k] === "string")
    && Number.isSafeInteger(r.pid) && r.pid > 0
    && ["Running", "Waiting", "Idle", "Stopped"].includes(r.state)
    && Number.isFinite(r.updatedAt) && Number.isFinite(r.heartbeatAt);
}

export function processExists(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}

export interface RenameRequest { name: string; auto: boolean; at: number }
export const RENAME_TTL_MS = 10 * 60_000;
const RENAME_MAX_BYTES = 4_096;

/**
 * Claims one rename request written by watchdeck under `dir/renames/` by
 * renaming it aside first: a concurrent writer or second instance can then
 * neither lose a newer request nor read the same one. The claim file is
 * removed whatever happens, so a bad payload never wedges the session.
 * Auto requests (model-proposed names) expire, so one queued before the owner
 * names the session themselves is dropped instead of overwriting them.
 */
export function takeRename(dir: string, sessionId: string, now = Date.now()): RenameRequest | undefined {
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) return undefined;
  const file = join(dir, "renames", `${sessionId}.json`);
  const claim = join(dir, "renames", `.${sessionId}.${process.pid}.${now}.claim`);
  try { renameSync(file, claim); } catch { return undefined; }
  let out: RenameRequest | undefined;
  try {
    const st = statSync(claim);
    if (st.isFile() && st.size <= RENAME_MAX_BYTES) {
      const r = JSON.parse(readFileSync(claim, "utf8")) as { version?: unknown; name?: unknown; auto?: unknown; at?: unknown };
      const name = typeof r.name === "string" ? clean(r.name).trim().slice(0, 80) : "";
      const at = Number.isFinite(r.at) ? Number(r.at) : now;
      if (r.version === 1 && name && (r.auto === undefined || typeof r.auto === "boolean")
        && (!r.auto || now - at <= RENAME_TTL_MS)) out = { name, auto: r.auto === true, at };
    }
  } catch { /* Not a readable request; the claim below still removes it. */ }
  try { rmSync(claim); } catch { /* Nothing re-reads claims; one survivor is inert. */ }
  return out;
}

export function scanRecords(dir: string, now = Date.now(), alive = processExists): AgentRow[] {
  let files: string[];
  try { files = readdirSync(dir); } catch { return []; }
  const rows: AgentRow[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const path = join(dir, file);
      if (statSync(path).size > 32_768) continue;
      const r: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (!valid(r)) continue;
      const stale = now - r.heartbeatAt > STALE_MS || r.heartbeatAt > now + STALE_MS || !alive(r.pid);
      rows.push({ ...r, displayState: r.state === "Stopped" ? "Stopped" : stale ? "Stale" : r.state });
    } catch { /* Ignore malformed, inaccessible, or concurrently replaced records. */ }
  }
  const rank = { Waiting: 0, Running: 1, Idle: 2, Stale: 3, Stopped: 4 };
  return rows.sort((a, b) => rank[a.displayState] - rank[b.displayState] || b.updatedAt - a.updatedAt || recordKey(a).localeCompare(recordKey(b)));
}
