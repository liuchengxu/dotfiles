import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
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
