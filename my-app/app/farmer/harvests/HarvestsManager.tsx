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
import LogHarvestModal, { type PaddyTypeOption } from "./LogHarvestModal";
import styles from "./Harvests.module.css";

export type HarvestRow = {
  id: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  harvest_date: string;
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

  function handleWithdraw(h: HarvestRow) {
    if (!window.confirm(t.farmerHarvests.confirmWithdraw)) return;
    setActionError(null);
    startTransition(async () => {
      const result = await withdrawHarvest(h.id);
      if (result.error) setActionError(result.error);
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
        {harvests.length > 0 ? (
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
    </div>
  );
}
