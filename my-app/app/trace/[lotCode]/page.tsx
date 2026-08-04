/**
 * `/trace/[lotCode]` — public (no login required) farm-to-warehouse
 * traceability page for a single collected paddy lot. Reachable by
 * scanning the QR code printed/shown for that harvest (see farmer's
 * HarvestsManager.tsx and the officer approvals view). Backed by
 * GET /api/public/trace/<lot_code>/, which only exposes the farmer's
 * district + registration number — never name/NIC/contact details.
 */
import TraceView, { type TraceData } from "../TraceView";

const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

export default async function TracePage({
  params,
}: {
  params: Promise<{ lotCode: string }>;
}) {
  const { lotCode } = await params;
  const res = await fetch(`${API_URL}/api/public/trace/${lotCode}/`, { cache: "no-store" });
  const data = res.ok ? ((await res.json()) as TraceData) : null;

  return <TraceView data={data} lotCode={lotCode} />;
}
