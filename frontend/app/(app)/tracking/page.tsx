"use client";

import CrudTable, { ColumnConfig, FieldConfig } from "@/components/CrudTable";

const fields: FieldConfig[] = [
  {
    name: "delivery",
    label: "Delivery",
    type: "select",
    required: true,
    optionsEndpoint: "deliveries",
    optionsValueField: "delivery_id",
    optionsLabel: (o) => `#${o.delivery_id} · ${o.vehicle_registration || ""}`,
  },
  { name: "latitude", label: "Latitude", type: "float", required: true },
  { name: "longitude", label: "Longitude", type: "float", required: true },
  { name: "timestamp", label: "Timestamp", placeholder: "2026-07-10T09:00:00" },
];

const columns: ColumnConfig[] = [
  {
    key: "delivery",
    label: "Delivery",
    render: (r) => `#${r.delivery}`,
  },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "timestamp", label: "Timestamp" },
];

export default function TrackingPage() {
  return (
    <CrudTable
      title="GPS Tracking"
      subtitle="Live location points for deliveries"
      endpoint="gps-tracking"
      columns={columns}
      fields={fields}
      rowIdKey="tracking_id"
    />
  );
}
