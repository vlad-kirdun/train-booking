"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  buildSearchPath,
  parseSearchQuery,
  type SearchQuery,
} from "@/domain/search-query";
import type { Station } from "@/lib/api";

interface SearchFormProps {
  stations: Station[];
  query: SearchQuery;
}

/**
 * Submitting navigates. Search state belongs in the URL, so the form's only job
 * is to build the next address — there is no local "current search" that could
 * drift from what the address bar says.
 *
 * The element is a real `method="get"` form, so it still works with JavaScript
 * disabled; the handler upgrades that to a client-side navigation with a clean
 * canonical URL instead of one carrying every empty field.
 */
export function SearchForm({ stations, query }: SearchFormProps) {
  const router = useRouter();
  const [from, setFrom] = useState(query.from ?? "");
  const [to, setTo] = useState(query.to ?? "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value === "string") params.set(key, value);
    }

    // Routed through the same parser as an incoming URL, so a value typed into
    // the form and a value pasted into the address bar cannot be interpreted
    // differently. No `page` field, so any change returns to the first page.
    router.push(buildSearchPath(parseSearchQuery(params)));
  }

  function swapStations() {
    setFrom(to);
    setTo(from);
  }

  return (
    <form
      method="get"
      action="/trains"
      onSubmit={handleSubmit}
      className="border-border bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-2 sm:gap-4 sm:p-5"
    >
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end sm:gap-4">
        <Field label="From" htmlFor="from">
          <StationSelect
            id="from"
            name="from"
            value={from}
            onChange={setFrom}
            stations={stations}
            placeholder="Any departure"
          />
        </Field>

        <button
          type="button"
          onClick={swapStations}
          // Sized to its content on narrow screens, where a full-width control
          // would read as another empty field.
          className="border-border hover:bg-background focus-visible:outline-foreground h-11 w-fit justify-self-end rounded-lg border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 sm:justify-self-auto"
          aria-label="Swap departure and arrival"
        >
          <span aria-hidden="true">⇅</span>
        </button>

        <Field label="To" htmlFor="to">
          <StationSelect
            id="to"
            name="to"
            value={to}
            onChange={setTo}
            stations={stations}
            placeholder="Any arrival"
          />
        </Field>
      </div>

      <Field label="Date" htmlFor="date" hint="Leave empty to search all dates">
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={query.date ?? ""}
          className={controlClassName}
        />
      </Field>

      <Field label="Max price" htmlFor="maxPrice" hint="In euro, per seat">
        <input
          id="maxPrice"
          name="maxPrice"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder="No limit"
          defaultValue={query.maxPrice ?? ""}
          className={controlClassName}
        />
      </Field>

      {/* Sorting is a view preference and survives a filter change; omitted when
          it is already the default so the common URL stays short. */}
      {query.sort !== "price_asc" && (
        <input type="hidden" name="sort" value={query.sort} />
      )}

      <button
        type="submit"
        className="bg-foreground text-background focus-visible:outline-foreground h-11 rounded-lg px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-span-2"
      >
        Search trains
      </button>
    </form>
  );
}

const controlClassName =
  "border-border bg-background focus-visible:outline-foreground h-11 w-full rounded-lg border px-3 focus-visible:outline-2 focus-visible:outline-offset-2";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint !== undefined && <p className="text-muted text-xs">{hint}</p>}
    </div>
  );
}

/**
 * A native select rather than a custom listbox: on mobile — 60% of the traffic
 * — it opens the platform picker, which beats any popup we could build, and it
 * keeps the form usable without JavaScript.
 */
function StationSelect({
  id,
  name,
  value,
  onChange,
  stations,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  stations: Station[];
  placeholder: string;
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className={controlClassName}
    >
      <option value="">{placeholder}</option>
      {stations.map((station) => (
        <option key={station.slug} value={station.slug}>
          {station.name}
        </option>
      ))}
    </select>
  );
}
