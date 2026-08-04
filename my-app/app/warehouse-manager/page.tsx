/**
 * `/warehouse-manager` — the logged-in warehouse manager's own dashboard:
 * hero stock stats, a stock-by-paddy-type breakdown (with add/remove-stock
 * actions), and recent stock movements for the single warehouse they
 * manage (Warehouse.managed_by). See farmers/views.py's
 * WarehouseManagerDashboardView/WarehouseManagerAdjustStockView — every
 * write is scoped server-side to this account's own warehouse only.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch, apiFetchCached } from "@/app/lib/api";
import WarehouseManagerDashboardView, {
  type WarehouseDetail,
  type InventoryLine,
  type TransactionLogEntry,
  type AlertRow,
  type TransferRequestRow,
} from "./WarehouseManagerDashboardView";
import type { PaddyTypeOption } from "./StockAdjustModal";
import type { TransferWarehouseOption, TransferInventoryLine } from "./TransferRequestModal";
import styles from "./WarehouseManagerDashboard.module.css";

export default async function WarehouseManagerDashboardPage() {
  await requirePermission("view_dashboard");

  const [res, paddyTypesRes, transferOptionsRes, transferRequestsRes] = await Promise.all([
    apiFetch("/api/warehouse-manager/dashboard/"),
    apiFetchCached("/api/admin/paddy-types/", 300, ["paddy-types"]),
    apiFetch("/api/warehouse-manager/transfer-options/"),
    apiFetch("/api/warehouse-manager/transfer-requests/"),
  ]);

  if (!res.ok) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Warehouse dashboard</h1>
        </div>
        <p className={styles.empty}>
          You are not currently assigned to manage a warehouse. Contact a PMB officer if you
          believe this is a mistake.
        </p>
      </div>
    );
  }

  const data: {
    warehouse: WarehouseDetail;
    inventory: InventoryLine[];
    transactions: TransactionLogEntry[];
    alerts: AlertRow[];
  } = await res.json();
  const paddyTypes: PaddyTypeOption[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];
  const transferOptions: { warehouses: TransferWarehouseOption[]; inventory: TransferInventoryLine[] } =
    transferOptionsRes.ok ? await transferOptionsRes.json() : { warehouses: [], inventory: [] };
  const transferRequests: TransferRequestRow[] = transferRequestsRes.ok
    ? await transferRequestsRes.json()
    : [];

  return (
    <WarehouseManagerDashboardView
      warehouse={data.warehouse}
      inventory={data.inventory}
      transactions={data.transactions}
      alerts={data.alerts}
      paddyTypes={paddyTypes}
      transferWarehouses={transferOptions.warehouses}
      transferInventory={transferOptions.inventory}
      transferRequests={transferRequests}
    />
  );
}
