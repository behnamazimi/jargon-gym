import { ChevronRight, Layers } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/jargon/page-header";
import { APP_GUIDES } from "@/lib/jargon/import/guides";

export default function AppPickerPage() {
  return (
    <>
      <PageHeader
        icon={Layers}
        title="Export from another app"
        backHref="/jargon/import"
        backLabel="Add a collection"
        compactOnPhone
      />
      <p className="m-0 text-sm text-base-content/70">
        Pick the app. We&apos;ll show where its export is, then you paste it here.
      </p>
      <ul className="shadow-surface m-0 list-none divide-y divide-base-300/60 overflow-hidden rounded-box bg-base-100 p-0">
        {APP_GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/jargon/import/apps/${guide.slug}`}
              className="flex min-h-16 items-center gap-3 px-4 py-3 no-underline outline-none transition-colors hover:bg-base-200/60 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-base-200 font-semibold">
                {guide.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-base-content">{guide.name}</span>
                <span className="block text-sm text-base-content/70">{guide.summary}</span>
              </span>
              <ChevronRight className="size-4 text-base-content/70" aria-hidden strokeWidth={1.5} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
