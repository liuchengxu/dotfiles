---
name: grafana-logs
description: >
  Investigate BTC Vault runtime incidents, daemon behavior, logs, or metrics with Grafana Loki and Prometheus. Does not apply to source-code logging edits or unrelated uses of the word log.
allowed-tools: >
  mcp__grafana__query_loki_logs,
  mcp__grafana__list_loki_label_names,
  mcp__grafana__list_loki_label_values,
  mcp__grafana__list_datasources,
  mcp__grafana__query_loki_patterns,
  mcp__grafana__query_loki_stats,
  mcp__grafana__query_prometheus,
  mcp__grafana__list_prometheus_metric_names,
  mcp__grafana__list_prometheus_label_values,
  mcp__grafana__search_dashboards
---
# Grafana Logs & Metrics Skill
## Datasource UIDs
If a UID below returns nothing or 404, call `list_datasources` to rediscover
before concluding there is no data — UIDs rotate when datasources are
recreated.
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
## Conditional noise filters
```logql
!= `eth_event_poller` != `getblockcount` != `getblockhash` != `getblock` != `rustls` != `reqwest` != `request for pegin` != `(will retry) `
```
- Start an unknown-failure investigation without these exclusions. Retry, RPC,
  and network/TLS messages can contain the cause.
- Apply an exclusion only when the question or inspected evidence establishes
  that its class is irrelevant. Record which classes the query omits.
- If a filtered query is empty or the cause remains unexplained, widen the query
  and remove exclusions before concluding that no relevant events occurred.
- An explicit request for unfiltered logs keeps all these classes.
## Query Workflow
1. **Identify environment** from context -> resolve datasource UID
2. **Identify infra type** (Hetzner vs Kubernetes) -> choose label set
3. **Discover hosts** via `list_loki_label_values` if host not specified
4. **Default time range**: 1 hour. Convert user-specified times to RFC3339.
5. **Build LogQL**: base selector + relevant user filters (`|= "txid"`). Add only justified noise exclusions.
6. **Execute** via `query_loki_logs` with limit 50, direction backward
7. **Present results** highlighting errors, extracting pegin_txid/claim_txid for drill-down
## Common Query Templates
- By pegin txid: `{infrastructure="hetzner", host="..."} |= "<TXID>" <noise_filters>`
- Errors only: append `|= "ERROR"`
- By daemon component: append `|= "vault_provider"` / `|= "vault_keeper"`
- Pattern detection: use `query_loki_patterns` with base selector only (no noise filters)
## Prometheus Metrics
All vaultd metrics are prefixed `vaultd_*` (defined in `crates/vaultd/src/metrics.rs`). Discover dynamically via `list_prometheus_metric_names` with filter `vaultd_`.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before querying, confirmed the incident question, environment, infrastructure, time range, and need for each filter were clear and within scope.
- [ ] Resolved the live datasource and labels instead of treating stale UIDs or assumed hosts as evidence.
- [ ] Started with the relevant signal, recorded every omitted noise class, and widened the query before concluding that no cause or event existed.
- [ ] Correlated logs and metrics with stable identifiers and separated observed evidence from inference.
- [ ] Reported the query boundary, relevant events, cause confidence, and any missing data or unresolved incident question.
