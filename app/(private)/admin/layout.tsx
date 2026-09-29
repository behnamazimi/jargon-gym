import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/admin/page-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-5 py-7 pb-20 in-[.chrome-dock]:max-md:pb-dock md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
      <AdminNav />
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  );
}
