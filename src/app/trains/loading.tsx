import { ResultsSkeleton } from "@/components/results-skeleton";

/**
 * Covers the first paint, before even the station directory has arrived. Once
 * the shell is up, the Suspense boundary inside the page takes over and only
 * the results area waits — the form stays usable while the API is thinking.
 */
export default function TrainsLoading() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6 sm:py-10">
      <div className="grid animate-pulse gap-2" aria-hidden="true">
        <div className="bg-surface h-8 w-64 rounded" />
        <div className="bg-surface h-4 w-80 max-w-full rounded" />
      </div>

      <div
        aria-hidden="true"
        className="border-border bg-surface h-72 animate-pulse rounded-xl border sm:h-56"
      />

      <ResultsSkeleton />
    </main>
  );
}
