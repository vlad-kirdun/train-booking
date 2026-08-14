/**
 * A fixed locale, not the visitor's. Server and client must produce identical
 * strings or hydration breaks, and tests would otherwise depend on the machine
 * they run on. `en-GB` is a deliberate product choice, revisited if the section
 * is ever localised.
 */
const LOCALE = "en-GB";

const priceFormat = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

// UTC throughout: these are plain calendar dates with no time zone of their
// own, and formatting them locally would shift them by a day west of Greenwich.
const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const fullDateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatPrice(amount: number): string {
  return priceFormat.format(amount);
}

/** `2026-08-15` → `Sat, 15 Aug`. */
export function formatDate(isoDate: string): string {
  return dateFormat.format(toUtcDate(isoDate));
}

/** `2026-08-15` → `Saturday, 15 August 2026`. */
export function formatFullDate(isoDate: string): string {
  return fullDateFormat.format(toUtcDate(isoDate));
}

function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}
