import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { CollectionsTable } from "@/components/admin/collections/collections-table";
import { collectionsHref, parseCollectionParams } from "@/lib/admin/collections/params";
import { COLLECTION_LIST_LIMIT, queryCollections } from "@/lib/admin/collections/query";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { listAllCollectionsForAdmin } from "@/lib/admin/collections/list-all-collections";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCollectionsPage({ searchParams }: PageProps) {
  const { supabase, user } = await requireAdminPage();
  const params = parseCollectionParams(await searchParams);

  const all = await listAllCollectionsForAdmin(supabase, user.id);
  const { rows, total, page, truncated } = queryCollections(all, params);

  return (
    <>
      <AdminPageHeader
        title="Collections"
        description="Built-in collections can be published as a public page. Other people's private collections are listed but can't be changed."
      />
      <AdminTabs
        label="Collections"
        tabs={[
          {
            href: collectionsHref({ view: "builtin" }),
            label: "Built-in",
            active: params.view === "builtin",
          },
          {
            href: collectionsHref({ view: "all" }),
            label: "All collections",
            active: params.view === "all",
          },
          {
            href: collectionsHref({ view: "reported" }),
            label: "Reported",
            active: params.view === "reported",
          },
        ]}
      />
      <AdminSearchBar
        action="/admin/collections"
        query={params.q}
        label="Search by name, owner or address"
        hidden={{ view: params.view }}
      />
      {truncated ? (
        <p role="status" className="m-0 rounded-lg bg-warning/15 px-3 py-2 text-sm">
          Only the first {COLLECTION_LIST_LIMIT} collections are listed, so some are missing.
        </p>
      ) : null}
      <p className="m-0 text-sm text-base-content/65">
        Publishing also marks a collection built-in. Taking a published collection back offline asks
        first.
      </p>
      <CollectionsTable rows={rows} />
      <AdminPagination
        page={page}
        total={total}
        hrefFor={(next) => collectionsHref({ ...params, page: next })}
      />
    </>
  );
}
