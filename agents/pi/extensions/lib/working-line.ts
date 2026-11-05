// Shared state for the working line. token-throughput owns the live rate
// text and the model phase; working-elapsed renders them around the
// activity.
//
// pi loads every extension with moduleCache disabled, so each importer would
// get its own module instance. The store therefore lives on a global symbol:
// all importers in the same process share one state.
//
// This file must stay in lib/ with no index.ts or package.json next to it:
// pi auto-discovers direct extensions/*.ts files (and subdirectory entry
// points) as extensions, and a non-factory module there fails session startup.
// Import it as "./lib/working-line.ts" from a direct extensions/*.ts file.

export type LiveRateListener = () => void;

interface WorkingLineStore {
	rateText: string;
	phaseText: string;
	listeners: Set<LiveRateListener>;
}

const STORE_KEY = Symbol.for("pi.extensions.working-line");
const store: WorkingLineStore = ((globalThis as Record<symbol, WorkingLineStore>)[STORE_KEY] ??= {
	rateText: "",
	phaseText: "",
	listeners: new Set<LiveRateListener>(),
});

function notify(): void {
	for (const listener of store.listeners) listener();
}

export function setLiveRate(text: string): void {
	if (store.rateText === text) return;
	store.rateText = text;
	notify();
}

export function getLiveRate(): string {
	return store.rateText;
}

/** What the model is producing while no tool runs: Waiting for model, Thinking, Replying, Preparing tool. */
export function setPhase(text: string): void {
	if (store.phaseText === text) return;
	store.phaseText = text;
	notify();
}

export function getPhase(): string {
	return store.phaseText;
}

export function onLiveRate(listener: LiveRateListener): () => void {
	store.listeners.add(listener);
	return () => store.listeners.delete(listener);
}
