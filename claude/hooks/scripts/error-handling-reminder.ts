#!/usr/bin/env -S npx tsx
/**
 * error-handling-reminder.ts
 *
 * Stop hook that analyzes edited Rust files and provides gentle reminders
 * about error handling best practices.
 *
 * Checks for:
 * - unsafe blocks without SAFETY comments
 * - .unwrap() / .expect() usage
 * - Pattern matching completeness
 * - Error handling in async functions
 */

import { readFileSync, existsSync } from 'fs';

interface HookInput {
  prompt?: string;
  tool_name?: string;
  tool_input?: any;
}

// Read input from stdin
const input = readFileSync(0, 'utf-8');
const data: HookInput = JSON.parse(input);

// Extract file path if this was an Edit/Write operation
const filePath = data.tool_input?.file_path;

// Only process Rust files
if (!filePath || !filePath.endsWith('.rs')) {
  process.exit(0);
}

// Check if file exists
if (!existsSync(filePath)) {
  process.exit(0);
}

// Read file content
let content: string;
try {
  content = readFileSync(filePath, 'utf-8');
} catch {
  process.exit(0);
}

// Analyze content for risky patterns
const patterns = {
  hasUnsafe: /\bunsafe\s*\{/.test(content),
  hasUnwrap: /\.unwrap\(\)/.test(content),
  hasExpect: /\.expect\(/.test(content),
  hasPanic: /\bpanic!\(/.test(content),
  hasUnreachable: /\bunreachable!\(/.test(content),
  hasAsyncFn: /async\s+fn/.test(content),
  hasCatchAll: /_\s*=>/.test(content),
};

// Check for SAFETY comments near unsafe blocks
let unsafeWithoutSafety = false;
if (patterns.hasUnsafe) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/\bunsafe\s*\{/.test(lines[i])) {
      // Look for SAFETY comment in previous 5 lines
      let foundSafety = false;
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (/\/\/\s*SAFETY:/i.test(lines[j])) {
          foundSafety = true;
          break;
        }
      }
      if (!foundSafety) {
        unsafeWithoutSafety = true;
        break;
      }
    }
  }
}

// Count unwrap/expect calls
const unwrapCount = (content.match(/\.unwrap\(\)/g) || []).length;
const expectCount = (content.match(/\.expect\(/g) || []).length;

// Decide if we should show a reminder
const shouldRemind =
  unsafeWithoutSafety ||
  unwrapCount > 2 ||
  (patterns.hasAsyncFn && (patterns.hasUnwrap || patterns.hasExpect));

if (!shouldRemind) {
  process.exit(0);
}

// Build reminder message
let output = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
output += '📋 ERROR HANDLING SELF-CHECK\n';
output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

if (unsafeWithoutSafety) {
  output += '⚠️  Unsafe Code Detected\n';
  output += '   ❓ Did you add // SAFETY: comments explaining all invariants?\n';
  output += '   💡 Every unsafe block must document why it is safe\n\n';
}

if (unwrapCount > 2) {
  output += `⚠️  Multiple .unwrap() Calls (${unwrapCount})\n`;
  output += '   ❓ Are these guaranteed not to panic?\n';
  output += '   💡 Consider using .expect() with clear reasoning or Result<T, E>\n\n';
}

if (expectCount > 0) {
  output += `💭 Found ${expectCount} .expect() call(s)\n`;
  output += '   ❓ Does each .expect() explain why it cannot fail?\n';
  output += '   💡 Correctness should be evident from local context or invariants\n\n';
}

if (patterns.hasAsyncFn && (patterns.hasUnwrap || patterns.hasExpect)) {
  output += '⚠️  Async Function with .unwrap()/.expect()\n';
  output += '   ❓ What happens if this panics in a tokio task?\n';
  output += '   💡 Async code should generally return Result and use ? operator\n\n';
}

if (patterns.hasCatchAll) {
  output += '💡 Catch-all Pattern Detected (_ =>)\n';
  output += '   ❓ Would exhaustive matching be better here?\n';
  output += '   💡 Explicit matching helps catch bugs when adding new variants\n\n';
}

output += 'Rust Best Practice:\n';
output += '  • Minimize .unwrap() usage\n';
output += '  • Use .expect() only with clear justification\n';
output += '  • Document all unsafe blocks with // SAFETY: comments\n';
output += '  • Prefer Result<T, E> for fallible operations\n';
output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

// Output the reminder (non-blocking)
console.log(output);

// Exit successfully (non-blocking reminder)
process.exit(0);
