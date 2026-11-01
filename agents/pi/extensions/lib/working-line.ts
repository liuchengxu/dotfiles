// Shared state for the working line. token-throughput owns the live rate
// text; working-elapsed renders it next to the elapsed time.
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
	listeners: Set<LiveRateListener>;
}

const STORE_KEY = Symbol.for("pi.extensions.working-line");
const store: WorkingLineStore = ((globalThis as Record<symbol, WorkingLineStore>)[STORE_KEY] ??= {
	rateText: "",
	listeners: new Set<LiveRateListener>(),
});

export function setLiveRate(text: string): void {
	if (store.rateText === text) return;
	store.rateText = text;
	for (const listener of store.listeners) listener();
}

export function getLiveRate(): string {
	return store.rateText;
}

export function onLiveRate(listener: LiveRateListener): () => void {
	store.listeners.add(listener);
	return () => store.listeners.delete(listener);
}
