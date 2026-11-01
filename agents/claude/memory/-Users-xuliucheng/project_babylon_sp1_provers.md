---
name: Babylon vault provers SP1 prover infrastructure
description: Babylon Labs vault provers protocol uses SP1 proofs with Succinct Prover Network primary + self-hosted GPU fallback; heading to production and seeking prover network diversity
type: project
originSessionId: 3897cd5d-5f18-479f-bedf-4b8c63be7454
---
**Babylon Labs vault provers protocol** generates SP1 ZK proofs.

Current setup:
- **Primary**: Succinct Prover Network (outsourced)
- **Fallback**: Self-hosted GPU prover (operated by Babylon)

Status: Heading toward production. Concerned about resilience/diversity — not Succinct reliability per se, but their roadmap and operational changes are out of Babylon's control.

Permissionless model constraint: vault providers in the protocol cannot realistically run their own GPU provers. Whatever proving infra is chosen must be operationally simple for them.

**Why:** Production launch + permissionless vault provider model means proving infrastructure is a single-point-of-failure if not diversified. Edward Li at Succinct is the contact pushing two options: 3rd-party provers in the network, and a license to self-host their cloud proving stack.

**How to apply:** When discussing SP1 / Succinct / proving topics with this user, default to "what does this mean for production resilience and for permissionless vault providers" framing — not "is the tech cool". Cost, SLA, and operational burden on third parties are the recurring axes.
