"use client";

import { useSyncExternalStore } from "react";

import {
  addSavedTrain,
  isTrainSaved,
  parseSavedTrains,
  removeSavedTrain,
  type SavedTrain,
  toSavedTrain,
} from "@/domain/saved-trains";
import type { Train } from "@/lib/api";

/** Versioned, so a future shape change can be ignored instead of misread. */
export const STORAGE_KEY = "train-booking:saved-trains:v1";

/**
 * Saved trains live in `localStorage` because there is no backend for them:
 * accounts and cross-device sync are next quarter. Everything here is written
 * so that swapping the storage for an API later touches this file only.
 *
 * `useSyncExternalStore` rather than `useState` in a context: it gives a
 * `getServerSnapshot` — which is what keeps the server and the first client
 * render agreeing — and it keeps every component showing the same list without
 * a state library.
 */

// A stable reference. Returning a fresh array would make React re-render
// forever, since it compares snapshots by identity.
const EMPTY: readonly SavedTrain[] = Object.freeze([]);

let cache: readonly SavedTrain[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): readonly SavedTrain[] {
  try {
    return parseSavedTrains(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be absent or blocked outright — private modes, embedded
    // browsers, a user who disabled it. Saving simply does not work then; the
    // rest of the page must not care.
    return EMPTY;
  }
}

function writeStorage(saved: readonly SavedTrain[]): void {
  cache = saved;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Out of quota, or storage is unavailable. The in-memory list still updated,
    // so the shortlist works for this session and is simply not remembered.
  }

  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorageEvent);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

/** Another tab changed the shortlist; drop the cache and re-read. */
function onStorageEvent(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return;

  cache = null;
  for (const listener of listeners) listener();
}

function getSnapshot(): readonly SavedTrain[] {
  cache ??= readStorage();
  return cache;
}

function getServerSnapshot(): readonly SavedTrain[] {
  // The server cannot know a device's shortlist, so it renders none and the
  // client fills it in after hydration. Guessing here would be a mismatch.
  return EMPTY;
}

export function useSavedTrains(): readonly SavedTrain[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsTrainSaved(id: string): boolean {
  return isTrainSaved(useSavedTrains(), id);
}

export function toggleSavedTrain(train: Train): void {
  const saved = getSnapshot();

  writeStorage(
    isTrainSaved(saved, train.id)
      ? removeSavedTrain(saved, train.id)
      : addSavedTrain(saved, toSavedTrain(train, Date.now())),
  );
}

export function unsaveTrain(id: string): void {
  writeStorage(removeSavedTrain(getSnapshot(), id));
}

/** Test seam: the module-level cache would otherwise leak between test cases. */
export function resetSavedTrainsCache(): void {
  cache = null;
}
