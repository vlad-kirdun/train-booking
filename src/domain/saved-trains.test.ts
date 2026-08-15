import { describe, expect, test } from "vitest";

import { makeTrain } from "@/test/fixtures";

import {
  addSavedTrain,
  isTrainSaved,
  parseSavedTrains,
  removeSavedTrain,
  SAVED_TRAINS_LIMIT,
  type SavedTrain,
  toSavedTrain,
} from "./saved-trains";

const saved = (id: string, savedAt = 1): SavedTrain =>
  toSavedTrain(makeTrain({ id }), savedAt);

describe("toSavedTrain", () => {
  test("keeps what a comparison needs", () => {
    const entry = toSavedTrain(
      makeTrain({ id: "7", price: 89, trainNumber: "ICE 522" }),
      1234,
    );

    expect(entry).toMatchObject({
      id: "7",
      price: 89,
      trainNumber: "ICE 522",
      savedAt: 1234,
    });
  });

  // A seat count frozen at the moment of saving is the false availability this
  // project refuses to show anywhere.
  test("does not remember how many seats were left", () => {
    const entry = toSavedTrain(makeTrain({ seatsLeft: 34 }), 1);

    expect(entry).not.toHaveProperty("seatsLeft");
  });
});

describe("parseSavedTrains", () => {
  test("reads a list back", () => {
    const list = [saved("1"), saved("2")];

    expect(parseSavedTrains(JSON.stringify(list))).toEqual(list);
  });

  test.each([
    ["nothing stored", null],
    ["an empty string", ""],
    ["text that is not JSON", "{oh no"],
    ["JSON that is not a list", '{"id":"1"}'],
    ["a list of nonsense", "[1, 2, 3]"],
  ])("survives %s", (_case, raw) => {
    expect(parseSavedTrains(raw)).toEqual([]);
  });

  // Schema drift across a deploy should cost the entries that changed, not
  // somebody's whole shortlist.
  test("drops only the entries it cannot read", () => {
    const raw = JSON.stringify([
      saved("1"),
      { id: "2", trainNumber: "ICE 2" }, // an older, smaller shape
      saved("3"),
    ]);

    expect(parseSavedTrains(raw).map((train) => train.id)).toEqual(["1", "3"]);
  });

  test("caps a list that grew beyond the limit", () => {
    const raw = JSON.stringify(
      Array.from({ length: SAVED_TRAINS_LIMIT + 5 }, (_, i) =>
        saved(String(i)),
      ),
    );

    expect(parseSavedTrains(raw)).toHaveLength(SAVED_TRAINS_LIMIT);
  });
});

describe("addSavedTrain", () => {
  test("puts the newest first", () => {
    const list = addSavedTrain([saved("1")], saved("2"));

    expect(list.map((train) => train.id)).toEqual(["2", "1"]);
  });

  test("saving the same train again moves it up rather than duplicating it", () => {
    const list = addSavedTrain([saved("1"), saved("2")], saved("2", 99));

    expect(list.map((train) => train.id)).toEqual(["2", "1"]);
    expect(list[0]?.savedAt).toBe(99);
  });

  test("drops the oldest once the shortlist is full", () => {
    const full = Array.from({ length: SAVED_TRAINS_LIMIT }, (_, i) =>
      saved(`old-${String(i)}`),
    );

    const list = addSavedTrain(full, saved("new"));

    expect(list).toHaveLength(SAVED_TRAINS_LIMIT);
    expect(list[0]?.id).toBe("new");
    expect(list.at(-1)?.id).toBe(`old-${String(SAVED_TRAINS_LIMIT - 2)}`);
  });
});

describe("removeSavedTrain and isTrainSaved", () => {
  test("removes one and leaves the rest", () => {
    const list = removeSavedTrain([saved("1"), saved("2")], "1");

    expect(list.map((train) => train.id)).toEqual(["2"]);
  });

  test("removing something absent changes nothing", () => {
    expect(removeSavedTrain([saved("1")], "nope")).toHaveLength(1);
  });

  test("reports membership", () => {
    expect(isTrainSaved([saved("1")], "1")).toBe(true);
    expect(isTrainSaved([saved("1")], "2")).toBe(false);
  });
});
