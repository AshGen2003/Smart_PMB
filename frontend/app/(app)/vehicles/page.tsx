"use client";

import CrudTable, { ColumnConfig, FieldConfig } from "@/components/CrudTable";

const fields: FieldConfig[] = [
  { name: "registration_no", label: "Registration No", required: true, placeholder: "WP-Q-1234" },
  {
    name: "vehicle_type",
    label: "Vehicle Type",
    type: "select",
    required: true,
    options: [
      { value: "lorry", label: "Lorry" },
      { value: "van", label: "Van" },
      { value: "tractor", label: "Tractor" },
      { value: "three_wheeler", label: "Three Wheeler" },
      { value: "pickup", label: "Pickup" },
      { value: "other", label: "Other" },
    ],
  },
  { name: "capacity", label: "Capacity (kg)", type: "number", required: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "maintenance", label: "Under Maintenance" },
      { value: "retired", label: "Retired" },
    ],
  },
];

const columns: ColumnConfig[] = [
  { key: "registration_no", label: "Registration" },
  { key: "vehicle_type", label: "Type" },
  { key: "capacity", label: "Capacity (kg)" },
  { key: "status", label: "Status", badge: true },
];

export default function VehiclesPage() {
  return (
    <CrudTable
      title="Vehicles"
      subtitle="Manage the paddy transport fleet"
      endpoint="vehicles"
      columns={columns}
      fields={fields}
      rowIdKey="vehicle_id"
    />
  );
}
