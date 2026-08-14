import { describe, expect, test } from "vitest";

import { formatDate, formatFullDate, formatPrice } from "./format";

describe("formatPrice", () => {
  test("renders whole euro amounts", () => {
    expect(formatPrice(89)).toBe("€89");
  });

  test("does not show cents the API never sends", () => {
    expect(formatPrice(23.4)).toBe("€23");
  });
});

describe("formatDate", () => {
  test("renders a short, scannable date", () => {
    expect(formatDate("2026-08-15")).toBe("Sat 15 Aug");
  });

  // Formatted in the machine's zone, a plain calendar date lands a day early
  // anywhere west of Greenwich.
  test("does not drift across time zones", () => {
    expect(formatDate("2026-01-01")).toBe("Thu 1 Jan");
    expect(formatFullDate("2026-01-01")).toBe("Thursday, 1 January 2026");
  });
});
