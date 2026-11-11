---
name: vpn
description: >
  Inspect or operate the local Clash Verge/mihomo VPN with vpnctl: status, nodes, latency, connectivity, or Claude routing. Does not apply to VPN infrastructure or code configuration.
allowed-tools: Bash
---

# VPN Control (vpnctl)

`vpnctl` drives the local Clash Verge/mihomo instance over its unix socket:
measure node latency, switch the active node, and rewrite the
Claude/Anthropic routing rules. `~/.local/bin/vpnctl` links to
`scripts/vpnctl` in this skill. Pick the subcommand that matches the user's
intent and report the result.

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
| Force Claude rules to a specific selector | `vpnctl ensure-claude --target <group>` |

Without `--selector`, commands use the main selector: the group that the
profile's final `MATCH` rule leads to. Group names differ between machines'
subscriptions, so take `--target` from `vpnctl status` or `vpnctl list --include-groups`.

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

## When Claude itself is down

If the Claude node is blocked, this skill cannot run. When Claude routing
looks fragile, tell the user that `vpnctl claude-best` and `vpnctl claude-check`
work from their own terminal: they need only the local mihomo socket.

Run `vpnctl <cmd> --help` if you need exact flags; the CLI documents each
subcommand with examples.
