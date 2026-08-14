import { isApiError } from "./errors";

export interface FailureDescription {
  title: string;
  detail: string;
  /** False where trying the same thing again cannot plausibly help. */
  retryable: boolean;
}

/**
 * Turns a failure into something worth reading.
 *
 * The brief asks that error states not make the site look broken, and the
 * difference between looking broken and looking honest is whether the message
 * says what happened and what to do next. A slow API and an unreachable one
 * need different sentences, which is why the client keeps its error kinds
 * distinct in the first place.
 */
export function describeApiFailure(error: unknown): FailureDescription {
  if (!isApiError(error)) {
    return {
      title: "Something went wrong",
      detail: "We could not load this. Trying again usually helps.",
      retryable: true,
    };
  }

  switch (error.kind) {
    case "timeout":
      return {
        title: "This is taking longer than usual",
        detail:
          "The timetable service did not answer in time. It is often slow on the first request, so trying again usually works.",
        retryable: true,
      };
    case "network":
      return {
        title: "We could not reach the timetable service",
        detail:
          "Check your connection and try again. If you are online, the service may be briefly unavailable.",
        retryable: true,
      };
    case "server_error":
      return {
        title: "The timetable service is having trouble",
        detail:
          "This is on their side, not yours. It usually clears up within a few minutes.",
        retryable: true,
      };
    case "invalid_response":
      return {
        title: "We could not read the timetable",
        detail:
          "The service answered with something we did not expect, so we would rather show you nothing than show you something wrong.",
        retryable: true,
      };
    case "conflict":
      return {
        title: "Those seats are gone",
        detail: "Someone booked them first. Pick another train to continue.",
        retryable: false,
      };
    case "not_found":
      return {
        title: "We could not find that train",
        detail: "It may have been withdrawn since the link was created.",
        retryable: false,
      };
    case "bad_request":
      return {
        title: "We could not complete that request",
        detail: "Something about it was not valid. Try adjusting your search.",
        retryable: false,
      };
  }
}
