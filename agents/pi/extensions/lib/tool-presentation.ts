export interface ChangeCounts {
	added: number;
	removed: number;
	changed: number;
}

export function countDiffRuns(diff: string): ChangeCounts {
	let added = 0;
	let removed = 0;
	let changed = 0;
	let additions = 0;
	let removals = 0;
	const finishRun = () => {
		const replacements = Math.min(additions, removals);
		changed += replacements;
		added += additions - replacements;
		removed += removals - replacements;
		additions = 0;
		removals = 0;
	};
	// Pair lines only inside one contiguous change run, never across context.
	for (const line of diff.split(/\r?\n/)) {
		const sign = /^([+-])\s*\d+ /.exec(line)?.[1];
		if (sign === "+") additions++;
		else if (sign === "-") removals++;
		else finishRun();
	}
	finishRun();
	return { added, removed, changed };
}

export function formatChangeCounts(counts: ChangeCounts): string {
	return [counts.added ? `+${counts.added}` : "", counts.removed ? `-${counts.removed}` : "", counts.changed ? `~${counts.changed}` : ""]
		.filter(Boolean)
		.join(" ");
}

export function colorChangeSummary(
	summary: string,
	theme: { fg: (token: "toolDiffAdded" | "toolDiffRemoved" | "warning", text: string) => string },
): string {
	// Style only count tokens, not paths or surrounding punctuation.
	// Keep stored summaries plain so theme changes can recolor them.
	// Raw SGR 2/22 (faint): Pi's theme exposes bold and inverse but no faint
	// style, and the full diff colors are too loud for a header count.
	return summary.replace(/(^| )([+~-]\d+)(?= |$)/g, (_match, space: string, count: string) =>
		space + "\x1b[2m" + theme.fg(count[0] === "+" ? "toolDiffAdded" : count[0] === "-" ? "toolDiffRemoved" : "warning", count) + "\x1b[22m");
}

/** Highlight the changed span without a second line-diff implementation. */
function emphasizeChangedSpan(before: string, after: string, inverse: (text: string) => string): string {
	const oldChars = Array.from(before);
	const newChars = Array.from(after);
	let prefix = 0;
	while (prefix < oldChars.length && prefix < newChars.length && oldChars[prefix] === newChars[prefix]) prefix++;
	let suffix = 0;
	while (suffix < oldChars.length - prefix && suffix < newChars.length - prefix
		&& oldChars[oldChars.length - 1 - suffix] === newChars[newChars.length - 1 - suffix]) suffix++;
	const changed = oldChars.slice(prefix, oldChars.length - suffix).join("");
	return oldChars.slice(0, prefix).join("") + (changed ? inverse(changed) : "")
		+ (suffix ? oldChars.slice(-suffix).join("") : "");
}

// Pi's built-in diff emphasizes words only for one-line replacements.
// Pair lines within larger runs as well, preserving its theme and layout.
export function renderDetailedDiff(diff: string, theme: { inverse: (text: string) => string }): string {
	const lines = diff.split("\n");
	const output: string[] = [];
	for (let i = 0; i < lines.length;) {
		if (!lines[i].startsWith("-")) {
			output.push(lines[i]);
			i++;
			continue;
		}
		const start = i;
		while (i < lines.length && lines[i].startsWith("-")) i++;
		const removed = lines.slice(start, i);
		const added: string[] = [];
		while (i < lines.length && lines[i].startsWith("+")) added.push(lines[i++]);
		// Pi handles this case itself; preprocessing would diff ANSI escapes.
		if (removed.length === 1 && added.length === 1) {
			output.push(...removed, ...added);
			continue;
		}
		const emphasized = new Map<string, string>();
		for (let pair = 0; pair < Math.min(removed.length, added.length); pair++) {
			for (const [before, after] of [[removed[pair], added[pair]], [added[pair], removed[pair]]] as const) {
				const beforeText = /^[+-]\s*\d+ (.*)$/.exec(before)?.[1];
				const afterText = /^[+-]\s*\d+ (.*)$/.exec(after)?.[1];
				if (beforeText === undefined || afterText === undefined) continue;
				const prefix = before.slice(0, before.length - beforeText.length);
				emphasized.set(before, prefix + emphasizeChangedSpan(beforeText, afterText, theme.inverse));
			}
		}
		output.push(...removed.map(line => emphasized.get(line) ?? line), ...added.map(line => emphasized.get(line) ?? line));
	}
	return output.join("\n");
}
