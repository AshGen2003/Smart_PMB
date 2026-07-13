"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { Pencil, Plus, Search, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { deleteWarehouse } from "@/app/actions/warehouses";
import WarehouseFormModal, {
  type DistrictOption,
  type EditableWarehouse,
} from "./WarehouseFormModal";
import styles from "./Warehouses.module.css";

export type WarehouseRow = {
  id: number;
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: "active" | "inactive" | "full" | "under_maintenance";
  contact_number: string;
  established_date: string | null;
  district: number | null;
  district_name: string | null;
  province: number | null;
  province_name: string | null;
  location: string;
};

const STATUS_LABEL: Record<WarehouseRow["status"], string> = {
  active: "Active",
  inactive: "Inactive",
  full: "Full",
  under_maintenance: "Under Maintenance",
};

const STATUS_TINT: Record<WarehouseRow["status"], string> = {
  active: styles.tintGreen,
  inactive: styles.tintNeutral,
  full: styles.tintGold,
  under_maintenance: styles.tintBlue,
};

export default function WarehousesManager({
  warehouses,
  districts,
}: {
  warehouses: WarehouseRow[];
  districts: DistrictOption[];
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; warehouse: EditableWarehouse } | null
  >(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.district_name ?? "").toLowerCase().includes(q)
    );
  }, [warehouses, query]);

  function handleDelete(warehouse: WarehouseRow) {
    if (!window.confirm(`Delete "${warehouse.name}"? This cannot be undone.`)) return;

    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteWarehouse(warehouse.id);
      if (result.error) setDeleteError(result.error);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Warehouses</h1>

        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search warehouses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setModal({ mode: "create" })}
          >
            <Plus size={16} /> New warehouse
          </button>
        </div>
      </div>

      {deleteError && <div className={styles.banner}>{deleteError}</div>}

      <div className={styles.container}>
        <h2 className={styles.sectionLabel}>All warehouses</h2>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((w) => {
              const pct = Number(w.capacity) > 0 ? (Number(w.current_stock) / Number(w.capacity)) * 100 : 0;
              return (
                <div key={w.id} className={clsx(styles.card, STATUS_TINT[w.status])}>
                  <div className={styles.cardHeader}>
                    <div className={styles.titleRow}>
                      <span className={styles.icon}>
                        <WarehouseIcon size={18} />
                      </span>
                      <div>
                        <div className={styles.name}>{w.name}</div>
                        <div className={styles.code}>{w.code}</div>
                      </div>
                    </div>
                    <span className={styles.statusBadge}>{STATUS_LABEL[w.status]}</span>
                  </div>

                  <div className={styles.stockRow}>
                    <span>
                      {Number(w.current_stock).toLocaleString()} / {Number(w.capacity).toLocaleString()} kg
                    </span>
                    <span className={styles.stockPct}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className={styles.stockBarTrack}>
                    <div
                      className={styles.stockBarFill}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  {(w.district_name || w.location) && (
                    <p className={styles.meta}>
                      {[w.district_name, w.location].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() =>
                        setModal({
                          mode: "edit",
                          warehouse: {
                            id: w.id,
                            name: w.name,
                            code: w.code,
                            capacity: w.capacity,
                            status: w.status,
                            contact_number: w.contact_number,
                            established_date: w.established_date,
                            district: w.district,
                            location: w.location,
                          },
                        })
                      }
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className={styles.deleteIconBtn}
                      aria-label="Delete warehouse"
                      disabled={isPending}
                      onClick={() => handleDelete(w)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>No warehouses match your search.</p>
        )}
      </div>

      {modal?.mode === "create" && (
        <WarehouseFormModal mode="create" districts={districts} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <WarehouseFormModal
          mode="edit"
          warehouse={modal.warehouse}
          districts={districts}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
