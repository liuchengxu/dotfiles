---
name: grafana-logs
description: >
  Query Grafana Loki logs and Prometheus metrics for BTC Vault infrastructure.
  TRIGGER when: user mentions Grafana, logs, Loki, monitoring, observability,
  alerts, metrics, error investigation, or asks to check/debug/investigate
  daemon behavior in any environment (testnet, mainnet, devnet, etc.).
  DO NOT TRIGGER when: user is writing code that uses the word "log" in a
  programming context (e.g., log::info, tracing).
allowed-tools: >
  mcp__teleport-mcp-grafana-mcp-tooling__query_loki_logs,
  mcp__teleport-mcp-grafana-mcp-tooling__list_loki_label_names,
  mcp__teleport-mcp-grafana-mcp-tooling__list_loki_label_values,
  mcp__teleport-mcp-grafana-mcp-tooling__list_datasources,
  mcp__teleport-mcp-grafana-mcp-tooling__query_loki_patterns,
  mcp__teleport-mcp-grafana-mcp-tooling__query_loki_stats,
  mcp__teleport-mcp-grafana-mcp-tooling__query_prometheus,
  mcp__teleport-mcp-grafana-mcp-tooling__list_prometheus_metric_names,
  mcp__teleport-mcp-grafana-mcp-tooling__list_prometheus_label_values,
  mcp__teleport-mcp-grafana-mcp-tooling__search_dashboards
---
# Grafana Logs & Metrics Skill
## Datasource UIDs
### Loki
| Environment | UID | Trigger keywords |
|---|---|---|
| Testnet | `ae9b8e3z0u4u8b` | testnet, TBV testnet |
| Devnet | `ddwaz0qqzgvswf` | devnet, dev |
| Mainnet | `cdvc8k8n8737kd` | mainnet, prod, production |
| Tooling | `cdvc8n7808feob` | tooling, tools |
### Prometheus
| Environment | UID |
|---|---|
| Testnet | `ae9b890fmf9j4a` |
| Devnet | `cdvc8q8szvev4d` |
| Mainnet | `fdvc8owxsx3i8b` |
| Tooling | `prometheus` |
## Infrastructure Types
### TV / Hetzner infra (default)
- Base selector: `{infrastructure="hetzner"}`
- Add `host` label to filter by specific node
- Discover available hosts via `list_loki_label_values` with `labelName: "host"`
- Triggered when user mentions: testnet, devnet, vault provider, VP, VK, UC, or specific host names
### Ubernets / Kubernetes infra
- Labels: `namespace`, `pod`, `container`, `node`, `job`
- Base selector: `{namespace="...", container="..."}`
- Triggered when user mentions: ubernets, kubernetes, k8s, pods, namespace
- Same Loki datasources, different label set
## Noise Filter (Testnet/Devnet Default)
```logql
!= `eth_event_poller` != `getblockcount` != `getblockhash` != `getblock` != `rustls` != `reqwest` != `request for pegin` != `(will retry) `
```
- Always apply unless user explicitly asks for unfiltered logs
- If investigating a subsystem that would be excluded (e.g., reqwest issues), remove that specific exclusion
## Query Workflow
1. **Identify environment** from context -> resolve datasource UID
2. **Identify infra type** (Hetzner vs Kubernetes) -> choose label set
3. **Discover hosts** via `list_loki_label_values` if host not specified
4. **Default time range**: 1 hour. Convert user-specified times to RFC3339.
5. **Build LogQL**: base selector + user filters (`|= "txid"`) + noise exclusions
6. **Execute** via `query_loki_logs` with limit 50, direction backward
7. **Present results** highlighting errors, extracting pegin_txid/claim_txid for drill-down
## Common Query Templates
- By pegin txid: `{infrastructure="hetzner", host="..."} |= "<TXID>" <noise_filters>`
- Errors only: append `|= "ERROR"`
- By daemon component: append `|= "vault_provider"` / `|= "vault_keeper"`
- Pattern detection: use `query_loki_patterns` with base selector only (no noise filters)
## Prometheus Metrics
All vaultd metrics are prefixed `vaultd_*` (defined in `crates/vaultd/src/metrics.rs`). Discover dynamically via `list_prometheus_metric_names` with filter `vaultd_`.
