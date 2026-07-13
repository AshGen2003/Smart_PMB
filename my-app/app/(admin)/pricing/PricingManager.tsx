"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { Coins, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deletePaddyType } from "@/app/actions/pricing";
import PaddyTypeFormModal, { type EditablePaddyType } from "./PaddyTypeFormModal";
import styles from "./Pricing.module.css";

export type PaddyTypeRow = {
  id: number;
  type_name: string;
  variety: string;
  description: string;
  guaranteed_price: string;
  is_active: boolean;
};

const TINTS = [styles.tintGreen, styles.tintGold, styles.tintNeutral];

export default function PricingManager({ paddyTypes }: { paddyTypes: PaddyTypeRow[] }) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; paddyType: EditablePaddyType } | null
  >(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paddyTypes;
    return paddyTypes.filter(
      (p) => p.type_name.toLowerCase().includes(q) || p.variety.toLowerCase().includes(q)
    );
  }, [paddyTypes, query]);

  const prices = paddyTypes.map((p) => Number(p.guaranteed_price));
  const activeCount = paddyTypes.filter((p) => p.is_active).length;
  const highest = prices.length ? Math.max(...prices) : 0;
  const lowest = prices.length ? Math.min(...prices) : 0;

  function handleDelete(paddyType: PaddyTypeRow) {
    if (!window.confirm(`Delete "${paddyType.type_name}"? This cannot be undone.`)) return;

    setDeleteError(null);
    startTransition(async () => {
      const result = await deletePaddyType(paddyType.id);
      if (result.error) setDeleteError(result.error);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Guaranteed Pricing</h1>

        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search paddy types..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setModal({ mode: "create" })}
          >
            <Plus size={16} /> New paddy type
          </button>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active paddy types</div>
          <div className={styles.statValue}>{activeCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Highest price</div>
          <div className={styles.statValue}>Rs. {highest.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Lowest price</div>
          <div className={styles.statValue}>Rs. {lowest.toLocaleString()}</div>
        </div>
      </div>

      {deleteError && <div className={styles.banner}>{deleteError}</div>}

      <div className={styles.container}>
        <h2 className={styles.sectionLabel}>All paddy types</h2>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((p, i) => (
              <div key={p.id} className={clsx(styles.card, TINTS[i % TINTS.length])}>
                <div className={styles.cardHeader}>
                  <div className={styles.titleRow}>
                    <span className={styles.icon}>
                      <Coins size={18} />
                    </span>
                    <div>
                      <div className={styles.name}>{p.type_name}</div>
                      {p.variety && <div className={styles.variety}>{p.variety}</div>}
                    </div>
                  </div>
                  <span
                    className={clsx(styles.statusBadge, !p.is_active && styles.statusInactive)}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className={styles.price}>
                  Rs. {Number(p.guaranteed_price).toLocaleString()}
                  <span className={styles.priceUnit}>/kg</span>
                </div>

                {p.description && <p className={styles.description}>{p.description}</p>}

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() =>
                      setModal({
                        mode: "edit",
                        paddyType: {
                          id: p.id,
                          type_name: p.type_name,
                          variety: p.variety,
                          description: p.description,
                          guaranteed_price: p.guaranteed_price,
                          is_active: p.is_active,
                        },
                      })
                    }
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className={styles.deleteIconBtn}
                    aria-label="Delete paddy type"
                    disabled={isPending}
                    onClick={() => handleDelete(p)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No paddy types match your search.</p>
        )}
      </div>

      {modal?.mode === "create" && (
        <PaddyTypeFormModal mode="create" onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <PaddyTypeFormModal
          mode="edit"
          paddyType={modal.paddyType}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
