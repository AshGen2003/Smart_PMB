/**
 * Client Component rendering a farmer's read-only view of every active
 * paddy type's guaranteed-price history (farmers.views.PaddyTypeViewSet.
 * price_history). One table per paddy type, most recent snapshot first.
 * Read-only — no actions, but still a Client Component since it needs
 * useLanguage(), same as every other farmer-portal page.
 */
"use client";

import React from "react";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "./PriceHistory.module.css";

export type PriceRecordRow = {
  id: number;
  guaranteed_price: string;
  season: "yala" | "maha";
  effective_date: string;
};

export type PaddyTypeGroup = {
  paddyType: { id: number; type_name: string; guaranteed_price: string };
  records: PriceRecordRow[];
};

export default function PriceHistoryManager({ groups }: { groups: PaddyTypeGroup[] }) {
  const { t } = useLanguage();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t.farmerPriceHistory.title}</h1>
          <span className={styles.subtitle}>{t.farmerPriceHistory.subtitle}</span>
        </div>
      </div>

      {groups.map(({ paddyType, records }) => (
        <div key={paddyType.id} className={styles.container}>
          <h2 className={styles.pageTitle} style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
            {paddyType.type_name}
          </h2>
          {records.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.farmerPriceHistory.tablePrice}</th>
                  <th>{t.farmerPriceHistory.tableSeason}</th>
                  <th>{t.farmerPriceHistory.tableDate}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{Number(r.guaranteed_price).toLocaleString()}</td>
                    <td>{r.season === "yala" ? t.seasons.yala : t.seasons.maha}</td>
                    <td>{format(new Date(r.effective_date), "MMM d, yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <TrendingUp size={24} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
              <div>{t.farmerPriceHistory.emptyState}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
