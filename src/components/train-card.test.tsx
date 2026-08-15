import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { EMPTY_SEARCH_QUERY } from "@/domain/search-query";
import { makeTrain } from "@/test/fixtures";

import { TrainCard } from "./train-card";

const query = { ...EMPTY_SEARCH_QUERY, from: "berlin", to: "munich" };

test("shows the route, the journey and the price", () => {
  const { container } = render(
    <TrainCard
      query={query}
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
  render(
    <TrainCard
      query={query}
      train={makeTrain({ seatsLeft: 34, totalSeats: 60 })}
    />,
  );

  expect(screen.getByText("34 of 60 seats left")).toBeInTheDocument();
});

// The list is served from cache, so a sold-out train can still appear in it.
// Saying "0 of 60 seats left" would read as an availability figure.
test("says plainly when nothing is left", () => {
  render(<TrainCard query={query} train={makeTrain({ seatsLeft: 0 })} />);

  expect(screen.getByText("No seats left")).toBeInTheDocument();
});

// The way back from a train has to return to the same page of the same
// ordering, so the search travels with the link.
test("links to the train, carrying the search that found it", () => {
  render(
    <TrainCard
      query={{ ...query, maxPrice: 40, page: 2 }}
      train={makeTrain({ id: "42" })}
    />,
  );

  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "/trains/42?from=berlin&to=munich&maxPrice=40&page=2",
  );
});

// Every card in the list would otherwise be a link called "Berlin → Munich".
test("gives the link a name that tells it apart from the other cards", () => {
  render(
    <TrainCard
      query={query}
      train={makeTrain({
        trainNumber: "ICE 522",
        departureDate: "2026-08-15",
        departureTime: "08:10",
      })}
    />,
  );

  expect(
    screen.getByRole("link", {
      name: "Berlin → Munich, ICE 522, Sat 15 Aug at 08:10",
    }),
  ).toBeInTheDocument();
});
