import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { BookingForm } from "@/components/booking-form";
import { PageFailure } from "@/components/page-failure";
import { TrainDetail } from "@/components/train-detail";
import { formatFullDate } from "@/domain/format";
import {
  buildSearchPath,
  buildTrainPath,
  parseSearchQuery,
  type SearchQuery,
} from "@/domain/search-query";
import { getTrain, isApiError, type Train } from "@/lib/api";

/**
 * Never cached. Seat availability is the one number on this page that has to be
 * true at the moment it is read, and the brief makes that a requirement rather
 * than a nicety. `cache()` memoises within a single request so that metadata
 * and the page body share one fetch without weakening that.
 */
const loadTrain = cache(async (id: string) =>
  getTrain(id, { cache: "no-store" }),
);

export async function generateMetadata(
  props: PageProps<"/trains/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;

  const train = await loadTrain(id).catch((error: unknown) => {
    // Decided here rather than in the page body: metadata resolves before the
    // response starts streaming, and once the shell has flushed the status is
    // already 200. Calling notFound() only in the body rendered the right page
    // with the wrong status, which would leave a withdrawn train in the index
    // as a working page.
    if (isApiError(error) && error.kind === "not_found") notFound();
    return undefined;
  });

  if (train === undefined) return { title: "Train" };

  return {
    title: `${train.trainNumber}: ${train.from} to ${train.to}`,
    description: `${train.trainNumber} departs ${train.from} at ${train.departureTime} on ${formatFullDate(train.departureDate)} and arrives in ${train.to} at ${train.arrivalTime}.`,
  };
}

export default async function TrainPage(props: PageProps<"/trains/[id]">) {
  const [{ id }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const query = parseSearchQuery(searchParams);

  let train: Train;
  try {
    train = await loadTrain(id);
  } catch (error) {
    // A missing train is a 404, not an error screen: the status has to be right
    // or a withdrawn train stays in the index as a working page.
    if (isApiError(error) && error.kind === "not_found") notFound();

    return <PageFailure error={error} retryHref={buildTrainPath(id, query)} />;
  }

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6 sm:py-10">
      <BackToResults query={query} />
      <TrainDetail train={train} />
      <BookingForm
        trainId={train.id}
        price={train.price}
        seatsLeft={train.seatsLeft}
        backHref={buildSearchPath(query)}
      />
    </main>
  );
}

/**
 * Carries the original search, so the way back is the same page of the same
 * ordering the user left — not a reset list they have to navigate again.
 */
function BackToResults({ query }: { query: SearchQuery }) {
  return (
    <Link href={buildSearchPath(query)} className="text-muted w-fit text-sm">
      ← Back to results
    </Link>
  );
}
