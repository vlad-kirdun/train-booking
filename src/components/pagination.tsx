import Link from "next/link";

import {
  buildSearchPath,
  type SearchQuery,
  withSearchQuery,
} from "@/domain/search-query";

interface PaginationProps {
  query: SearchQuery;
  page: number;
  totalPages: number;
}

/**
 * Plain links, not infinite scroll. A page of results has to be shareable and
 * indexable, and half of sales arrive from search — an endless list is neither.
 */
export function Pagination({ query, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Search results pages"
      className="flex items-center justify-between gap-4"
    >
      <PageLink query={query} page={page - 1} disabled={page <= 1}>
        Previous
      </PageLink>

      <p className="text-muted text-sm" aria-live="polite">
        Page {page} of {totalPages}
      </p>

      <PageLink query={query} page={page + 1} disabled={page >= totalPages}>
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  query,
  page,
  disabled,
  children,
}: {
  query: SearchQuery;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const className = "rounded-lg border border-border px-3 py-2 text-sm";

  if (disabled) {
    return (
      <span className={`${className} text-muted opacity-50`} aria-disabled>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={buildSearchPath(withSearchQuery(query, { page }))}
      className={`${className} hover:bg-surface`}
    >
      {children}
    </Link>
  );
}
