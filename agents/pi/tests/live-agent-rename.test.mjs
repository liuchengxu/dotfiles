import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const { takeRename, writeRecord, scanRecords, RENAME_TTL_MS } = await import(new URL("../extensions/lib/live-agent-state.ts", import.meta.url));

const request = (dir, sessionId, payload) => {
  mkdirSync(join(dir, "renames"), { recursive: true });
  writeFileSync(join(dir, "renames", `${sessionId}.json`), typeof payload === "string" ? payload : JSON.stringify(payload));
};

test("takeRename claims a valid request once and leaves nothing behind", () => {
  const dir = mkdtempSync(join(tmpdir(), "wd-rename-"));
  const at = Date.now();
  request(dir, "abc123", { version: 1, name: "prover:pr-640", auto: true, at });
  assert.deepEqual(takeRename(dir, "abc123", at), { name: "prover:pr-640", auto: true, at });
  assert.equal(readdirSync(join(dir, "renames")).length, 0);
  assert.equal(takeRename(dir, "abc123"), undefined);
});

test("manual requests carry no expiry, auto requests expire", () => {
  const dir = mkdtempSync(join(tmpdir(), "wd-rename-"));
  const now = Date.now();
  request(dir, "abc123", { version: 1, name: "old:auto", auto: true, at: now - RENAME_TTL_MS - 1 });
  assert.equal(takeRename(dir, "abc123", now), undefined);
  request(dir, "abc123", { version: 1, name: "old:manual", at: now - RENAME_TTL_MS - 1 });
  assert.deepEqual(takeRename(dir, "abc123", now), { name: "old:manual", auto: false, at: now - RENAME_TTL_MS - 1 });
});

test("takeRename strips control characters, length-limits, and consumes bad payloads", () => {
  const dir = mkdtempSync(join(tmpdir(), "wd-rename-"));
  request(dir, "abc123", { version: 1, name: "a b\nc" });
  assert.equal(takeRename(dir, "abc123").name, "a b c");
  request(dir, "abc124", { version: 1, name: "x".repeat(200) });
  assert.equal(takeRename(dir, "abc124").name.length, 80);
  for (const bad of ["not json", { version: 2, name: "future" }, { version: 1, name: "   " }, { version: 1, name: 5 }]) {
    request(dir, "abc125", bad);
    assert.equal(takeRename(dir, "abc125"), undefined);
    assert.equal(existsSync(join(dir, "renames", "abc125.json")), false);
  }
  assert.equal(takeRename(dir, "../escape"), undefined);
  assert.equal(takeRename(dir, "missing"), undefined);
});

test("an oversized or non-regular claim is dropped without reading it", () => {
  const dir = mkdtempSync(join(tmpdir(), "wd-rename-"));
  request(dir, "abc123", { version: 1, name: "n", padding: "x".repeat(8_192) });
  assert.equal(takeRename(dir, "abc123"), undefined);
  assert.equal(readdirSync(join(dir, "renames")).length, 0);
});

test("rename requests live in a subdir that record scanning ignores", () => {
  const dir = mkdtempSync(join(tmpdir(), "wd-rename-"));
  writeRecord(dir, { version: 1, sessionId: "abc123", pid: 42, name: "n", cwd: "/tmp", model: "m", state: "Idle", tool: "", updatedAt: 1, heartbeatAt: Date.now() });
  request(dir, "abc123", { version: 1, name: "renamed" });
  const rows = scanRecords(dir, Date.now(), () => true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "n");
});
