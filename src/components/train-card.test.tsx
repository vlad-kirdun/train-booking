import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { makeTrain } from "@/test/fixtures";

import { TrainCard } from "./train-card";

test("shows the route, the journey and the price", () => {
  const { container } = render(
    <TrainCard
      train={makeTrain({
        from: "Berlin",
        to: "Munich",
        price: 89,
        departureDate: "2026-08-15",
        departureTime: "08:10",
        arrivalTime: "12:45",
        trainNumber: "ICE 522",
      })}
    />,
  );

  expect(screen.getByRole("heading")).toHaveTextContent("Berlin → Munich");
  expect(screen.getByText("€89")).toBeInTheDocument();
  expect(container).toHaveTextContent("Sat 15 Aug, 08:10 – 12:45");
  expect(screen.getByText("ICE 522")).toBeInTheDocument();
});

test("shows how many seats are left", () => {
  render(<TrainCard train={makeTrain({ seatsLeft: 34, totalSeats: 60 })} />);

  expect(screen.getByText("34 of 60 seats left")).toBeInTheDocument();
});

// The list is served from cache, so a sold-out train can still appear in it.
// Saying "0 of 60 seats left" would read as an availability figure.
test("says plainly when nothing is left", () => {
  render(<TrainCard train={makeTrain({ seatsLeft: 0 })} />);

  expect(screen.getByText("No seats left")).toBeInTheDocument();
});
