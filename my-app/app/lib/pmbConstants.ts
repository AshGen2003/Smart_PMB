// Real Sri Lanka PMB intake/milling constants, used only for optimistic
// client-side previews (quality pass/fail before an officer's authoritative
// save, and the milling conversion calculator). Mirrors the defaults in the
// backend's sysops/utils.py CONFIG_DEFS dict — keep the two in sync by hand,
// there is no shared source of truth across Python/TS. Wherever a figure is
// actually persisted, the backend value (via /api/admin/system-config/) is
// the source of truth, not this file.

export const PMB_QUALITY_THRESHOLDS = {
  maxMoisturePct: 14,
  maxImpurityPct: 9,
} as const;

export const MILLING_RECOVERY_RATES = {
  raw: { rice: 0.68, husk: 0.2, bran: 0.1 },
  parboiled: { rice: 0.65, husk: 0.2, bran: 0.1 },
} as const;

export type MillingPaddyKind = keyof typeof MILLING_RECOVERY_RATES;
