"use client";

import CrudTable, { ColumnConfig, FieldConfig } from "@/components/CrudTable";

const fields: FieldConfig[] = [
  { name: "name", label: "Full Name", required: true },
  { name: "license_no", label: "License No", required: true, placeholder: "B1234567" },
  { name: "contact_no", label: "Contact No", placeholder: "07X XXX XXX" },
  { name: "address", label: "Address", type: "textarea" },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "available", label: "Available" },
      { value: "on_duty", label: "On Duty" },
      { value: "off_duty", label: "Off Duty" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

const columns: ColumnConfig[] = [
  { key: "name", label: "Name" },
  { key: "license_no", label: "License No" },
  { key: "contact_no", label: "Contact" },
  { key: "status", label: "Status", badge: true },
];

export default function DriversPage() {
  return (
    <CrudTable
      title="Drivers"
      subtitle="Registered drivers and their duty status"
      endpoint="drivers"
      columns={columns}
      fields={fields}
      rowIdKey="driver_id"
    />
  );
}
