/**
 * `/farmer/payments` — a farmer's full payment history for collected
 * harvests. Fetches the new farmer/payments/ endpoint (farmers.views.
 * FarmerPaymentListView), unlike the dashboard which only shows the 10
 * most recent.
 */
import { apiFetch } from "@/app/lib/api";
import PaymentsManager, { type PaymentRow } from "./PaymentsManager";

export default async function FarmerPaymentsPage() {
  const res = await apiFetch("/api/farmer/payments/");
  const payments: PaymentRow[] = res.ok ? await res.json() : [];

  return <PaymentsManager payments={payments} />;
}
