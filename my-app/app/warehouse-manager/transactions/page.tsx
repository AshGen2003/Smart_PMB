/**
 * `/warehouse-manager/transactions` — full stock-movement history for the
 * logged-in manager's own warehouse (see farmers/views.py's
 * WarehouseManagerTransactionsView, scoped server-side to
 * Warehouse.managed_by == this account).
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import TransactionsManager, { type TransactionRow } from "./TransactionsManager";

export default async function WarehouseManagerTransactionsPage() {
  await requirePermission("view_dashboard");

  const res = await apiFetch("/api/warehouse-manager/transactions/");
  const transactions: TransactionRow[] = res.ok ? await res.json() : [];

  return <TransactionsManager transactions={transactions} />;
}
