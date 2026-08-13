/**
 * `/driver/vehicle` — the driver's fuel and maintenance log. Fuel/
 * maintenance records used to be entered by the PMB Officer on the
 * Transportation page; that side is now read-only (see farmers/views.py's
 * FuelRecordViewSet docstring) and creation lives here instead, since the
 * driver is the one who actually buys the fuel / gets the vehicle serviced.
 * Requires `view_vehicle_log` — granted to "driver" by default (see
 * accounts/migrations/0017), toggleable from /roles or the Preview Portal.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_TRANSPORTATION } from "@/app/lib/previewSampleData";
import VehicleLogManager, {
  type VehicleOption,
  type FuelRecordRow,
  type MaintenanceRecordRow,
} from "./VehicleLogManager";
import type { CompletedDeliveryOption } from "./VehicleLogFormModals";

type DeliveryHistoryEntry = {
  id: number;
  route_label: string | null;
  scheduled_date: string;
  status: string;
};

export default async function DriverVehiclePage() {
  const user = await requirePermission("view_vehicle_log");

  if (user.previewing) {
    return (
      <VehicleLogManager
        vehicles={PREVIEW_TRANSPORTATION.vehicles.map((v) => ({ id: v.id, registration_no: v.registration_no }))}
        fuelRecords={PREVIEW_TRANSPORTATION.fuelRecords}
        maintenanceRecords={PREVIEW_TRANSPORTATION.maintenanceRecords}
        completedDeliveries={PREVIEW_TRANSPORTATION.completedDeliveries}
      />
    );
  }

  const [vehiclesRes, fuelRes, maintenanceRes, vehicleInfoRes] = await Promise.all([
    apiFetch("/api/admin/vehicles/"),
    apiFetch("/api/driver/fuel-records/"),
    apiFetch("/api/driver/maintenance-records/"),
    apiFetch("/api/driver/vehicle-info/"),
  ]);

  const vehicles = vehiclesRes.ok ? ((await vehiclesRes.json()) as VehicleOption[]) : [];
  const fuelRecords = fuelRes.ok ? ((await fuelRes.json()) as FuelRecordRow[]) : [];
  const maintenanceRecords = maintenanceRes.ok ? ((await maintenanceRes.json()) as MaintenanceRecordRow[]) : [];

  // Only completed deliveries can be linked to a fuel record (see
  // FuelRecordSerializer.validate_delivery) -- reuses DriverVehicleInfoView
  // rather than a new endpoint, since it already returns this driver's full
  // delivery history.
  let completedDeliveries: CompletedDeliveryOption[] = [];
  if (vehicleInfoRes.ok) {
    const vehicleInfo = (await vehicleInfoRes.json()) as { deliveries: DeliveryHistoryEntry[] };
    completedDeliveries = vehicleInfo.deliveries
      .filter((d) => d.status === "delivered")
      .map((d) => ({ id: d.id, label: `${d.route_label ?? "Delivery"} (${d.scheduled_date})` }));
  }

  return (
    <VehicleLogManager
      vehicles={vehicles}
      fuelRecords={fuelRecords}
      maintenanceRecords={maintenanceRecords}
      completedDeliveries={completedDeliveries}
    />
  );
}
