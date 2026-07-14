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
  { name: "service_date", label: "Service Date", type: "date" },
  { name: "description", label: "Description", type: "textarea", placeholder: "e.g. Engine tune-up" },
  { name: "cost", label: "Cost (LKR)", type: "float", required: true },
  { name: "next_service_date", label: "Next Service Date", type: "date" },
];

const columns: ColumnConfig[] = [
  { key: "vehicle_registration", label: "Vehicle" },
  { key: "service_date", label: "Service Date" },
  { key: "description", label: "Description" },
  { key: "cost", label: "Cost (LKR)" },
  { key: "next_service_date", label: "Next Service" },
];

export default function MaintenancePage() {
  return (
    <CrudTable
      title="Maintenance Records"
      subtitle="Vehicle servicing and repairs"
      endpoint="maintenance-records"
      columns={columns}
      fields={fields}
      rowIdKey="maintenance_id"
    />
  );
}
