import {
  AssistantMessageComponent, BashExecutionComponent, CustomMessageComponent,
  InteractiveMode, ToolExecutionComponent, UserMessageComponent, type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Text, truncateToWidth, type Component } from "@earendil-works/pi-tui";

const patchKey = Symbol.for("pi.disclosure.v1");
const expandedKey = Symbol.for("pi.disclosure.assistant-expanded");
const diagnosticKey = Symbol.for("pi.disclosure.diagnostics");
// One mechanical line instead of the generic hint: what the block is and how
// big. A diff-shaped block reports its own additions and removals.
function codeSummary(info: string, block: string[]): string {
  if (/^(?:js|javascript)\s+workflow\s*$/i.test(info.trim())) return "Agent workflow · Ctrl+O for details";
  const lines = block.filter(line => line.trim());
  const added = lines.filter(line => line.startsWith("+") && !line.startsWith("+++")).length;
  const removed = lines.filter(line => line.startsWith("-") && !line.startsWith("---")).length;
  // A bullet list is not a diff: require a diff header or both signs before
  // the block may call itself one.
  const header = lines.some(line => /^(@@|diff |--- |\+\++ )/.test(line));
  const diffShaped = added + removed > 0 && (header || (added > 0 && removed > 0))
    && lines.filter(line => /^[-+@ ]/.test(line)).length >= lines.length * 0.8;
  if (diffShaped) return `diff · ${added} added · ${removed} removed · Ctrl+O for details`;
  const kind = info.trim().split(/[\s,]+/, 1)[0] || "code";
  return `${kind} · ${lines.length} line${lines.length === 1 ? "" : "s"} · Ctrl+O for details`;
}

function payload(value: unknown): string {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2) ?? String(value); }
  catch { return "[Details could not be serialized]"; }
}

function firstLine(value: unknown): string {
  return String(value ?? "").split(/\r?\n/).find(line => line.trim())?.replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, 160) || "Unknown failure";
}

function failure(error: unknown): string {
  return error && typeof error === "object" && "stack" in error ? String(error.stack) : String(error);
}

export class Disclosure implements Component {
  expanded = false;
  repeats = 1;
  actions: string[] = [];
  constructor(public label: string, public details: string,
    private color: (text: string) => string = text => /(?:error|failed|aborted)/i.test(label) ? `\x1b[31m${text}\x1b[39m` : /^Warning/i.test(label) ? `\x1b[33m${text}\x1b[39m` : text) {}
  setExpanded(expanded: boolean): void { this.expanded = expanded; }
  invalidate(): void {}
  render(width: number): string[] {
    const label = `${this.label}${this.repeats > 1 ? ` (×${this.repeats})` : ""}`;
    if (!this.expanded) return [truncateToWidth(this.color(`${label} (Ctrl+O for details)`), Math.max(1, width)),
      ...this.actions.flatMap(action => new Text(action, 0, 0).render(Math.max(1, width)))];
    return new Text(`${label}\n${this.details}`, 0, 0).render(Math.max(1, width));
  }
}

