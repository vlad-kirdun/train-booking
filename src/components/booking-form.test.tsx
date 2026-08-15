import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import type { BookingState } from "@/lib/actions/book-seats";

import { BookingForm } from "./booking-form";

const outcome = vi.fn<() => BookingState>();

// Stands in for the Server Action, which cannot run in a browser environment.
// Its own branches are covered directly in book-seats.test.ts.
vi.mock("@/lib/actions/book-seats", () => ({
  bookSeats: () => outcome(),
}));

function renderForm(seatsLeft = 34) {
  return render(
    <BookingForm
      trainId="1"
      price={89}
      seatsLeft={seatsLeft}
      backHref="/trains?from=berlin&to=munich"
    />,
  );
}

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /^Book for/ }));
};

beforeEach(() => {
  outcome.mockReset();
});

test("prices the booking as the seat count changes", async () => {
  const user = userEvent.setup();
  renderForm();

  expect(screen.getByRole("button", { name: "Book for €89" })).toBeEnabled();

  await user.clear(screen.getByLabelText("Seats"));
  await user.type(screen.getByLabelText("Seats"), "3");

  expect(screen.getByRole("button", { name: "Book for €267" })).toBeEnabled();
});

test("never offers more seats than the train has", () => {
  renderForm(4);

  expect(screen.getByLabelText("Seats")).toHaveAttribute("max", "4");
});

test("shows the confirmation with the count the server returned", async () => {
  const user = userEvent.setup();
  outcome.mockReturnValue({
    status: "confirmed",
    reference: "bk_1",
    seats: 2,
    seatsLeft: 32,
  });
  renderForm();

  await submit(user);

  const confirmation = await screen.findByRole("status");
  expect(confirmation).toHaveTextContent("Booking confirmed");
  expect(confirmation).toHaveTextContent("2 seats for €178");
  expect(confirmation).toHaveTextContent("bk_1");
  expect(confirmation).toHaveTextContent("32");
  // Nothing left to submit — the booking is done.
  expect(screen.queryByLabelText("Seats")).toBeNull();
});

// The branch the brief singles out. It has to say what is really left and give
// a way onward, or the user is stuck on a train they cannot board.
test("on a conflict, reports the real remaining count and offers the way back", async () => {
  const user = userEvent.setup();
  outcome.mockReturnValue({ status: "sold_out", seatsLeft: 3 });
  renderForm();

  await submit(user);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Not enough seats left");
  expect(alert).toHaveTextContent("3 seats are left");
  expect(
    screen.getByRole("link", { name: /Back to the other trains/ }),
  ).toHaveAttribute("href", "/trains?from=berlin&to=munich");
});

test("lowers the limit to what is really available after a conflict", async () => {
  const user = userEvent.setup();
  outcome.mockReturnValue({ status: "sold_out", seatsLeft: 3 });
  renderForm(34);

  await submit(user);

  // Otherwise the form would invite the same impossible request again.
  expect(await screen.findByLabelText("Seats")).toHaveAttribute("max", "3");
});

test("replaces the form with a way out when the train has sold out entirely", async () => {
  const user = userEvent.setup();
  outcome.mockReturnValue({ status: "sold_out", seatsLeft: 0 });
  renderForm();

  await submit(user);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This train has just sold out",
  );
  expect(screen.queryByLabelText("Seats")).toBeNull();
  // Exactly one way onward, not two links to the same place.
  expect(
    screen.getAllByRole("link", { name: /other trains on this route/ }),
  ).toHaveLength(1);
});

test("offers a way out for a train that was already full on arrival", () => {
  renderForm(0);

  expect(screen.queryByLabelText("Seats")).toBeNull();
  expect(
    screen.getByRole("link", { name: "See the other trains on this route" }),
  ).toHaveAttribute("href", "/trains?from=berlin&to=munich");
});

test("keeps the form usable after a failure that is worth retrying", async () => {
  const user = userEvent.setup();
  outcome.mockReturnValue({
    status: "failed",
    title: "We could not reach the timetable service",
    detail: "Check your connection and try again.",
  });
  renderForm();

  await submit(user);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "We could not reach the timetable service",
  );
  expect(screen.getByLabelText("Seats")).toBeInTheDocument();
});
