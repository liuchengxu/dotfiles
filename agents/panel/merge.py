#!/usr/bin/env python3
"""Merge per-lane reviewer output into one panel report.

Lanes do not reliably honour --output-schema: a third-party Responses
implementation may not enforce it, so a model may return its own field names
wrapped in a markdown fence. Rather than drop that output, this normalises the
field names it actually uses and records what had to be repaired, so a lane
whose shape drifted is still visible as a review rather than silently lost.
"""

import json
import os
import re
import sys

# Field synonyms seen in practice. The first name is canonical.
FINDING_FIELDS = {
    "title": ("title", "summary", "description", "issue", "name"),
    "file": ("file", "path", "filename"),
    "line": ("line", "line_number", "lineno"),
    "severity": ("severity", "priority", "level"),
    "blocking": ("blocking", "is_blocking", "must_fix"),
    "failure_scenario": ("failure_scenario", "impact", "consequence", "failure", "scenario"),
    "evidence": ("evidence", "proof", "trace", "justification"),
    "fix": ("fix", "recommendation", "remediation", "suggested_fix", "suggestion"),
}
DISMISSED_FIELDS = {
    "title": ("title", "summary", "description", "issue", "name"),
    "file": ("file", "path", "filename"),
    "why_not_a_defect": ("why_not_a_defect", "invariant", "reason", "rationale", "why"),
}
SEVERITIES = ("critical", "high", "medium", "low")


def extract_json(raw):
    """Return the JSON object in `raw`, tolerating fences and surrounding prose."""
    raw = raw.strip()
    for candidate in _candidates(raw):
        try:
            value = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(value, dict):
            return value
    return None


def _candidates(raw):
    yield raw
    fence = re.search(r"```(?:json)?\s*(.*?)```", raw, re.S)
    if fence:
        yield fence.group(1)
    start = raw.find("{")
    if start != -1:
        depth, in_str, esc = 0, False, False
        for i, ch in enumerate(raw[start:], start):
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
            elif ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    yield raw[start:i + 1]
                    return


def normalise(item, spec):
    """Map an item's fields onto canonical names; report which were missing."""
    out, repaired = {}, []
    for canonical, aliases in spec.items():
        for alias in aliases:
            if alias in item and item[alias] not in (None, ""):
                out[canonical] = item[alias]
                if alias != canonical:
                    repaired.append(f"{alias}->{canonical}")
                break
    return out, repaired


def clean_finding(raw_finding):
    finding, repaired = normalise(raw_finding, FINDING_FIELDS)

    # Some models collapse severity and blocking into one field.
    severity = str(finding.get("severity", "")).strip().lower()
    if severity in ("blocking", "blocker", "p0"):
        finding["severity"] = "critical"
        finding.setdefault("blocking", True)
        repaired.append(f"severity({severity})->critical+blocking")
    elif severity in ("p1",):
        finding["severity"] = "high"
    elif severity not in SEVERITIES:
        finding["severity"] = "medium"
        if severity:
            repaired.append(f"severity({severity})->medium")

    if isinstance(finding.get("blocking"), str):
        finding["blocking"] = finding["blocking"].strip().lower() in ("true", "yes", "1")

    missing = [f for f in ("title", "file", "failure_scenario", "evidence")
               if not finding.get(f)]
    return finding, repaired, missing


def main():
    outdir, lanes = sys.argv[1], sys.argv[2:]
    panel = {"lanes": [], "findings": [], "dismissed": []}

    for lane in lanes:
        status_path = os.path.join(outdir, f"{lane}.status")
        status = "no-status"
        if os.path.exists(status_path):
            parts = open(status_path).read().rstrip("\n").split("\t")
            if len(parts) > 1:
                status = parts[1]
        entry = {"lane": lane, "status": status, "repaired": [], "degraded": 0}

        json_path = os.path.join(outdir, f"{lane}.json")
        if status == "ok" and os.path.exists(json_path):
            data = extract_json(open(json_path).read())
            if data is None:
                entry["status"] = "unparseable-json"
            else:
                entry["files_examined"] = data.get("files_examined", []) or []
                for raw_finding in data.get("findings", []) or []:
                    finding, repaired, missing = clean_finding(raw_finding)
                    finding["found_by"] = lane
                    if missing:
                        finding["incomplete_fields"] = missing
                        entry["degraded"] += 1
                    entry["repaired"] += repaired
                    panel["findings"].append(finding)
                for raw_dismissed in data.get("dismissed", []) or []:
                    dismissed, repaired = normalise(raw_dismissed, DISMISSED_FIELDS)
                    dismissed["dismissed_by"] = lane
                    entry["repaired"] += repaired
                    panel["dismissed"].append(dismissed)
        panel["lanes"].append(entry)

    with open(os.path.join(outdir, "panel.json"), "w") as fh:
        json.dump(panel, fh, indent=2)

    render(panel)


def render(panel):
    rank = {s: i for i, s in enumerate(SEVERITIES)}
    panel["findings"].sort(key=lambda f: (rank.get(f.get("severity"), 9),
                                          f.get("file", ""), f.get("line") or 0))
    ok = [l for l in panel["lanes"] if l["status"] == "ok"]
    failed = [l for l in panel["lanes"] if l["status"] != "ok"]

    print("# Panel review\n")

    if os.environ.get("PANEL_DRIFT"):
        print("> **The working tree changed while this review ran.** Line numbers "
              "below may no longer point at the code that was reviewed. Re-run "
              "before acting on anything positional.\n")

    if failed:
        print("> **Incomplete panel.** These lanes produced no review and are "
              "not represented below:")
        for lane in failed:
            print(f"> - `{lane['lane']}` — {lane['status']}")
        print(">\n> Treat the findings as the opinion of the lanes that did run.\n")

    print(f"{len(panel['findings'])} finding(s) from {len(ok)} lane(s). "
          f"**Unverified** — nothing here has been checked against the source "
          f"yet; that is the adjudication step.\n")

    for finding in panel["findings"]:
        flag = " · blocking" if finding.get("blocking") else ""
        print(f"## [{finding.get('severity', '?').upper()}] "
              f"{finding.get('title', '(untitled)')}")
        print(f"`{finding.get('file', '?')}:{finding.get('line', '?')}` — found by "
              f"**{finding['found_by']}**{flag}\n")
        print(f"**Fails when:** {finding.get('failure_scenario', '—')}\n")
        print(f"**Evidence:** {finding.get('evidence', '—')}\n")
        print(f"**Fix:** {finding.get('fix', '—')}\n")
        if finding.get("incomplete_fields"):
            print(f"> This lane omitted: {', '.join(finding['incomplete_fields'])}\n")

    if panel["dismissed"]:
        print("## Considered and dismissed\n")
        for item in panel["dismissed"]:
            print(f"- **{item.get('title', '?')}** (`{item.get('file', '?')}`, by "
                  f"{item['dismissed_by']}) — {item.get('why_not_a_defect', '—')}")
        print()

    print("## Lane provenance\n")
    for lane in panel["lanes"]:
        bits = [lane["status"]]
        if lane.get("files_examined"):
            bits.append(f"read {len(lane['files_examined'])} file(s)")
        if lane["degraded"]:
            bits.append(f"{lane['degraded']} finding(s) missing required fields")
        if lane["repaired"]:
            bits.append(f"renamed {len(set(lane['repaired']))} field(s): "
                        f"{', '.join(sorted(set(lane['repaired'])))}")
        print(f"- **{lane['lane']}** — {'; '.join(bits)}")


if __name__ == "__main__":
    main()