// Preserve controls and their receiver; only broken rendering takes the safe fallback.
function guarded(component: Component, fallback: Disclosure): Component {
  const label = fallback.label;
  const details = fallback.details;
  return new Proxy(component, {
    get(target, key) {
      if (key === "render") return (width: number) => {
        try { return target.render(width); }
        catch (error) {
          fallback.label = `${label}: renderer failed (${firstLine(error)})`;
          fallback.details = `${details}\n${failure(error)}`;
          return fallback.render(width);
        }
      };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function argFact(row: any): string {
  const args = row.args ?? {};
  const path = args.path ?? args.file_path;
  if (typeof path === "string" && path) return path.split("/").filter(Boolean).pop() ?? path;
  const other = args.pattern ?? args.query ?? args.command;
  return typeof other === "string" ? firstLine(other).slice(0, 60) : "";
}

function toolLabel(row: any): string {
  const fact = argFact(row);
  return `${row.toolName}: ${row.result?.isError ? "failed" : row.result ? row.isPartial ? "running" : "complete" : "running"}${fact ? ` · ${fact}` : ""}`;
}

function toolDetails(row: any): string {
  // A settled row already shows the tool's own view of what happened; raw
  // arguments duplicate it as escaped JSON. Keep them only while the call
  // runs, before any result exists.
  const running = row.result === undefined || row.result === null;
  if (running) return `Arguments:\n${payload(row.args)}\nResult: (none yet)`;
  return `Result:\n${payload(row.result)}`;
}

function toolFallback(row: any, error?: unknown): Disclosure {
  const summary = row.result?.isError ? `: ${firstLine(row.result.content?.find((c: any) => c.type === "text")?.text ?? "Tool execution failed")}` : "";
  const view = new Disclosure(`${toolLabel(row)}${summary}${error === undefined ? "" : `; renderer failed: ${firstLine(error)}`}`, `${toolDetails(row)}${error === undefined ? "" : `\n${failure(error)}`}`);
  view.setExpanded(row.expanded);
  return view;
}

function patchTools(): void {
  const proto = ToolExecutionComponent.prototype as any;
  if (proto[patchKey]) return;
  for (const name of ["getCallRenderer", "getResultRenderer"]) {
    const original = proto[name];
    proto[name] = function () {
      const renderer = original.call(this);
      if (!renderer) return undefined;
      const row = this;
      return function (this: unknown, ...args: unknown[]) {
        try {
          const component = renderer.apply(this, args);
          return component ? guarded(component, toolFallback(row)) : toolFallback(row);
        } catch (error) { return toolFallback(row, error); }
      };
    };
  }
  proto.createCallFallback = function () { return toolFallback(this); };
  proto.createResultFallback = function () { return toolFallback(this); };
  proto.formatToolExecution = function () {
    return this.expanded ? `${toolLabel(this)}\n${toolDetails(this)}` : `${toolFallback(this).label} (Ctrl+O for details)`;
  };
  const updateDisplay = proto.updateDisplay;
  proto.updateDisplay = function () {
    const showImages = this.showImages;
    // Core images live outside renderResult, so gate their construction as well.
    if (!this.expanded) this.showImages = false;
    try { updateDisplay.call(this); }
    finally { this.showImages = showImages; }
  };
  proto[patchKey] = true;
}

type CodeState = { fence?: { character: string; length: number; info?: string; open?: string }; indented?: boolean; paragraph?: boolean };

// A small block is reply content — commands the reader is meant to run,
// short snippets — so it renders as written. Only a dump earns a summary.
const CODE_SUMMARY_FLOOR = 6;

function collapseCode(text: string, state: CodeState): string {
  const lines: string[] = [];
  const block: string[] = [];
  const small = (): boolean => !/^(?:js|javascript)\s+workflow\s*$/i.test(state.fence?.info?.trim() ?? "")
    && block.filter(line => line.trim()).length <= CODE_SUMMARY_FLOOR;
  const closeFence = (closing?: string): void => {
    if (small() && state.fence?.open) lines.push(state.fence.open, ...block, ...(closing ? [closing] : []));
    else lines.push(codeSummary(state.fence?.info ?? "", block));
    block.length = 0;
    state.fence = undefined;
  };
  const closeIndented = (): void => {
    if (small()) lines.push(...block);
    else lines.push(codeSummary("", block));
    block.length = 0;
    state.indented = false;
  };
  for (const line of text.split("\n")) {
    const match = /^(?:[ \t]*(?:> ?|(?:[-+*]|\d+[.)])[ \t]+))*[ \t]*(`{3,}|~{3,})(.*)$/.exec(line);
    if (state.fence) {
      if (match && match[1][0] === state.fence.character && match[1].length >= state.fence.length && !match[2].trim()) closeFence(line);
      else block.push(line);
      continue;
    }
    if (match) {
      state.fence = { character: match[1][0], length: match[1].length, info: match[2], open: line };
      state.paragraph = false;
      continue;
    }
    if (/^(?: {0,3}> ?)*(?: {4}|\t)/.test(line) && (!state.paragraph || state.indented)) {
      block.push(line);
      state.indented = true;
      continue;
    }
    if (state.indented && !line.trim()) { block.push(line); continue; }
    if (state.indented) closeIndented();
    state.paragraph = Boolean(line.replace(/^(?: {0,3}> ?)+/, "").trim());
    lines.push(line);
  }
  // An unterminated block may continue in the next content block: flush a
  // presentation line WITHOUT clearing the fence state, or the body would
  // leak as prose.
  if (state.fence) {
    if (small() && state.fence.open) lines.push(state.fence.open, ...block);
    else lines.push(codeSummary(state.fence.info ?? "", block));
  } else if (state.indented) {
    if (small()) lines.push(...block);
    else lines.push(codeSummary("", block));
  }
  return lines.join("\n");
}

export function collapseCodeBlocks(text: string): string { return collapseCode(text, {}); }

function patchAssistant(): void {
  const proto = AssistantMessageComponent.prototype as any;
  if (proto[patchKey]) return;
  const updateContent = proto.updateContent;
  proto.setExpanded = function (expanded: boolean) {
    this[expandedKey] = expanded;
    if (this.lastMessage) this.updateContent(this.lastMessage);
  };
  proto.updateContent = function (message: any, ...args: unknown[]) {
    const expanded = Boolean(this[expandedKey]);
    const state: CodeState = {};
    const content = expanded ? message.content : message.content.filter((block: any) => block.type !== "thinking").map((block: any) => {
      if (block.type !== "text") return block;
      state.paragraph = false;
      return { ...block, text: collapseCode(block.text, state) };
    });
    updateContent.call(this, { ...message, content, errorMessage: message.errorMessage ? firstLine(message.errorMessage) : message.errorMessage }, ...args);
    this.lastMessage = message;
    const container = this.contentContainer as Container;
    if (message.errorMessage && ["error", "aborted"].includes(message.stopReason) && !this.hasToolCalls) {
      container.children.pop();
      const error = new Disclosure(`${message.stopReason === "aborted" ? "Aborted" : "Error"}: ${firstLine(message.errorMessage)}`, message.errorMessage);
      error.setExpanded(expanded);
      container.addChild(error);
    }
    for (const [index, child] of [...container.children].entries()) {
      if (!(child instanceof Markdown)) continue;
      container.children[index] = {
        render(width) {
          if (width < 3) return child.render(width).map(line => truncateToWidth(line, Math.max(1, width), ""));
          return child.render(width - 2).map((line, index) => truncateToWidth(`${index === 0 ? "⏺ " : "  "}${line}`, width, ""));
        },
        invalidate() { child.invalidate(); },
      };
    }
  };
  proto[patchKey] = true;
}

function notificationLabel(message: any): string {
  const restored = message.customType === "subagent-notify" && typeof message.content === "string"
    ? /^(?:Background task|Detached foreground task) (completed|failed|paused|stopped): \*\*(.+?)\*\*(?:\s+(\([^)]*\)))?$/.exec(message.content.split("\n")[0]) : undefined;
  const details = message.details ?? (restored ? { status: restored[1], agent: restored[2], taskInfo: restored[3] } : {});
  const identity = [details.agent, details.taskInfo].filter(Boolean).map(firstLine).join(" · ");
  const status = firstLine(details.status ?? details.state ?? details.event?.type ?? "notification");
  const size = typeof message.content === "string" ? ` · ${message.content.split(/\r?\n/).length} line${message.content.split(/\r?\n/).length === 1 ? "" : "s"}` : "";
  return `${message.customType}${identity ? `: ${identity}` : ""}: ${status}${size}`;
}

function compactNotification(message: any): boolean {
  return message.customType === "subagent-notify" || message.customType === "subagent_steering_notice" ||
    (message.customType === "subagent_supervisor_request" && message.details?.reason === "progress_update" && !message.details?.expectsReply);
}

function messageFallback(message: any, expanded: boolean, error?: unknown): Disclosure {
  const view = new Disclosure(`${notificationLabel(message)}${error === undefined ? "" : `; renderer failed: ${firstLine(error)}`}`, `${payload(message.content)}\nDetails:\n${payload(message.details ?? message.data)}${error === undefined ? "" : `\n${failure(error)}`}`);
  view.setExpanded(expanded);
  return view;
}

function patchCustomMessages(): void {
  const proto = CustomMessageComponent.prototype as any;
  if (proto[patchKey]) return;
  const rebuild = proto.rebuild;
  proto.rebuild = function () {
    const renderer = this.customRenderer;
    const row = this;
    this.customRenderer = function (message: any, options: any, theme: any) {
      const fallback = messageFallback(message, options.expanded);
      if (compactNotification(message) && !options.expanded) return fallback;
      try {
        const component = renderer?.call(this, message, options, theme);
        return component ? guarded(component, fallback) : fallback;
      } catch (error) { return messageFallback(message, options.expanded, error); }
    };
    try { rebuild.call(row); }
    finally { this.customRenderer = renderer; }
  };
  proto[patchKey] = true;
}

function patchShell(): void {
  const proto = BashExecutionComponent.prototype as any;
  if (proto[patchKey]) return;
  const render = proto.render;
  proto.render = function (width: number) {
    if (this.expanded) return render.call(this, width);
    const command = /^\s*([\w./-]+)/.exec(this.command)?.[1]?.split("/").pop() ?? "shell";
    const raw = Array.isArray(this.outputLines) ? this.outputLines : [];
    const logical = raw.length > 0 && raw[raw.length - 1] === "" ? raw.length - 1 : raw.length;
    const lines = ` · ${logical} output line${logical === 1 ? "" : "s"}`;
    return [truncateToWidth(`Shell ${command}: ${this.status}${this.status === "error" ? ` (exit ${this.exitCode})` : ""}${lines}${this.status === "running" ? " (Esc to cancel)" : ""} (Ctrl+O for details)`, Math.max(1, width))];
  };
  proto[patchKey] = true;
}

function patchHost(): void {
  const proto = InteractiveMode.prototype as any;
  if (proto[patchKey]) return;
  function diagnostic(host: any, severity: string, message: unknown, details = String(message)) {
    const key = `${severity}\n${details}`;
    const previous = host[diagnosticKey];
    const session = host.session?.sessionManager?.getSessionId?.();
    if (previous?.key === key && previous.session === session && host.chatContainer.children.includes(previous.row)) {
      previous.row.repeats++;
    } else {
      const actions = String(message).split(/\r?\n/).slice(1).filter(line => /^(?:press |run \/|please |reply |select |confirm |to report )/i.test(line.trim())).map(firstLine);
      const context = host.createExtensionUIContext();
      const row = new Disclosure(`${severity}: ${firstLine(message)}`, details,
        text => context.theme.fg(severity === "Warning" ? "warning" : severity === "Status" ? "dim" : "error", text));
      row.actions = actions;
      row.setExpanded(Boolean(host.toolOutputExpanded));
      host.chatContainer.addChild(row);
      host[diagnosticKey] = { key, row, session };
    }
    host.ui.requestRender();
  }
  proto.showError = function (message: string) { diagnostic(this, "Error", message); };
  proto.showWarning = function (message: string) { diagnostic(this, "Warning", message); };
  proto.showStatus = function (message: string) { diagnostic(this, "Status", message); };
  proto.showExtensionError = function (path: string, error: string, stack?: string) {
    diagnostic(this, "Extension error", error, `Extension: ${path}\n${error}${stack ? `\n${stack}` : ""}`);
  };
  const addCustomEntryToChat = proto.addCustomEntryToChat;
  proto.addCustomEntryToChat = function (entry: any) {
    const runner = this.session.extensionRunner;
    const getRenderer = runner.getEntryRenderer;
    runner.getEntryRenderer = function (type: string) {
      const renderer = getRenderer.call(this, type);
      if (!renderer) return undefined;
      return function (entry: any, options: any, theme: any) {
        const fallback = messageFallback(entry, options.expanded);
        try {
          const component = renderer?.call(this, entry, options, theme);
          // Undefined from a healthy entry renderer means deliberately invisible.
          return component ? guarded(component, fallback) : undefined;
        } catch (error) { return messageFallback(entry, options.expanded, error); }
      };
    };
    try { return addCustomEntryToChat.call(this, entry); }
    finally { runner.getEntryRenderer = getRenderer; }
  };
  // A failed turn names its own steps: mark the last few finished tool rows
  // so their renderers draw a muted causal line instead of vanishing.
  const causalKey = Symbol.for("pi.disclosure.causal");
  // A settled turn needs no per-command rows: the frozen activity summary
  // already says "ran N commands". Two or more finished foreground bash
  // steps fold away together, the way Claude Code shows "Run 2 shell
  // commands"; failures and background handoffs stay, and Ctrl+O restores.
  function foldFinishedCommands(host: any, turnOnly: boolean) {
    const foldable: any[] = [];
    for (const child of [...host.chatContainer.children].reverse()) {
      if (turnOnly
        && (child instanceof AssistantMessageComponent
          || child instanceof UserMessageComponent
          || child instanceof CustomMessageComponent
          || child instanceof BashExecutionComponent)) break;
      if (!(child instanceof ToolExecutionComponent)) continue;
      if (child.toolName !== "bash" || child.result?.isError) continue;
      if (child.result?.details?.handoff) continue;
      if (child.rendererState.causal) continue;
      foldable.push(child);
    }
    if (foldable.length < 2) return;
    for (const child of foldable) {
      child.rendererState.folded = true;
      child.invalidate();
    }
  }

  function collapseFinishedDetails(host: any) {
    for (const child of host.chatContainer.children) {
      if (!(child instanceof ToolExecutionComponent) || !child.result || child.isPartial) continue;
      if (child.rendererState.detailsCollapsed) continue;
      child.rendererState.detailsCollapsed = true;
      child.invalidate();
    }
  }

  function causalTail(host: any) {
    let marked = 0;
    for (const child of [...host.chatContainer.children].reverse()) {
      if (marked >= 3) break;
      // A turn names its own steps only: the first earlier reply, user
      // message, shell row or notice ends the search, so a failure never
      // blames the previous turn's work.
      if (child instanceof AssistantMessageComponent
        || child instanceof UserMessageComponent
        || child instanceof CustomMessageComponent
        || child instanceof BashExecutionComponent) break;
      if (!(child instanceof ToolExecutionComponent) || child.result?.isError) continue;
      child.rendererState.causal = true;
      child.invalidate();
      marked++;
    }
  }
  function failedAssistant(message: any): boolean {
    return message?.role === "assistant"
      && (message.stopReason === "error" || message.stopReason === "aborted")
      && !(Array.isArray(message.content) && message.content.some((block: any) => block.type === "toolCall"));
  }
  const renderSessionItems = (proto as { renderSessionItems?: (...args: unknown[]) => unknown }).renderSessionItems;
  if (typeof renderSessionItems === "function") {
    (proto as any).renderSessionItems = function (...args: any[]) {
      const result = renderSessionItems.apply(this, args);
      collapseFinishedDetails(this);
      foldFinishedCommands(this, false);
      return result;
    };
  }

  const handleEvent = proto.handleEvent;
  proto.handleEvent = async function (event: any) {
    if ((event?.type === "tool_execution_start" && !event.parentToolCallId)
      || (event?.type === "message_start" && ["assistant", "user"].includes(event.message?.role))) {
      collapseFinishedDetails(this);
    }
    if (event?.type === "message_end" && failedAssistant(event.message)) causalTail(this);
    if (event?.type === "message_end"
      && event.message?.role === "assistant"
      && !failedAssistant(event.message)) foldFinishedCommands(this, true);
    const result = await handleEvent.call(this, event);
    if (event.type === "message_start" && event.message.role === "assistant" && this.streamingComponent) {
      this.streamingComponent.setExpanded(Boolean(this.toolOutputExpanded));
      this.ui.requestRender();
    }
    return result;
  };
  const setToolsExpanded = proto.setToolsExpanded;
  proto.setToolsExpanded = function (expanded: boolean) {
    setToolsExpanded.call(this, expanded);
    for (const row of this.pendingBashComponents ?? []) row.setExpanded(expanded);
    this.bashComponent?.setExpanded(expanded);
  };
  const handleBashCommand = proto.handleBashCommand;
  proto.handleBashCommand = function (...args: any[]) {
    const host = this;
    for (const container of [this.chatContainer, this.pendingMessagesContainer]) {
      const attachmentKey = Symbol.for("pi.disclosure.shell-attachment");
      if (container[attachmentKey]) continue;
      const addChild = container.addChild;
      // Both live shell paths attach here before appending any output.
      container.addChild = function (child: Component) {
        if (child instanceof BashExecutionComponent) child.setExpanded(Boolean(host.toolOutputExpanded));
        return addChild.call(this, child);
      };
      container[attachmentKey] = true;
    }
    return handleBashCommand.apply(this, args);
  };
  const addMessageToChat = proto.addMessageToChat;
  proto.addMessageToChat = function (...args: any[]) {
    if (["assistant", "user"].includes(args[0]?.role)) collapseFinishedDetails(this);
    if (failedAssistant(args[0])) causalTail(this);
    if (args[0]?.role === "assistant" && !failedAssistant(args[0])) foldFinishedCommands(this, true);
    const existing = new Set(this.chatContainer.children);
    const result = addMessageToChat.apply(this, args);
    for (const child of this.chatContainer.children) {
      if (!existing.has(child) && (child instanceof AssistantMessageComponent || child instanceof BashExecutionComponent)) child.setExpanded(Boolean(this.toolOutputExpanded));
    }
    return result;
  };
  proto[patchKey] = true;
}

// Prototype changes survive /reload; removing this extension requires a restart.
export default function disclosure(_pi: ExtensionAPI): void {
  patchTools();
  patchAssistant();
  patchCustomMessages();
  patchShell();
  patchHost();
}
