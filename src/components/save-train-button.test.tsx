import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { EMPTY_SEARCH_QUERY } from "@/domain/search-query";
import { resetSavedTrainsCache, toggleSavedTrain } from "@/lib/saved-trains";
import { makeTrain } from "@/test/fixtures";

import { SaveTrainButton } from "./save-train-button";
import { TrainCard } from "./train-card";

beforeEach(() => {
  window.localStorage.clear();
  resetSavedTrainsCache();
});

test("saves and unsaves, reporting its state to assistive technology", async () => {
  const user = userEvent.setup();
  render(<SaveTrainButton train={makeTrain({ id: "1" })} />);

  const button = screen.getByRole("button", { name: /^Save/ });
  expect(button).toHaveAttribute("aria-pressed", "false");

  await user.click(button);
  expect(screen.getByRole("button", { name: /^Saved/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await user.click(screen.getByRole("button", { name: /^Saved/ }));
  expect(screen.getByRole("button", { name: /^Save/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

// Every card would otherwise offer a button called "Save" and nothing else.
test("names which train it saves", () => {
  render(
    <SaveTrainButton
      train={makeTrain({
        from: "Berlin",
        to: "Munich",
        trainNumber: "ICE 522",
      })}
    />,
  );

  expect(
    screen.getByRole("button", { name: "Save Berlin to Munich, ICE 522" }),
  ).toBeInTheDocument();
});

// The card's whole surface is a link. Without the button sitting above it, a
// tap on Save would open the train instead.
test("saving from a card does not follow the card's link", async () => {
  const user = userEvent.setup();
  render(
    <TrainCard train={makeTrain({ id: "7" })} query={EMPTY_SEARCH_QUERY} />,
  );

  await user.click(screen.getByRole("button", { name: /^Save/ }));

  expect(screen.getByRole("button", { name: /^Saved/ })).toBeInTheDocument();
});

test("a saved train is badged in the result list", async () => {
  toggleSavedTrain(makeTrain({ id: "7" }));

  render(
    <TrainCard train={makeTrain({ id: "7" })} query={EMPTY_SEARCH_QUERY} />,
  );

  // Saved trains are pinned above the list rather than moved up inside it, so
  // the badge is what connects the two appearances.
  expect(await screen.findByText("Saved", { selector: "span" })).toBeVisible();
});
