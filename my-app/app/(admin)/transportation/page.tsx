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

async function transportationFetch(
  path: string,
  cached = false
): Promise<Response> {
  try {
    return cached
      ? await apiFetchCached(path, 300, ["warehouses"])
      : await apiFetch(path);
  } catch (error) {
    console.error(`Transportation data request failed: GET ${path}`, error);
    return new Response(
      JSON.stringify({ detail: "The transportation service is unavailable." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function readRequiredJson<T>(response: Response, resource: string): Promise<T> {
  if (!response.ok) {
    throw new Error(
      `Could not load ${resource}. The transportation service may be unavailable.`
    );
  }
  return (await response.json()) as T;
}

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
    transportationFetch("/api/admin/vehicles/"),
    transportationFetch("/api/admin/drivers/"),
    transportationFetch("/api/admin/routes/"),
    transportationFetch("/api/admin/deliveries/"),
    transportationFetch("/api/admin/fuel-records/"),
    transportationFetch("/api/admin/maintenance-records/"),
    // Just reference data for the delivery form's warehouse picker here,
    // shared with /warehouses and /approvals — see apiFetchCached's
    // docstring. Everything else on this page is live fleet/delivery state
    // that must stay fresh.
    transportationFetch("/api/admin/warehouses/", true),
    transportationFetch("/api/admin/transportation/dashboard/"),
    // The four request types a Delivery can be linked to — fetched here
    // (not cached) purely to populate the delivery form's "Linked request"
    // picker with what's currently available; filtered below to the status
    // a Delivery may actually link to, with no delivery already assigned.
    transportationFetch("/api/admin/dispatch-manifests/"),
    transportationFetch("/api/admin/milling-returns/"),
    transportationFetch("/api/admin/rice-requests/"),
    transportationFetch("/api/admin/milling-allocations/"),
  ]);

  const vehicles = await readRequiredJson<VehicleRow[]>(vehiclesRes, "vehicles");
  const drivers = await readRequiredJson<DriverOption[]>(driversRes, "drivers");
  const routes = await readRequiredJson<RouteRow[]>(routesRes, "routes");
  const deliveries = await readRequiredJson<DeliveryRow[]>(deliveriesRes, "deliveries");
  const fuelRecords = await readRequiredJson<FuelRecordRow[]>(fuelRes, "fuel records");
  const maintenanceRecords = await readRequiredJson<MaintenanceRecordRow[]>(maintenanceRes, "maintenance records");
  const warehouses = await readRequiredJson<WarehouseOption[]>(warehousesRes, "warehouses");
  const stats = await readRequiredJson<Stats>(statsRes, "dashboard statistics");

  const allDispatchManifests = await readRequiredJson<OfficerDispatchManifest[]>(dispatchManifestsRes, "dispatch manifests");
  const dispatchManifests: LinkableRequestOption[] = allDispatchManifests
    .filter((m) => m.status === "approved" && !m.has_delivery)
    .map((m) => ({ id: m.id, label: `#${m.id} — ${m.purchaser_name ?? "—"} → ${m.destination_warehouse_name ?? "—"}` }));

  const allMillingReturns = await readRequiredJson<OfficerMillingReturnRequest[]>(millingReturnsRes, "milling returns");
  const millingReturnRequests: LinkableRequestOption[] = allMillingReturns
    .filter((r) => r.status === "approved" && !r.has_delivery)
    .map((r) => ({ id: r.id, label: `#${r.id} — ${r.mill_name ?? "—"} (${Number(r.rice_kg).toLocaleString()}kg) → ${r.destination_warehouse_name ?? "—"}` }));

  const allRiceRequests = await readRequiredJson<OfficerRiceRequest[]>(riceRequestsRes, "rice requests");
  const riceRequests: LinkableRequestOption[] = allRiceRequests
    .filter((r) => r.status === "fulfilled" && !r.has_delivery)
    .map((r) => ({ id: r.id, label: `#${r.id} — ${r.purchaser_name ?? "—"} (${Number(r.quantity_kg).toLocaleString()}kg ${r.paddy_type_name ?? "—"})` }));

  const allMillingAllocations = await readRequiredJson<OfficerMillingAllocation[]>(millingAllocationsRes, "milling allocations");
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
