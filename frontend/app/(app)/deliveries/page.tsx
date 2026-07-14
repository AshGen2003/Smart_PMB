"use client";

import CrudTable, { ColumnConfig, FieldConfig } from "@/components/CrudTable";

const fields: FieldConfig[] = [
  {
    name: "vehicle",
    label: "Vehicle",
    type: "select",
    required: true,
    optionsEndpoint: "vehicles",
    optionsValueField: "vehicle_id",
    optionsLabelField: "registration_no",
  },
  {
    name: "driver",
    label: "Driver",
    type: "select",
    required: true,
    optionsEndpoint: "drivers",
    optionsValueField: "driver_id",
    optionsLabelField: "name",
  },
  {
    name: "route",
    label: "Route",
    type: "select",
    required: true,
    optionsEndpoint: "routes",
    optionsValueField: "route_id",
    optionsLabel: (o) => `${o.origin} → ${o.destination}`,
  },
  { name: "purchase", label: "Purchase ID", type: "number", placeholder: "Optional" },
  { name: "warehouse", label: "Warehouse ID", type: "number", placeholder: "Optional" },
  { name: "approved_by", label: "Approved By (Officer ID)", type: "number", placeholder: "Optional" },
  { name: "scheduled_date", label: "Scheduled Date", type: "date" },
  {
    name: "delivery_status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "scheduled", label: "Scheduled" },
      { value: "in_transit", label: "In Transit" },
      { value: "delivered", label: "Delivered" },
      { value: "delayed", label: "Delayed" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
];

const columns: ColumnConfig[] = [
  {
    key: "delivery_id",
    label: "ID",
    render: (r) => `#${r.delivery_id}`,
  },
  { key: "vehicle_registration", label: "Vehicle" },
  { key: "driver_name", label: "Driver" },
  { key: "route_label", label: "Route" },
  { key: "scheduled_date", label: "Scheduled" },
  { key: "delivery_status", label: "Status", badge: true },
];

export default function DeliveriesPage() {
  return (
    <CrudTable
      title="Deliveries"
      subtitle="Schedule and track paddy deliveries"
      endpoint="deliveries"
      columns={columns}
      fields={fields}
      rowIdKey="delivery_id"
    />
  );
}
