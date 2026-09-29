import Link from "next/link";
import { pageBounds } from "@/lib/admin/list-params";

export function AdminPagination({
  page,
  total,
  hrefFor,
}: {
  page: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const { from, to } = pageBounds(page, total);
  const hasPrevious = page > 1;
  const hasNext = to < total;

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
      <p className="m-0 text-base-content/65">
        {total === 0 ? "Nothing to show" : `Showing ${from + 1} to ${to} of ${total}`}
      </p>
      <div className="join">
        {hasPrevious ? (
          <Link href={hrefFor(page - 1)} className="btn btn-sm join-item">
            Previous
          </Link>
        ) : (
          <span className="btn btn-sm btn-disabled join-item">Previous</span>
        )}
        {hasNext ? (
          <Link href={hrefFor(page + 1)} className="btn btn-sm join-item">
            Next
          </Link>
        ) : (
          <span className="btn btn-sm btn-disabled join-item">Next</span>
        )}
      </div>
    </nav>
  );
}
