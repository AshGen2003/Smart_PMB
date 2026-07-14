"use client";

import CrudTable, { ColumnConfig, FieldConfig } from "@/components/CrudTable";

const fields: FieldConfig[] = [
  { name: "origin", label: "Origin", required: true },
  { name: "destination", label: "Destination", required: true },
  { name: "distance", label: "Distance (km)", type: "float", required: true },
  { name: "estimated_time", label: "Estimated Time", placeholder: "e.g. 3h 20m" },
];

const columns: ColumnConfig[] = [
  { key: "origin", label: "Origin" },
  { key: "destination", label: "Destination" },
  { key: "distance", label: "Distance (km)" },
  { key: "estimated_time", label: "Est. Time" },
];

export default function RoutesPage() {
  return (
    <CrudTable
      title="Routes"
      subtitle="Collection and distribution routes"
      endpoint="routes"
      columns={columns}
      fields={fields}
      rowIdKey="route_id"
    />
  );
}
