/**
 * `/mill-owner` — the mill owner portal's home dashboard: license/milling
 * KPIs, recent license applications, and recent milling reports.
 * Mill-owner-only (access is enforced by app/mill-owner/layout.tsx).
 */
import { format } from "date-fns";
import clsx from "clsx";
import { FileCheck, ClipboardList, Factory, Wheat } from "lucide-react";
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import styles from "./MillOwnerDashboard.module.css";

const LICENSE_BADGE: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
};

type DashboardPayload = {
  mill: {
    registration_no: string;
    mill_name: string;
    status: string;
    district_name: string | null;
    province_name: string | null;
  };
  kpis: {
    total_licenses: number;
    active_license_status: string | null;
    active_license_expiry: string | null;
    total_milling_reports: number;
    total_paddy_processed_kg: number;
  };
  licenses: {
    id: number;
    license_no: string | null;
    status: string;
    applied_date: string;
    expiry_date: string | null;
  }[];
  milling_reports: {
    id: number;
    report_date: string;
    paddy_processed_kg: string;
    rice_output_kg: string;
  }[];
};

export default async function MillOwnerDashboardPage() {
  const user = await getCurrentUser();
  const res = await apiFetch("/api/mill-owner/dashboard/");

  if (!res.ok) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.card}>
          <h1 className={styles.title}>Almost there</h1>
          <p className={styles.subtitle}>
            We couldn&apos;t find your mill profile yet. Please contact
            support if this persists.
          </p>
        </div>
      </div>
    );
  }

  const data = (await res.json()) as DashboardPayload;
  const { mill, kpis, licenses, milling_reports: millingReports } = data;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>
              Welcome back, {user?.fullName ?? "Mill Owner"}
            </h1>
            <span className={styles.subtitle}>
              {format(new Date(), "EEEE, MMMM do, yyyy")}
              {mill.district_name ? ` · ${mill.district_name}, ${mill.province_name}` : ""}
            </span>
          </div>
          <div className={styles.regBadge}>{mill.registration_no}</div>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Licenses</span>
            <div className={styles.kpiIcon}>
              <FileCheck size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.total_licenses}</h2>
          <span className={styles.kpiHint}>Applications submitted</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Active License</span>
            <div className={styles.kpiIcon}>
              <Factory size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>
            {kpis.active_license_status ? "Approved" : "None"}
          </h2>
          <span className={styles.kpiHint}>
            {kpis.active_license_expiry
              ? `Expires ${format(new Date(kpis.active_license_expiry), "MMM d, yyyy")}`
              : "No active license yet"}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Milling Reports</span>
            <div className={styles.kpiIcon}>
              <ClipboardList size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.total_milling_reports}</h2>
          <span className={styles.kpiHint}>Submitted to date</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Paddy Processed</span>
            <div className={styles.kpiIcon}>
              <Wheat size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>
            {Number(kpis.total_paddy_processed_kg).toLocaleString()} kg
          </h2>
          <span className={styles.kpiHint}>{mill.status}</span>
        </div>
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Licenses</h3>
          </div>
          {licenses.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>License No.</th>
                  <th>Applied</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((l) => (
                  <tr key={l.id}>
                    <td>{l.license_no ?? "—"}</td>
                    <td>{format(new Date(l.applied_date), "MMM d, yyyy")}</td>
                    <td>
                      <span
                        className={clsx(
                          styles.badge,
                          styles[LICENSE_BADGE[l.status] ?? "badge-neutral"]
                        )}
                      >
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.emptyState}>
              No license applications yet. Apply from the Licenses page.
            </p>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Milling Reports</h3>
          </div>
          {millingReports.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Paddy (kg)</th>
                  <th>Rice (kg)</th>
                </tr>
              </thead>
              <tbody>
                {millingReports.map((r) => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.report_date), "MMM d, yyyy")}</td>
                    <td>{Number(r.paddy_processed_kg).toLocaleString()}</td>
                    <td>{Number(r.rice_output_kg).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.emptyState}>
              No milling reports submitted yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
