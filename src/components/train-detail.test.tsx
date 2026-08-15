import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { makeTrain } from "@/test/fixtures";

import { TrainDetail } from "./train-detail";

test("shows the journey, the price and the full date", () => {
  render(
    <TrainDetail
      train={makeTrain({
        trainNumber: "ICE 522",
        from: "Berlin",
        to: "Munich",
        departureDate: "2026-08-15",
        departureTime: "08:10",
        arrivalTime: "12:45",
        price: 89,
        carriageClass: "2nd Class",
      })}
    />,
  );

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Berlin → Munich",
  );
  expect(screen.getByText("Saturday, 15 August 2026")).toBeInTheDocument();
  expect(screen.getByText("08:10")).toBeInTheDocument();
  expect(screen.getByText("12:45")).toBeInTheDocument();
  expect(screen.getByText("€89")).toBeInTheDocument();
});

// This page fetches uncached, so unlike the list it can speak in the present
// tense about availability.
test("states availability as the current figure", () => {
  render(<TrainDetail train={makeTrain({ seatsLeft: 34, totalSeats: 60 })} />);

  expect(screen.getByTestId("availability")).toHaveTextContent(
    "34 of 60 seats are available right now.",
  );
});

test("says plainly when the train is full", () => {
  render(<TrainDetail train={makeTrain({ seatsLeft: 0 })} />);

  expect(screen.getByTestId("availability")).toHaveTextContent(
    "This train is fully booked.",
  );
});
