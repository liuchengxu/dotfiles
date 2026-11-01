import { randomUUID } from "node:crypto";
import { InteractiveMode, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { PARENT_WAKE_TEXT } from "../npm/node_modules/pi-subagents/src/shared/parent-wake.js";

const wakeTexts = new Set([PARENT_WAKE_TEXT, "Subagent updates above."]);
const runtimeKey = Symbol.for("pi.subagent-wake-display.runtime");
const patchKey = Symbol.for("pi.subagent-wake-display.render");
// Pending tokens survive an extension reload: a wake queued before /reload
// must still resolve when the reloaded module delivers it. globalThis is
// process-wide, so a fresh module evaluation keeps the binding.
const pendingKey = Symbol.for("pi.subagent-wake-display.pending.v1");
const pendingCap = 64;
const globalState = globalThis as typeof globalThis & { [pendingKey]?: Map<string, Wake> };

type Sender = { agent: string; runId: string };
type Wake = { original: string; senders?: Sender[] };
type Runtime = {
  pending: Map<string, Wake>;
  notices: Map<string, Sender>;
  color: (text: string) => string;
};
const state = globalThis as typeof globalThis & { [runtimeKey]?: Runtime };
const sharedPending = globalState[pendingKey] ?? (globalState[pendingKey] = new Map());

function wakeFor(message: any): Wake | undefined {
  if (message?.role !== "user" || !Array.isArray(message.content) || message.content.length !== 1) return undefined;
  const block = message.content[0];
  return block?.type === "text" ? state[runtimeKey]?.pending.get(block.text) : undefined;
}

function isRecordedWake(message: any): boolean {
  const origin = message?.piAutomaticWake;
  return message?.role === "user" && origin?.version === 1
    && origin.origin === "extension" && origin.producer === "pi-subagents";
}

function validSender(value: any): value is Sender {
  return [value?.agent, value?.runId].every(part => typeof part === "string"
    && part.length > 0 && part.length <= 160 && part.trim() === part
    && !/[\u0000-\u001f\u007f-\u009f]/.test(part));
}

function wakeLabel(wake: Wake | undefined, message: any): string {
  const senders = wake?.senders ?? message?.piAutomaticWake?.senders;
  if (!Array.isArray(senders)) return "↳ System: subagent update received";
  const labels = senders.filter(validSender).map(sender =>
    `↳ Message from ${sender.agent} · agent run id: ${sender.runId} (automatic completion notice)`);
  return labels.length ? labels.join("\n") : "↳ System: subagent update received";
}

export default function subagentWakeDisplay(pi: ExtensionAPI): void {
  const runtime: Runtime = { pending: sharedPending, notices: new Map(), color: text => text };
  pi.on("session_start", (_event, ctx) => {
    runtime.color = text => ctx.ui.theme.fg("muted", text);
    state[runtimeKey] = runtime;
    if (ctx.mode !== "tui") return;

    const prototype = InteractiveMode.prototype as any;
    if (prototype[patchKey]) return;
    const addMessage = prototype.addMessageToChat;
    prototype.addMessageToChat = function (message: any, options: any) {
      const wake = wakeFor(message);
      if (wake || isRecordedWake(message)) {
        const label = wakeLabel(wake, message);
        this.chatContainer.addChild(new Text(
          state[runtimeKey]?.color(label) ?? label, 0, 0,
        ));
        return;
      }
      return addMessage.call(this, message, options);
    };
    prototype[patchKey] = true;
  });

  pi.on("input", event => {
    if (event.source !== "extension" || !wakeTexts.has(event.text) || event.images?.length) {
      runtime.notices.clear();
      return;
    }
    // The token binds this extension-origin input to its later message event.
    // A typed copy of the wake text must remain a user message.
    const token = `Automatic subagent wake ${randomUUID()}`;
    runtime.pending.set(token, { original: event.text, senders: [...runtime.notices.values()] });
    runtime.notices.clear();
    if (runtime.pending.size > pendingCap) {
      runtime.pending.delete(runtime.pending.keys().next().value!);
    }
    return { action: "transform", text: token };
  });

  pi.on("message_end", event => {
    const message = event.message as any;
    if (message?.role === "custom" && message.customType === "subagent-notify" && validSender(message.details)) {
      const sender = { agent: message.details.agent, runId: message.details.runId };
      runtime.notices.set(sender.runId, sender);
      if (runtime.notices.size > pendingCap) runtime.notices.delete(runtime.notices.keys().next().value!);
      return;
    }
    if (message?.role === "assistant") runtime.notices.clear();
    const wake = wakeFor(event.message);
    if (!wake) return;
    const token = (event.message as any).content[0].text;
    runtime.pending.delete(token);
    return { message: {
      ...event.message,
      role: "user" as const,
      content: [{ type: "text" as const, text: `Automatic subagent notification (not user input): ${wake.original}` }],
      piAutomaticWake: { version: 1, origin: "extension", producer: "pi-subagents",
        ...(wake.senders?.length ? { senders: wake.senders } : {}) },
    } };
  });

  pi.on("session_shutdown", () => {
    // Keep sharedPending: a reload must still resolve tokens queued before it.
    if (state[runtimeKey] === runtime) delete state[runtimeKey];
  });
}
