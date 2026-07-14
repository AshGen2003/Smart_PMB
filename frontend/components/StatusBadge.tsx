"use client";

type Tone = "green" | "amber" | "red" | "gray";

function toneFor(status: string): Tone {
  const s = status.toLowerCase();
  if (s.includes("active") || s.includes("available") || s.includes("delivered"))
    return "green";
  if (
    s.includes("in_transit") ||
    s.includes("scheduled") ||
    s.includes("on_duty")
  )
    return "amber";
  if (
    s.includes("delayed") ||
    s.includes("cancel") ||
    s.includes("maintenance") ||
    s.includes("retired") ||
    s.includes("inactive") ||
    s.includes("off_duty")
  )
    return "red";
  return "gray";
}

const TONES: Record<Tone, string> = {
  green: "bg-pmb-100 text-pmb-800",
  amber: "bg-gold-100 text-gold-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-600",
};

export default function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className={`badge ${TONES[toneFor(status)]}`}>{label}</span>;
}
