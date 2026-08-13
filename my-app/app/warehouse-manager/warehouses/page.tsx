/**
 * `/warehouse-manager/warehouses` — list of the manager's assigned
 * warehouses, each expandable to show its inventory breakdown by paddy
 * type. Inventory for every warehouse is fetched up front (a manager only
 * ever has a handful of warehouses) rather than lazily on expand, so no
 * extra client-side API route is needed.
 */
import { apiFetch } from "@/app/lib/api";
import WarehouseInventoryCard, { type InventoryRow } from "./WarehouseInventoryCard";
import styles from "../WarehouseManagerDashboard.module.css";

type WarehouseRow = {
  id: number;
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: string;
  district_name: string | null;
};

export default async function WarehouseManagerWarehousesPage() {
  const res = await apiFetch("/api/warehouse-manager/warehouses/");
  const warehouses: WarehouseRow[] = res.ok ? await res.json() : [];

  const withInventory = await Promise.all(
    warehouses.map(async (w) => {
      const invRes = await apiFetch(`/api/warehouse-manager/warehouses/${w.id}/inventory/`);
      const inventory: InventoryRow[] = invRes.ok ? await invRes.json() : [];
      return { ...w, inventory };
    })
  );

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your warehouses</h1>
        <span className={styles.subtitle}>Stock levels and inventory by paddy type.</span>
      </div>

      {withInventory.length > 0 ? (
        <div className={styles.warehouseGrid}>
          {withInventory.map((w) => (
            <WarehouseInventoryCard
              key={w.id}
              name={w.name}
              code={w.code}
              districtName={w.district_name}
              capacity={Number(w.capacity) || 0}
              currentStock={Number(w.current_stock) || 0}
              status={w.status}
              inventory={w.inventory}
            />
          ))}
        </div>
      ) : (
        <div className={styles.card}>
          <p className={styles.emptyState}>
            No warehouse assigned yet — contact an officer to be linked to a warehouse.
          </p>
        </div>
      )}
    </div>
  );
}
