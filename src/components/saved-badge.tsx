"use client";

import { useIsTrainSaved } from "@/lib/saved-trains";

/**
 * Marks a train in the result list that is already on the shortlist.
 *
 * Saved trains are shown in their own block above the list rather than moved
 * up inside it, so without this the same train would appear twice with nothing
 * connecting the two.
 */
export function SavedBadge({ id }: { id: string }) {
  const saved = useIsTrainSaved(id);
  if (!saved) return null;

  return (
    <span className="border-border text-muted rounded-full border px-2 py-0.5 text-xs">
      Saved
    </span>
  );
}
