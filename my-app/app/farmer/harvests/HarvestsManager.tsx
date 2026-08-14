/**
 * Client Component driving the farmer's own harvest history: a table of
 * all their submissions plus a "Log harvest" button that opens
 * LogHarvestModal, and a withdraw action (only shown on pending rows).
 * Mirrors the table/action pattern in (admin)/approvals/ApprovalsManager.tsx,
 * scaled down to what a farmer can actually do (submit + withdraw, no
 * edit/approve/reject).
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import Link from "next/link";
import { Plus, QrCode, Sprout } from "lucide-react";
import { withdrawHarvest } from "@/app/actions/farmer";
import { useLanguage } from "@/app/components/LanguageProvider";
import ConfirmModal from "@/app/components/ConfirmModal";
import LogHarvestModal, { type PaddyTypeOption } from "./LogHarvestModal";
import styles from "./Harvests.module.css";

// Shape of one row of data as sent by the backend (see farmers/serializers.py's
// HarvestSerializer) — TypeScript checks every place this data is used
// matches this shape, which catches typos like `h.qty` instead of `h.quantity_kg`.
export type HarvestRow = {
  id: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  harvest_date: string;
  // The harvest's lifecycle: pending (just logged) -> verified (officer graded
  // + priced it) -> collected (officer confirmed pickup, payment completes).
  // Can also go pending -> rejected. See farmers/models.py's Harvest.Status.
  status: "pending" | "verified" | "collected" | "rejected";
  lot_code: string | null;
  meets_pmb_quality_standard: boolean | null;
};

const HARVEST_BADGE: Record<string, string> = {
  pending: "badge-warning",
  verified: "badge-success",
  collected: "badge-success",
  rejected: "badge-danger",
};

export default function HarvestsManager({
  harvests,
  paddyTypes,
}: {
  harvests: HarvestRow[];
  paddyTypes: PaddyTypeOption[];
}) {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const STATUS_LABEL: Record<string, string> = {
    pending: t.farmerCharts.statusPending,
    verified: t.farmerCharts.statusVerified,
    collected: t.farmerCharts.statusCollected,
    rejected: t.farmerCharts.statusRejected,
  };

  const [withdrawTarget, setWithdrawTarget] = useState<HarvestRow | null>(null);

  // Clicking "Withdraw" doesn't delete right away — it just remembers which
  // row was clicked, which makes the <ConfirmModal> below appear.
  function handleWithdraw(h: HarvestRow) {
    setWithdrawTarget(h);
  }

  // Runs only after the farmer clicks "Withdraw" a second time, inside the
  // confirmation popup. Calls withdrawHarvest() in app/actions/farmer.ts,
  // which deletes the harvest on the backend (only allowed while "pending").
  function confirmWithdraw() {
    if (!withdrawTarget) return;
    const target = withdrawTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await withdrawHarvest(target.id);
      if (result.error) setActionError(result.error);
      setWithdrawTarget(null);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t.farmerHarvests.title}</h1>
          <span className={styles.subtitle}>{t.farmerHarvests.subtitle}</span>
        </div>
        <button type="button" className={styles.newBtn} onClick={() => setModalOpen(true)}>
          <Plus size={16} /> {t.farmerHarvests.logHarvest}
        </button>
      </div>

      {actionError && <div className={styles.modalBanner}>{actionError}</div>}

      <div className={styles.container}>
        {/* The actual harvest history table. To add a new column: add a <th> here
            and a matching <td> below, and make sure HarvestSerializer on the
            backend actually returns that field (see farmers/serializers.py). */}
        {harvests.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.farmerHarvests.tablePaddyType}</th>
                  <th>{t.farmerHarvests.tableQuantity}</th>
                  <th>{t.farmerHarvests.tableHarvestDate}</th>
                  <th>{t.farmerHarvests.tableStatus}</th>
                  <th>{t.farmerHarvests.tableQuality}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {/* One <tr> per harvest — h.status decides the badge color/label and whether "Withdraw" shows. */}
                {harvests.map((h) => (
                  <tr key={h.id}>
                    <td>{h.paddy_type_name ?? "—"}</td>
                    <td>{Number(h.quantity_kg).toLocaleString()}</td>
                    <td>{format(new Date(h.harvest_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={clsx(styles.badge, styles[HARVEST_BADGE[h.status] ?? "badge-neutral"])}>
                        {STATUS_LABEL[h.status] ?? h.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={clsx(
                          styles.badge,
                          styles[
                            h.meets_pmb_quality_standard === null
                              ? "badge-neutral"
                              : h.meets_pmb_quality_standard
                              ? "badge-success"
                              : "badge-danger"
                          ]
                        )}
                      >
                        {h.meets_pmb_quality_standard === null
                          ? t.farmerHarvests.qualityNotAssessed
                          : h.meets_pmb_quality_standard
                          ? t.farmerHarvests.qualityPass
                          : t.farmerHarvests.qualityFail}
                      </span>
                    </td>
                    <td>
                      {h.status === "pending" && (
                        <button
                          type="button"
                          className={styles.withdrawBtn}
                          disabled={isPending}
                          onClick={() => handleWithdraw(h)}
                        >
                          {t.farmerHarvests.withdraw}
                        </button>
                      )}
                      {h.lot_code && (
                        <Link href={`/trace/${h.lot_code}`} target="_blank" className={styles.traceLink}>
                          <QrCode size={14} /> {t.farmerHarvests.viewQr}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Sprout size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>{t.farmerHarvests.emptyState}</div>
          </div>
        )}
      </div>

      {modalOpen && (
        <LogHarvestModal paddyTypes={paddyTypes} onClose={() => setModalOpen(false)} />
      )}

      {withdrawTarget && (
        <ConfirmModal
          title={t.farmerHarvests.confirmWithdrawTitle}
          message={t.farmerHarvests.confirmWithdraw}
          confirmLabel={t.farmerHarvests.withdraw}
          pendingLabel={t.farmerHarvests.withdrawing}
          variant="warning"
          pending={isPending}
          onConfirm={confirmWithdraw}
          onClose={() => setWithdrawTarget(null)}
        />
      )}
    </div>
  );
}
