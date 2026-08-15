import Link from "next/link";

/**
 * Rendered with a 404 status, so a withdrawn train drops out of the index
 * instead of staying there as a working page.
 *
 * The original search cannot be recovered here — Next does not pass search
 * params to a not-found segment — so the way out is a fresh search.
 */
export default function TrainNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        We could not find that train
      </h1>
      <p className="text-muted text-sm">
        It may have been withdrawn since this link was created.
      </p>
      <Link
        href="/trains"
        className="bg-foreground text-background mx-auto flex h-11 w-fit items-center rounded-lg px-5 font-medium"
      >
        Search for another train
      </Link>
    </main>
  );
}
