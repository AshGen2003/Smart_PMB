"use client";

import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/api";
import { Dashboard } from "@/lib/types";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-32 shrink-0 text-sm capitalize text-pmb-700">
        {label.replace(/_/g, " ")}
      </div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-pmb-50">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right text-sm font-semibold text-pmb-900">{count}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="text-pmb-600">Loading dashboard…</div>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return null;

  const { counts, deliveries_by_status, vehicle_status, cost_summary, recent_deliveries } = data;
  const maxDeliv = Math.max(1, ...deliveries_by_status.map((d) => d.count));
  const maxVeh = Math.max(1, ...vehicle_status.map((v) => v.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-pmb-900">Dashboard</h1>
        <p className="text-sm text-pmb-600">
          Real-time overview of the paddy logistics operation.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Vehicles"
          value={counts.vehicles}
          hint={`${counts.active_vehicles} active`}
          icon={<TruckIcon />}
        />
        <StatCard
          label="Drivers"
          value={counts.drivers}
          hint={`${counts.available_drivers} available`}
          icon={<DriverIcon />}
        />
        <StatCard
          label="Deliveries"
          value={counts.deliveries}
          hint={`${counts.in_transit} in transit · ${counts.scheduled} scheduled`}
          accent="gold"
          icon={<DeliveryIcon />}
        />
        <StatCard
          label="Routes"
          value={counts.routes}
          hint={`${counts.gps_points} GPS points logged`}
          icon={<RouteIcon />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Deliveries by status */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-pmb-900">Deliveries by Status</h3>
          {deliveries_by_status.length === 0 ? (
            <p className="text-sm text-pmb-500">No deliveries yet.</p>
          ) : (
            deliveries_by_status.map((d) => (
              <BarRow
                key={d.delivery_status}
                label={d.delivery_status}
                count={d.count}
                max={maxDeliv}
                color="bg-pmb-600"
              />
            ))
          )}
        </div>

        {/* Fleet status + cost */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-pmb-900">Fleet Status</h3>
            {vehicle_status.length === 0 ? (
              <p className="text-sm text-pmb-500">No vehicles yet.</p>
            ) : (
              vehicle_status.map((v) => (
                <BarRow
                  key={v.status}
                  label={v.status}
                  count={v.count}
                  max={maxVeh}
                  color="bg-gold-500"
                />
              ))
            )}
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-pmb-900">Operating Cost</h3>
            <div className="flex items-baseline justify-between py-1">
              <span className="text-sm text-pmb-600">Fuel</span>
              <span className="text-lg font-bold text-pmb-900">
                LKR {cost_summary.fuel_cost_total.toLocaleString()}
              </span>
            </div>
            <div className="flex items-baseline justify-between py-1">
              <span className="text-sm text-pmb-600">Maintenance</span>
              <span className="text-lg font-bold text-pmb-900">
                LKR {cost_summary.maintenance_cost_total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent deliveries */}
      <div className="card overflow-x-auto">
        <div className="border-b border-pmb-100 px-5 py-4">
          <h3 className="font-semibold text-pmb-900">Recent Deliveries</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-pmb-50 text-pmb-700">
            <tr>
              <th className="px-5 py-3 font-semibold">ID</th>
              <th className="px-5 py-3 font-semibold">Vehicle</th>
              <th className="px-5 py-3 font-semibold">Driver</th>
              <th className="px-5 py-3 font-semibold">Route</th>
              <th className="px-5 py-3 font-semibold">Scheduled</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pmb-50">
            {recent_deliveries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-pmb-500">
                  No deliveries yet.
                </td>
              </tr>
            ) : (
              recent_deliveries.map((d) => (
                <tr key={d.delivery_id} className="hover:bg-pmb-50/60">
                  <td className="px-5 py-3 font-medium text-pmb-900">#{d.delivery_id}</td>
                  <td className="px-5 py-3 text-pmb-800">{d.vehicle_registration || "—"}</td>
                  <td className="px-5 py-3 text-pmb-800">{d.driver_name || "—"}</td>
                  <td className="px-5 py-3 text-pmb-800">{d.route_label || "—"}</td>
                  <td className="px-5 py-3 text-pmb-800">{d.scheduled_date || "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.delivery_status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
      <circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" />
    </svg>
  );
}
function DriverIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  );
}
function DeliveryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M3 8l9-4 9 4-9 4-9-4zM3 8v8l9 4 9-4V8" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" />
      <path d="M8 6h6a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h6" />
    </svg>
  );
}
