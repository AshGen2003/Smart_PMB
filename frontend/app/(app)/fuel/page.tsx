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
    name: "fuel_type",
    label: "Fuel Type",
    type: "select",
    required: true,
    options: [
      { value: "petrol", label: "Petrol" },
      { value: "diesel", label: "Diesel" },
      { value: "cng", label: "CNG" },
    ],
  },
  { name: "quantity", label: "Quantity (L)", type: "float", required: true },
  { name: "cost", label: "Cost (LKR)", type: "float", required: true },
  { name: "fuel_date", label: "Fuel Date", type: "date" },
];

const columns: ColumnConfig[] = [
  { key: "vehicle_registration", label: "Vehicle" },
  { key: "fuel_type", label: "Fuel Type" },
  { key: "quantity", label: "Quantity (L)" },
  { key: "cost", label: "Cost (LKR)" },
  { key: "fuel_date", label: "Date" },
];

export default function FuelPage() {
  return (
    <CrudTable
      title="Fuel Records"
      subtitle="Fuel consumption and expenses"
      endpoint="fuel-records"
      columns={columns}
      fields={fields}
      rowIdKey="fuel_id"
    />
  );
}
