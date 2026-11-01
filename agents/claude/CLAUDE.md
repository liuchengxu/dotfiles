# Claude Code

## Claude Code Specifics

- The document-review workflow is the `doc-review` skill; invoke it through the Skill tool.
- Use subagents for bounded, independent work when delegation is available and useful. Give each one a clear scope and required source access.
- When I say "ask codex", "let codex review", "consult codex" (or similar), always run it in the background via a subagent that invokes the codex tool — never block the foreground on it. Keep working while it runs.
- Codex model: always pass `model: gpt-5.6-sol` to the codex tool.
- When relaying a consultation, give one adjudicated verdict, core findings, and material uncertainty. Retain the full response as evidence; show details on request. For authorized external reviews, include supporting evidence under the adversarial-review result contract. Do not substitute a raw model response for your own checked conclusion.

The working rules that follow are shared with Codex, which reads the same files through `~/.codex/AGENTS.md`. Edit them in `~/.dotfiles/agents/ai-rules/`, and keep them model-agnostic — anything that depends on Claude Code mechanics belongs above.

@/Users/xuliucheng/.dotfiles/agents/ai-rules/global-working-rules.md

@/Users/xuliucheng/.dotfiles/agents/ai-rules/operational-evidence.md

@/Users/xuliucheng/.dotfiles/agents/ai-rules/git-signing.md
