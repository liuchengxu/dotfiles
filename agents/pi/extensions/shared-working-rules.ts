import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function sharedWorkingRules(pi: ExtensionAPI): void {
  pi.on("before_agent_start", (event) => {
    const rules = ["global-working-rules.md", "operational-evidence.md", "git-signing.md"].map((name) => {
      const path = join(homedir(), ".dotfiles", "agents", "ai-rules", name);
      return { path, content: readFileSync(path, "utf8") };
    });
    const paths = new Set(rules.map((rule) => rule.path));
    event.systemPromptOptions.contextFiles = [
      ...rules,
      ...event.systemPromptOptions.contextFiles.filter((file) => !paths.has(file.path)),
    ];

    const manualOnly = new Set(["grill-me", "grill-with-docs", "handoff"]);
    event.systemPromptOptions.skills = event.systemPromptOptions.skills.filter((skill) => !manualOnly.has(skill.name));
  });
}
