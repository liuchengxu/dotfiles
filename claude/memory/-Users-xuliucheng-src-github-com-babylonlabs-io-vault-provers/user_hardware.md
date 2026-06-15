---
name: User hardware
description: User's primary dev machine — affects build/test sizing and local LLM model size recommendations
type: user
originSessionId: 86c87e5e-ee37-477d-ae99-a6b8a6adda1c
---
User's primary machine is an **Apple M5 Pro, 64 GB unified memory** (as of 2026-05-08).

Implications:
- Comfortable headroom for circuits-workspace SP1 builds (peak ~8–12 GB) and parallel work.
- Local LLM via MLX: 32B 4-bit is comfortable; 70B 4-bit fits if Docker/Slack/heavy browser are quit first; 120B won't fit.
- Target ≤ ~50 GB resident to avoid swap; macOS gets sluggish above ~80% utilization.

Note: prior memory mentioned "M5 Max migration prep on 2026-03-13" — actual machine landed as M5 Pro 64 GB, not Max.
