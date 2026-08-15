/**
 * Absolute base for canonical tags, the sitemap and structured data. Those have
 * to be absolute URLs, and the app has no other reason to know where it is
 * deployed.
 */
export const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const configured = process.env.SITE_URL?.trim();
  const siteUrl =
    configured === undefined || configured === ""
      ? DEFAULT_SITE_URL
      : configured;

  return siteUrl.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path}`;
}
