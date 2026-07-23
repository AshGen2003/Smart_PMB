/**
 * `/driver/vehicle` — the driver's fuel and maintenance log. Fuel/
 * maintenance records used to be entered by the PMB Officer on the
 * Transportation page; that side is now read-only (see farmers/views.py's
 * FuelRecordViewSet docstring) and creation lives here instead, since the
 * driver is the one who actually buys the fuel / gets the vehicle serviced.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_TRANSPORTATION } from "@/app/lib/previewSampleData";
import VehicleLogManager, {
  type VehicleOption,
  type FuelRecordRow,
  type MaintenanceRecordRow,
} from "./VehicleLogManager";

export default async function DriverVehiclePage() {
  const user = await getCurrentUser();

  if (user?.previewing) {
    return (
      <VehicleLogManager
        vehicles={PREVIEW_TRANSPORTATION.vehicles.map((v) => ({ id: v.id, registration_no: v.registration_no }))}
        fuelRecords={PREVIEW_TRANSPORTATION.fuelRecords}
        maintenanceRecords={PREVIEW_TRANSPORTATION.maintenanceRecords}
      />
    );
  }

  const [vehiclesRes, fuelRes, maintenanceRes] = await Promise.all([
    apiFetch("/api/admin/vehicles/"),
    apiFetch("/api/driver/fuel-records/"),
    apiFetch("/api/driver/maintenance-records/"),
  ]);

  const vehicles = vehiclesRes.ok ? ((await vehiclesRes.json()) as VehicleOption[]) : [];
  const fuelRecords = fuelRes.ok ? ((await fuelRes.json()) as FuelRecordRow[]) : [];
  const maintenanceRecords = maintenanceRes.ok ? ((await maintenanceRes.json()) as MaintenanceRecordRow[]) : [];

  return (
    <VehicleLogManager vehicles={vehicles} fuelRecords={fuelRecords} maintenanceRecords={maintenanceRecords} />
  );
}
