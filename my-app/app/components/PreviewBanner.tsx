/**
 * Persistent banner shown on every page while an admin is using Portal
 * Preview (see app/actions/preview.ts and the `/preview` page), so it's
 * never mistaken for the admin's real view. Mounted by both AdminShell and
 * FarmerShell, since previewing "Farmer" actually navigates into the real
 * farmer portal rather than a mockup.
 */
import { Eye } from "lucide-react";
import { exitPreview } from "@/app/actions/preview";
import styles from "./PreviewBanner.module.css";

export default function PreviewBanner({ roleName }: { roleName: string }) {
  return (
    <div className={styles.banner}>
      <span className={styles.label}>
        <Eye size={15} />
        Previewing as <strong>{roleName}</strong> — actions are read-only
      </span>
      <form action={exitPreview}>
        <button type="submit" className={styles.exitBtn}>
          Exit Preview
        </button>
      </form>
    </div>
  );
}
