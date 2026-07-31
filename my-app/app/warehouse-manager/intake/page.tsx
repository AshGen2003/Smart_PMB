/**
 * `/warehouse-manager/intake` — record a paddy intake (already physically
 * received) against one of the manager's own warehouses in a single step.
 */
import { apiFetch } from "@/app/lib/api";
import IntakeForm from "./IntakeForm";
import styles from "../WarehouseManagerDashboard.module.css";

type WarehouseOption = { id: number; name: string; code: string; capacity: string; current_stock: string };
type FarmerOption = { id: number; name: string; registration_no: string };
type PaddyTypeOption = { id: number; type_name: string };

export default async function WarehouseManagerIntakePage() {
  const [warehousesRes, farmersRes, paddyTypesRes] = await Promise.all([
    apiFetch("/api/warehouse-manager/warehouses/"),
    apiFetch("/api/warehouse-manager/farmers/"),
    apiFetch("/api/admin/paddy-types/"),
  ]);

  const warehouses: WarehouseOption[] = warehousesRes.ok ? await warehousesRes.json() : [];
  const farmers: FarmerOption[] = farmersRes.ok ? await farmersRes.json() : [];
  const paddyTypes: PaddyTypeOption[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Record intake</h1>
        <span className={styles.subtitle}>
          Log paddy you&apos;ve already received into one of your warehouses.
        </span>
      </div>

      <IntakeForm warehouses={warehouses} farmers={farmers} paddyTypes={paddyTypes} />
    </div>
  );
}
