import { afterEach, describe, expect, test, vi } from "vitest";

import { absoluteUrl, DEFAULT_SITE_URL, getSiteUrl } from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  test("falls back to localhost so the project runs unconfigured", () => {
    vi.stubEnv("SITE_URL", undefined);

    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL);
  });

  test("treats a blank value as unset", () => {
    vi.stubEnv("SITE_URL", "  ");

    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL);
  });

  // A canonical tag reading "https://example.test//trains" points somewhere
  // else than the page claiming it.
  test("strips trailing slashes", () => {
    vi.stubEnv("SITE_URL", "https://example.test//");

    expect(getSiteUrl()).toBe("https://example.test");
    expect(absoluteUrl("/trains")).toBe("https://example.test/trains");
  });
});
