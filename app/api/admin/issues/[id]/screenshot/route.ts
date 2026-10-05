import { NextResponse } from "next/server";
import { AdminError } from "@/lib/admin/admin-error";
import { isUuid } from "@/lib/admin/list-params";
import { requireAdminClient } from "@/lib/auth/require-session";
import { streamScreenshot } from "@/lib/issues/storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  let supabase;
  try {
    ({ supabase } = await requireAdminClient());
  } catch (err) {
    if (err instanceof AdminError) return new NextResponse(null, { status: 403 });
    throw err;
  }

  const { id } = await params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });

  const { data, error } = await supabase
    .from("issue_reports")
    .select("screenshot_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.screenshot_path) return new NextResponse(null, { status: 404 });

  const file = await streamScreenshot(data.screenshot_path);
  if (!file) return new NextResponse(null, { status: 404 });

  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    },
  });
}
