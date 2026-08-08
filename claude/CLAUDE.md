# Claude Code

## Claude Code Specifics

- The document-review workflow is the `doc-review` skill; invoke it through the Skill tool.
- Use subagents to keep the main context window clean — offload research, exploration, and parallel analysis. One focused task per subagent.
- When I say "ask codex", "let codex review", "consult codex" (or similar), always run it in the background via a subagent that invokes the codex tool — never block the foreground on it. Keep working while it runs.
- Codex model: always pass `model: gpt-5.6-sol` to the codex tool.
- When relaying a Codex consultation: lead with a one-line **Verdict**, then Codex's answer (verbatim for design/code reviews, trimmed for quick fact-checks — the one place verbatim outranks compression), then your own read flagging where you agree or disagree, tagging findings blocking vs optional.

The working rules that follow are shared with Codex, which reads the same files through `~/.codex/AGENTS.md`. Edit them in `~/.dotfiles/ai-rules/`, and keep them model-agnostic — anything that depends on Claude Code mechanics belongs above.

@/Users/xuliucheng/.dotfiles/ai-rules/global-working-rules.md

@/Users/xuliucheng/.dotfiles/ai-rules/operational-evidence.md

@/Users/xuliucheng/.dotfiles/ai-rules/git-signing.md
