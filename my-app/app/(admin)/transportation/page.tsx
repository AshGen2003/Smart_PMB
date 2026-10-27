/**
 * `/transportation` — vehicle fleet, routes, and deliveries. Requires the
 * `manage_transport` permission (PMB Officer). Preview never fetches real
 * data — see previewSampleData.ts. Drivers aren't fetched as a managed
 * resource here — `/api/admin/drivers/` returns the lightweight
 * {id, name} list of User accounts with the "driver" role, just to
 * populate the Delivery form's picker.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch, apiFetchCached } from "@/app/lib/api";
import { PREVIEW_TRANSPORTATION } from "@/app/lib/previewSampleData";
import TransportationManager, {
  type VehicleRow,
  type DriverOption,
  type RouteRow,
  type DeliveryRow,
  type FuelRecordRow,
  type MaintenanceRecordRow,
} from "@/app/components/TransportationManager";
import { type LinkableRequestOption } from "@/app/components/TransportationFormModals";

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

type OfficerDispatchManifest = {
  id: number; purchaser_name: string | null; destination_warehouse_name: string | null;
  status: string; has_delivery: boolean;
};
type OfficerMillingReturnRequest = {
  id: number; mill_name: string | null; destination_warehouse_name: string | null;
  rice_kg: string; status: string; has_delivery: boolean;
};
type OfficerRiceRequest = {
  id: number; purchaser_name: string | null; paddy_type_name: string | null;
  quantity_kg: string; status: string; has_delivery: boolean;
};
type OfficerMillingAllocation = {
  id: number; mill_name: string | null; paddy_type_name: string | null;
  quantity_kg: string; status: string; has_delivery: boolean;
};

/** Server Component: gates access, fetches every transportation resource in parallel, and renders the client-side manager. */
export default async function TransportationPage() {
  const user = await requirePermission("manage_transport");
  const canWrite = !user.previewing;

  if (user.previewing) {
    return (
      <TransportationManager
        vehicles={PREVIEW_TRANSPORTATION.vehicles}
        drivers={PREVIEW_TRANSPORTATION.drivers}
        routes={PREVIEW_TRANSPORTATION.routes}
        deliveries={PREVIEW_TRANSPORTATION.deliveries}
        fuelRecords={PREVIEW_TRANSPORTATION.fuelRecords}
        maintenanceRecords={PREVIEW_TRANSPORTATION.maintenanceRecords}
        warehouses={PREVIEW_TRANSPORTATION.warehouses}
        dispatchManifests={PREVIEW_TRANSPORTATION.dispatchManifests}
        millingReturnRequests={PREVIEW_TRANSPORTATION.millingReturnRequests}
        riceRequests={PREVIEW_TRANSPORTATION.riceRequests}
        millingAllocations={PREVIEW_TRANSPORTATION.millingAllocations}
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
    dispatchManifestsRes,
    millingReturnsRes,
    riceRequestsRes,
    millingAllocationsRes,
  ] = await Promise.all([
    apiFetch("/api/admin/vehicles/"),
    apiFetch("/api/admin/drivers/"),
    apiFetch("/api/admin/routes/"),
    apiFetch("/api/admin/deliveries/"),
    apiFetch("/api/admin/fuel-records/"),
    apiFetch("/api/admin/maintenance-records/"),
    // Just reference data for the delivery form's warehouse picker here,
    // shared with /warehouses and /approvals — see apiFetchCached's
    // docstring. Everything else on this page is live fleet/delivery state
    // that must stay fresh.
    apiFetchCached("/api/admin/warehouses/", 300, ["warehouses"]),
    apiFetch("/api/admin/transportation/dashboard/"),
    // The four request types a Delivery can be linked to — fetched here
    // (not cached) purely to populate the delivery form's "Linked request"
    // picker with what's currently available; filtered below to the status
    // a Delivery may actually link to, with no delivery already assigned.
    apiFetch("/api/admin/dispatch-manifests/"),
    apiFetch("/api/admin/milling-returns/"),
    apiFetch("/api/admin/rice-requests/"),
    apiFetch("/api/admin/milling-allocations/"),
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

  const allDispatchManifests = dispatchManifestsRes.ok ? ((await dispatchManifestsRes.json()) as OfficerDispatchManifest[]) : [];
  const dispatchManifests: LinkableRequestOption[] = allDispatchManifests
    .filter((m) => m.status === "approved" && !m.has_delivery)
    .map((m) => ({ id: m.id, label: `#${m.id} — ${m.purchaser_name ?? "—"} → ${m.destination_warehouse_name ?? "—"}` }));

  const allMillingReturns = millingReturnsRes.ok ? ((await millingReturnsRes.json()) as OfficerMillingReturnRequest[]) : [];
  const millingReturnRequests: LinkableRequestOption[] = allMillingReturns
    .filter((r) => r.status === "approved" && !r.has_delivery)
    .map((r) => ({ id: r.id, label: `#${r.id} — ${r.mill_name ?? "—"} (${Number(r.rice_kg).toLocaleString()}kg) → ${r.destination_warehouse_name ?? "—"}` }));

  const allRiceRequests = riceRequestsRes.ok ? ((await riceRequestsRes.json()) as OfficerRiceRequest[]) : [];
  const riceRequests: LinkableRequestOption[] = allRiceRequests
    .filter((r) => r.status === "fulfilled" && !r.has_delivery)
    .map((r) => ({ id: r.id, label: `#${r.id} — ${r.purchaser_name ?? "—"} (${Number(r.quantity_kg).toLocaleString()}kg ${r.paddy_type_name ?? "—"})` }));

  const allMillingAllocations = millingAllocationsRes.ok ? ((await millingAllocationsRes.json()) as OfficerMillingAllocation[]) : [];
  const millingAllocations: LinkableRequestOption[] = allMillingAllocations
    .filter((a) => a.status === "fulfilled" && !a.has_delivery)
    .map((a) => ({ id: a.id, label: `#${a.id} — ${a.mill_name ?? "—"} (${Number(a.quantity_kg).toLocaleString()}kg ${a.paddy_type_name ?? "—"})` }));

  return (
    <TransportationManager
      vehicles={vehicles}
      drivers={drivers}
      routes={routes}
      deliveries={deliveries}
      fuelRecords={fuelRecords}
      maintenanceRecords={maintenanceRecords}
      warehouses={warehouses}
      dispatchManifests={dispatchManifests}
      millingReturnRequests={millingReturnRequests}
      riceRequests={riceRequests}
      millingAllocations={millingAllocations}
      stats={stats}
      canWrite={canWrite}
    />
  );
}
