/**
 * Combines the two license-related queues into a single "License" page: a
 * top-right tab switcher between Authorized Purchaser License and Mill
 * License. Both queues (LicenseApplication account-approval, and the
 * ongoing per-mill operating License + inspections) are unchanged data
 * models underneath — this just orchestrates the existing manager
 * components in one place instead of two separate nav entries/pages.
 */
"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { BadgeCheck, FileCheck } from "lucide-react";
import LicensesManager, { type LicenseApplicationRow } from "./LicensesManager";
import MillLicensesManager, { type LicenseRow } from "../mill-licenses/LicensesManager";
import InspectionsSection, {
  type InspectionRow,
  type MillOption,
} from "../mill-licenses/InspectionsSection";
import styles from "../mill-licenses/Licenses.module.css";

export default function LicenseTabs({
  applications,
  millLicenses,
  inspections,
  mills,
  canWrite,
}: {
  applications: LicenseApplicationRow[];
  millLicenses: LicenseRow[];
  inspections: InspectionRow[];
  mills: MillOption[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<"purchaser" | "mill">("purchaser");

  const purchaserApplications = applications.filter(
    (a) => a.license_type === "authorized_purchaser"
  );
  const millApplications = applications.filter((a) => a.license_type === "mill_owner");

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>License</h1>
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={clsx(styles.tab, tab === "purchaser" && styles.tabActive)}
            onClick={() => setTab("purchaser")}
          >
            <BadgeCheck size={15} /> Authorized Purchaser License
          </button>
          <button
            type="button"
            className={clsx(styles.tab, tab === "mill" && styles.tabActive)}
            onClick={() => setTab("mill")}
          >
            <FileCheck size={15} /> Mill License
          </button>
        </div>
      </div>

      {tab === "purchaser" && (
        <LicensesManager
          applications={purchaserApplications}
          canWrite={canWrite}
          title="Authorized Purchaser Applications"
          subtitle="Authorized purchasers requesting access"
        />
      )}

      {tab === "mill" && (
        <>
          <LicensesManager
            applications={millApplications}
            canWrite={canWrite}
            title="Mill Owner Applications"
            subtitle="Mill owners requesting access"
          />
          <MillLicensesManager licenses={millLicenses} canWrite={canWrite} />
          <InspectionsSection inspections={inspections} mills={mills} canWrite={canWrite} />
        </>
      )}
    </div>
  );
}
