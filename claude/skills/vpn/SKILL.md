---
name: vpn
description: >
  Inspect and switch the local Clash Verge/mihomo VPN via the bundled `vpnctl`
  CLI. TRIGGER when: user asks to check VPN status, see/switch proxy nodes, find
  the fastest node, fix slow/blocked connectivity, or control how
  Claude/Anthropic traffic is routed (e.g. "route Claude away from HK", "my VPN
  is slow", "switch to the fastest non-HK node", "what node am I on").
  DO NOT TRIGGER when: user is configuring a VPN in code/infra (Terraform,
  WireGuard configs, cloud networking) unrelated to their local Clash Verge.
allowed-tools: Bash
---

# VPN Control (vpnctl)

`scripts/vpnctl` drives the local Clash Verge/mihomo instance over its unix
socket: measure node latency, switch the active node, and rewrite the
Claude/Anthropic routing rules. It is also symlinked to `~/.local/bin/vpnctl`
for terminal use; this skill is the canonical home. Run it via Bash with the
absolute path `~/.claude/skills/vpn/scripts/vpnctl` (or just `vpnctl`, which
resolves through PATH). Pick the subcommand that matches the user's intent and
report the result.

## Intent → command

| User wants | Command |
|---|---|
| See current routing + Claude rules | `vpnctl status` |
| Latency of all nodes in the default selector | `vpnctl list` |
| Switch to the fastest reachable node | `vpnctl fastest` |
| Fastest node excluding some region | `vpnctl fastest --exclude 'HK\|Hong Kong\|香港\|🇭🇰'` |
| Test nodes against Anthropic by latency (no change) | `vpnctl claude-list` |
| Is the current Claude node actually working? (no change) | `vpnctl claude-check` |
| Route Claude to fastest node by latency | `vpnctl claude-fastest` |
| Route Claude to fastest node that *actually reaches* Anthropic | `vpnctl claude-best` |
| Force Claude rules to a specific selector | `vpnctl ensure-claude --target TW` |

`claude-fastest` ranks purely by connect latency — a fast node may still be
blocked by Anthropic (403/geo-block). `claude-best` adds a verification pass: it
latency-ranks, then probes the top `--top` (default 5) fastest nodes with a real
unauthenticated request to Anthropic and picks the first that returns a genuine
Anthropic response. Prefer `claude-best` when the user says a node is "fast but
not working" or Claude connectivity is flaky. `claude-check` is the read-only
diagnostic for the node in use right now.

`--blocked` (on `status`, `claude-fastest`, `ensure-claude`) and `--exclude`
(on `fastest`) take a regex; the default blocks Hong Kong
(`HK|Hong Kong|香港|🇭🇰`). Widen it when the user names other regions to avoid,
e.g. `--blocked 'HK|香港|🇭🇰|SG|新加坡|🇸🇬'`.

## Behavior rules

- **Read-only commands** (`status`, `list`, `claude-list`, `claude-check`) —
  run freely.
- **Mutating commands** (`fastest`, `claude-fastest`, `claude-best`,
  `ensure-claude`) switch the active node or rewrite the Clash config and drop
  existing connections.
  When the request is explicit ("switch to the fastest node") just run it. When
  it's vague ("my VPN is acting up"), prefer `status`/`list` first, then confirm
  before mutating.
- `ensure-claude`, `claude-fastest`, and `claude-best` edit the Clash config and
  back it up to `<config>.vpnctl-backup-<timestamp>`; mention the backup path
  from the output.
- After a switch, surface the chosen node and its latency from stdout.
- If a command errors with "mihomo socket not found", Clash Verge isn't running
  — tell the user to start it rather than retrying.

## Deadlock note (when Claude itself is down)

This skill runs inside Claude Code, which talks to Anthropic. If the Claude node
is fully blocked, Claude Code can't function and this skill is unusable — you
won't be reachable to run it. The escape hatch is the bare CLI: the user runs
`vpnctl claude-best` (or `vpnctl claude-check`) directly in their terminal,
which depends only on the local mihomo socket, not on Anthropic. That is why the
`~/.local/bin/vpnctl` symlink exists. Surface this to the user if they hit a
total Claude outage.

Run `vpnctl <cmd> --help` if you need exact flags; the CLI documents each
subcommand with examples.
