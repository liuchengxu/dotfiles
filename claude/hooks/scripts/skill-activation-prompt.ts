#!/usr/bin/env -S npx tsx
/**
 * skill-activation-prompt.ts
 *
 * UserPromptSubmit hook that analyzes user prompts and automatically suggests
 * relevant skills based on keywords, intent patterns, and file context.
 *
 * This hook runs BEFORE Claude processes the user's prompt, injecting skill
 * activation reminders into Claude's context.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface HookInput {
  prompt: string;
  tool_name?: string;
  tool_input?: any;
  conversationHistory?: any[];
}

interface SkillTriggers {
  keywords: string[];
  intentPatterns: string[];
}

interface SkillRule {
  name: string;
  type: 'domain' | 'guardrail';
  enforcement: 'suggest' | 'warn' | 'block';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  promptTriggers: SkillTriggers;
  fileTriggers?: {
    pathPatterns?: string[];
    contentPatterns?: string[];
  };
  blockMessage?: string;
}

interface SkillRules {
  version: string;
  description: string;
  skills: Record<string, SkillRule>;
}

// Read input from stdin
const input = readFileSync(0, 'utf-8');
const data: HookInput = JSON.parse(input);
const prompt = data.prompt?.toLowerCase() || '';

// Load skill rules
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.env.HOME || '';
const skillsDir = join(projectDir, '.claude', 'skills');

let rules: SkillRules;
try {
  const rulesPath = join(skillsDir, 'skill-rules.json');
  rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
} catch (error) {
  // No skill rules found, exit silently
  process.exit(0);
}

// Match skills based on prompt
const matchedSkills: Array<{ name: string; rule: SkillRule }> = [];

for (const [name, rule] of Object.entries(rules.skills)) {
  const triggers = rule.promptTriggers;

  // Check keyword matches
  const keywordMatch = triggers.keywords.some(keyword =>
    prompt.includes(keyword.toLowerCase())
  );

  // Check intent pattern matches
  const intentMatch = triggers.intentPatterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(prompt);
    } catch {
      return false;
    }
  });

  if (keywordMatch || intentMatch) {
    matchedSkills.push({ name, rule });
  }
}

// If no skills matched, exit silently
if (matchedSkills.length === 0) {
  process.exit(0);
}

// Group skills by priority
const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
matchedSkills.sort((a, b) => {
  const priorityDiff = priorityOrder[a.rule.priority] - priorityOrder[b.rule.priority];
  if (priorityDiff !== 0) return priorityDiff;
  return a.name.localeCompare(b.name);
});

const critical = matchedSkills.filter(s => s.rule.priority === 'critical');
const high = matchedSkills.filter(s => s.rule.priority === 'high');
const medium = matchedSkills.filter(s => s.rule.priority === 'medium');
const low = matchedSkills.filter(s => s.rule.priority === 'low');

// Build output message
let output = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
output += '🎯 SKILL ACTIVATION CHECK\n';
output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

if (critical.length > 0) {
  output += '⚠️  CRITICAL SKILLS (REQUIRED):\n';
  critical.forEach(({ name, rule }) => {
    output += `  → ${name}\n`;
    if (rule.enforcement === 'block' && rule.blockMessage) {
      output += `    ${rule.blockMessage}\n`;
    }
  });
  output += '\n';
}

if (high.length > 0) {
  output += '🔴 HIGH PRIORITY SKILLS:\n';
  high.forEach(({ name }) => {
    output += `  → ${name}\n`;
  });
  output += '\n';
}

if (medium.length > 0) {
  output += '🟡 RECOMMENDED SKILLS:\n';
  medium.forEach(({ name }) => {
    output += `  → ${name}\n`;
  });
  output += '\n';
}

if (low.length > 0) {
  output += '💡 OPTIONAL SKILLS:\n';
  low.forEach(({ name }) => {
    output += `  → ${name}\n`;
  });
  output += '\n';
}

output += 'Please consult the relevant skills before proceeding.\n';
output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

// Output the skill activation reminder
console.log(output);

// Exit with appropriate code
const hasBlocking = critical.some(s => s.rule.enforcement === 'block');
process.exit(hasBlocking ? 2 : 0);
