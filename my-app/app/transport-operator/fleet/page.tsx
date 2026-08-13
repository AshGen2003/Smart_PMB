/**
 * `/transport-operator/fleet` — vehicle fleet, routes, and deliveries.
 * Reuses TransportationManager, the same component the PMB Officer's
 * /transportation page renders (see app/components/TransportationManager.tsx)
 * — the underlying endpoints are gated by the `manage_transport` permission,
 * which every transport_operator holds, so no separate backend views were
 * needed for this portal. Access to this whole route tree is enforced by
 * app/transport-operator/layout.tsx.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_TRANSPORTATION } from "@/app/lib/previewSampleData";
import TransportationManager, {
  type VehicleRow,
  type DriverOption,
  type RouteRow,
  type DeliveryRow,
  type FuelRecordRow,
  type MaintenanceRecordRow,
} from "@/app/components/TransportationManager";

type Stats = {
  vehicles_total: number;
  vehicles_active: number;
  drivers_total: number;
  drivers_available: number;
  deliveries_scheduled: number;
  deliveries_in_transit: number;
  fuel_cost_total: number;
  maintenance_cost_total: number;
};

type WarehouseOption = { id: number; name: string };

export default async function TransportOperatorFleetPage() {
  const user = await getCurrentUser();
  const canWrite = !user?.previewing;

  if (user?.previewing) {
    return (
      <TransportationManager
        vehicles={PREVIEW_TRANSPORTATION.vehicles}
        drivers={PREVIEW_TRANSPORTATION.drivers}
        routes={PREVIEW_TRANSPORTATION.routes}
        deliveries={PREVIEW_TRANSPORTATION.deliveries}
        fuelRecords={PREVIEW_TRANSPORTATION.fuelRecords}
        maintenanceRecords={PREVIEW_TRANSPORTATION.maintenanceRecords}
        warehouses={PREVIEW_TRANSPORTATION.warehouses}
        stats={PREVIEW_TRANSPORTATION.stats}
        canWrite={false}
      />
    );
  }

  const [
    vehiclesRes,
    driversRes,
    routesRes,
    deliveriesRes,
    fuelRes,
    maintenanceRes,
    warehousesRes,
    statsRes,
  ] = await Promise.all([
    apiFetch("/api/admin/vehicles/"),
    apiFetch("/api/admin/drivers/"),
    apiFetch("/api/admin/routes/"),
    apiFetch("/api/admin/deliveries/"),
    apiFetch("/api/admin/fuel-records/"),
    apiFetch("/api/admin/maintenance-records/"),
    apiFetch("/api/admin/warehouses/"),
    apiFetch("/api/admin/transportation/dashboard/"),
  ]);

  const vehicles = vehiclesRes.ok ? ((await vehiclesRes.json()) as VehicleRow[]) : [];
  const drivers = driversRes.ok ? ((await driversRes.json()) as DriverOption[]) : [];
  const routes = routesRes.ok ? ((await routesRes.json()) as RouteRow[]) : [];
  const deliveries = deliveriesRes.ok ? ((await deliveriesRes.json()) as DeliveryRow[]) : [];
  const fuelRecords = fuelRes.ok ? ((await fuelRes.json()) as FuelRecordRow[]) : [];
  const maintenanceRecords = maintenanceRes.ok ? ((await maintenanceRes.json()) as MaintenanceRecordRow[]) : [];
  const warehouses = warehousesRes.ok ? ((await warehousesRes.json()) as WarehouseOption[]) : [];
  const stats: Stats = statsRes.ok
    ? await statsRes.json()
    : {
        vehicles_total: 0, vehicles_active: 0, drivers_total: 0, drivers_available: 0,
        deliveries_scheduled: 0, deliveries_in_transit: 0, fuel_cost_total: 0, maintenance_cost_total: 0,
      };

  return (
    <TransportationManager
      vehicles={vehicles}
      drivers={drivers}
      routes={routes}
      deliveries={deliveries}
      fuelRecords={fuelRecords}
      maintenanceRecords={maintenanceRecords}
      warehouses={warehouses}
      stats={stats}
      canWrite={canWrite}
    />
  );
}
