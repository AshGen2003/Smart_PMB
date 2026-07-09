export const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "pmb_officer", label: "PMB Officer" },
  { value: "farmer", label: "Farmer" },
  { value: "mill_owner", label: "Mill Owner" },
  { value: "driver", label: "Driver" },
  { value: "warehouse_manager", label: "Warehouse Manager" },
  { value: "authorized_purchaser", label: "Authorized Purchaser" },
] as const;

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
);
