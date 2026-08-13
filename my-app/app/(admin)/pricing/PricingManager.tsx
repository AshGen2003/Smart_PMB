/**
 * Client Component for the pricing page: a searchable card grid of paddy
 * types with guaranteed prices, plus create/edit/delete via a modal form
 * and Server Actions.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Coins, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deletePaddyType } from "@/app/actions/pricing";
import ConfirmModal from "@/app/components/ConfirmModal";
import PaddyTypeFormModal, { type EditablePaddyType } from "./PaddyTypeFormModal";
import styles from "./Pricing.module.css";

/** Shape of a paddy type row as returned by `GET /api/admin/paddy-types/`. */
export type PaddyTypeRow = {
  id: number;
  type_name: string;
  variety: string;
  description: string;
  guaranteed_price: string;
  is_active: boolean;
};

/** One historical guaranteed-price snapshot, as returned by `GET /api/admin/paddy-types/<id>/price-history/`. */
export type PriceHistoryRow = {
  id: number;
  guaranteed_price: string;
  season: "yala" | "maha";
  effective_date: string;
};

const SEASON_LABEL: Record<"yala" | "maha", string> = { yala: "Yala", maha: "Maha" };

// Cycles a few background tint classes across the cards purely for visual variety.
const TINTS = [styles.tintGreen, styles.tintGold, styles.tintNeutral];

/** Renders the search bar, summary stat cards, and the paddy-type card grid; owns the create/edit modal and delete-confirmation flow. */
export default function PricingManager({
  paddyTypes,
  priceHistory = {},
  canWrite = true,
}: {
  paddyTypes: PaddyTypeRow[];
  // Pre-fetched server-side (see page.tsx) — keyed by paddy type id.
  priceHistory?: Record<number, PriceHistoryRow[]>;
  // False for viewers who can only see prices (e.g. Portal Preview) — hides
  // the create/edit/delete affordances.
  canWrite?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; paddyType: EditablePaddyType } | null
  >(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaddyTypeRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Client-side filter by type name or variety (case-insensitive substring match).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paddyTypes;
    return paddyTypes.filter(
      (p) => p.type_name.toLowerCase().includes(q) || p.variety.toLowerCase().includes(q)
    );
  }, [paddyTypes, query]);

  const activeCount = paddyTypes.filter((p) => p.is_active).length;
  // Track which paddy type each extreme belongs to (not just the number)
  // so officers can see at a glance what's driving the highest/lowest
  // guaranteed price, instead of an unexplained figure.
  const highestType = paddyTypes.reduce<PaddyTypeRow | null>(
    (max, p) => (!max || Number(p.guaranteed_price) > Number(max.guaranteed_price) ? p : max),
    null
  );
  const lowestType = paddyTypes.reduce<PaddyTypeRow | null>(
    (min, p) => (!min || Number(p.guaranteed_price) < Number(min.guaranteed_price) ? p : min),
    null
  );

  // Opens the confirmation modal; confirmDelete below actually calls the
  // deletePaddyType Server Action inside a transition once the user
  // confirms, so the UI doesn't block while it runs.
  function handleDelete(paddyType: PaddyTypeRow) {
    setDeleteTarget(paddyType);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deletePaddyType(target.id);
      if (result.error) setDeleteError(result.error);
      setDeleteTarget(null);
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

          {canWrite && (
            <button
              type="button"
              className={styles.newBtn}
              onClick={() => setModal({ mode: "create" })}
            >
              <Plus size={16} /> New paddy type
            </button>
          )}
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active paddy types</div>
          <div className={styles.statValue}>{activeCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Highest price</div>
          <div className={styles.statValue}>
            Rs. {highestType ? Number(highestType.guaranteed_price).toLocaleString() : 0}
          </div>
          {highestType && (
            <div className={styles.statDetail}>
              {highestType.type_name}
              {highestType.variety ? ` · ${highestType.variety}` : ""}
            </div>
          )}
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Lowest price</div>
          <div className={styles.statValue}>
            Rs. {lowestType ? Number(lowestType.guaranteed_price).toLocaleString() : 0}
          </div>
          {lowestType && (
            <div className={styles.statDetail}>
              {lowestType.type_name}
              {lowestType.variety ? ` · ${lowestType.variety}` : ""}
            </div>
          )}
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

                <button
                  type="button"
                  className={styles.historyToggle}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Price history
                </button>

                {expandedId === p.id && (
                  <div className={styles.historyList}>
                    {(priceHistory[p.id] ?? []).length > 0 ? (
                      (priceHistory[p.id] ?? []).map((h) => (
                        <div key={h.id} className={styles.historyRow}>
                          <span>{h.effective_date}</span>
                          <span className={styles.historySeason}>{SEASON_LABEL[h.season]}</span>
                          <span className={styles.historyPrice}>Rs. {Number(h.guaranteed_price).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className={styles.emptyState}>No price history yet.</p>
                    )}
                  </div>
                )}

                {canWrite && (
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
                )}
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

      {deleteTarget && (
        <ConfirmModal
          title="Delete this paddy type?"
          message={
            <>
              Delete <strong>&quot;{deleteTarget.type_name}&quot;</strong>? This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          variant="danger"
          pending={isPending}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
