/**
 * Shown while the results stream in, so the form is usable immediately instead
 * of the page sitting blank behind a slow API.
 *
 * Four placeholders, not a full page of them: enough to read as "results are
 * coming", without pretending to know how many there will be.
 */
export function ResultsSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid animate-pulse gap-3"
      data-testid="results-skeleton"
    >
      <span className="sr-only">Searching for trains…</span>
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          aria-hidden="true"
          className="border-border bg-surface grid gap-3 rounded-xl border p-4"
        >
          <div className="flex justify-between gap-4">
            <div className="bg-border h-5 w-40 rounded" />
            <div className="bg-border h-5 w-14 rounded" />
          </div>
          <div className="bg-border h-4 w-full max-w-72 rounded" />
          <div className="bg-border h-4 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}
