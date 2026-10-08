import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminStat } from "@/components/admin/admin-stat";
import { formatBytes, loadTableHealth } from "@/lib/admin/db-health";
import { requireAdminPage } from "@/lib/admin/page-guard";

export default async function AdminHealthPage() {
  const { supabase } = await requireAdminPage();
  const tables = await loadTableHealth(supabase);
  const watched = tables.filter((table) => table.watch);

  return (
    <>
      <AdminPageHeader
        title="Database health"
        description="Row counts and size of the tables that grow with use."
      />
      {watched.length > 0 ? (
        <div role="alert" className="alert alert-warning">
          <span>
            {watched.map((table) => `${table.name} is ${table.reason}`).join("; ")}. See the growth
            notes in the admin docs.
          </span>
        </div>
      ) : null}
      <AdminSection
        id="tables"
        title="Tables"
        description="Row counts are estimates from the last vacuum."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tables.map((table) => (
            <AdminStat
              key={table.name}
              label={table.name}
              value={table.rows.toLocaleString("en-US")}
              hint={`${formatBytes(table.bytes)}${table.watch ? ` · ${table.reason}` : ""}`}
            />
          ))}
        </div>
      </AdminSection>
    </>
  );
}
