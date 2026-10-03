import { LibraryListSkeleton } from "@/components/page-skeleton";

/** Shown below the sidebar while another collection loads; the sidebar
 *  itself lives in the layout and stays put. */
export default function LibraryLoading() {
  return <LibraryListSkeleton />;
}
