"use client";

import { toggleSavedTrain, useIsTrainSaved } from "@/lib/saved-trains";
import type { Train } from "@/lib/api";

/**
 * Sits inside a card whose whole surface is a link, so it needs `relative` to
 * lift it above the stretched anchor — otherwise the tap opens the train
 * instead of saving it.
 */
export function SaveTrainButton({ train }: { train: Train }) {
  const saved = useIsTrainSaved(train.id);
  const label = saved ? "Saved" : "Save";

  return (
    <button
      type="button"
      aria-pressed={saved}
      // Spelled out rather than assembled from a visually hidden span: name
      // computation collapses the whitespace between the two, which ran the
      // label together as "SaveBerlin to Munich". The visible word stays the
      // first token, so the spoken name still matches what is on screen.
      aria-label={`${label} ${train.from} to ${train.to}, ${train.trainNumber}`}
      onClick={() => {
        toggleSavedTrain(train);
      }}
      className={`border-border relative z-10 h-9 rounded-lg border px-3 text-sm ${
        saved ? "bg-foreground text-background" : "hover:bg-background"
      }`}
    >
      {label}
    </button>
  );
}
