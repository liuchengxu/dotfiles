/**
 * Renames the Todo overlay's heading from "Todos" to "Tasks" at startup.
 *
 * The rpiv-todo package reads its locale file once at module init; a package
 * update overwrites any direct edit to locales/en.json. This extension writes
 * the override after the package loads, on every session start, so the
 * rename survives updates.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PACKAGE_DIR = join(
	homedir(),
	".pi/agent/npm/node_modules/@juicesharp/rpiv-todo",
);
const LOCALE_PATH = join(PACKAGE_DIR, "locales/en.json");

const OVERRIDES: Record<string, string> = {
	"overlay.heading": "Tasks",
	"command.no_todos": "No tasks yet. Ask the agent to add some!",
};

export default function renameTodosToTasks(pi: ExtensionAPI): void {
	pi.on("session_start", () => {
		try {
			const locale = JSON.parse(readFileSync(LOCALE_PATH, "utf8"));
			let changed = false;
			for (const [key, value] of Object.entries(OVERRIDES)) {
				if (locale[key] !== value) {
					locale[key] = value;
					changed = true;
				}
			}
			if (changed) {
				writeFileSync(LOCALE_PATH, JSON.stringify(locale, null, 2) + "\n");
			}
		} catch {
			// The package is absent or its locale shape changed; nothing to do.
		}
	});
}
