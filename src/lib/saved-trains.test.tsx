import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { makeTrain } from "@/test/fixtures";

import {
  resetSavedTrainsCache,
  STORAGE_KEY,
  toggleSavedTrain,
  unsaveTrain,
  useIsTrainSaved,
  useSavedTrains,
} from "./saved-trains";

beforeEach(() => {
  window.localStorage.clear();
  resetSavedTrainsCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("starts empty and remembers a saved train", () => {
  const { result } = renderHook(() => useSavedTrains());
  expect(result.current).toEqual([]);

  act(() => {
    toggleSavedTrain(makeTrain({ id: "1" }));
  });

  expect(result.current.map((train) => train.id)).toEqual(["1"]);
  expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"id":"1"');
});

test("toggling the same train twice removes it", () => {
  const train = makeTrain({ id: "1" });
  const { result } = renderHook(() => useSavedTrains());

  act(() => {
    toggleSavedTrain(train);
  });
  act(() => {
    toggleSavedTrain(train);
  });

  expect(result.current).toEqual([]);
});

test("unsaves by id", () => {
  const { result } = renderHook(() => useSavedTrains());

  act(() => {
    toggleSavedTrain(makeTrain({ id: "1" }));
  });
  act(() => {
    unsaveTrain("1");
  });

  expect(result.current).toEqual([]);
});

// The whole reason for useSyncExternalStore rather than local state: two
// components showing the same shortlist without a state library between them.
test("every subscriber sees the same list", () => {
  const list = renderHook(() => useSavedTrains());
  const badge = renderHook(() => useIsTrainSaved("1"));

  expect(badge.result.current).toBe(false);

  act(() => {
    toggleSavedTrain(makeTrain({ id: "1" }));
  });

  expect(badge.result.current).toBe(true);
  expect(list.result.current).toHaveLength(1);
});

test("picks up a change made in another tab", () => {
  const { result } = renderHook(() => useSavedTrains());

  act(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "9",
          trainNumber: "ICE 9",
          from: "Berlin",
          to: "Munich",
          departureDate: "2026-08-15",
          departureTime: "08:10",
          arrivalTime: "12:45",
          price: 89,
          carriageClass: "2nd Class",
          savedAt: 1,
        },
      ]),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  });

  expect(result.current.map((train) => train.id)).toEqual(["9"]);
});

test("ignores a storage event about some other key", () => {
  const { result } = renderHook(() => useSavedTrains());

  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
  });

  expect(result.current).toEqual([]);
});

describe("when storage does not cooperate", () => {
  test("reads nothing when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { result } = renderHook(() => useSavedTrains());

    expect(result.current).toEqual([]);
  });

  // Over quota, or a browser that refuses to persist. The shortlist has to keep
  // working for the session rather than the click doing nothing.
  test("keeps the shortlist in memory when the write fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const { result } = renderHook(() => useSavedTrains());

    act(() => {
      toggleSavedTrain(makeTrain({ id: "1" }));
    });

    expect(result.current.map((train) => train.id)).toEqual(["1"]);
  });
});

test("stops listening once the last subscriber unmounts", () => {
  const remove = vi.spyOn(window, "removeEventListener");

  const { unmount } = renderHook(() => useSavedTrains());
  unmount();

  expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
});
