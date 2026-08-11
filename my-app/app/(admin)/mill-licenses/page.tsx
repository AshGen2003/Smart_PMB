/**
 * `/mill-licenses` — merged into the combined `/licenses` page (see
 * (admin)/licenses/LicenseTabs.tsx's "Mill License" tab). Kept as a
 * redirect so old links/bookmarks still land somewhere useful.
 */
import { redirect } from "next/navigation";

export default function MillLicensesPage() {
  redirect("/licenses");
}
