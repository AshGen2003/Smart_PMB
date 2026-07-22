/**
 * `/payments` — placeholder page for the future Payments & Billing module.
 * No backend data is wired up yet; this just reserves the route and shows
 * a "coming soon" style card. Marked "use client" even though it currently
 * has no interactivity, ready for the eventual client-side logic.
 */
"use client";

import React from "react";

/** Renders a static placeholder card; no props, no data fetching. */
export default function PaymentsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>Payments & Billing</h1>
      <div style={{ backgroundColor: "var(--card-bg)", padding: "2rem", borderRadius: "12px", border: "1px solid var(--card-border)" }}>
        <p style={{ color: "var(--text-muted)" }}>Invoices, automated billing schedules, and analytics will go here.</p>
      </div>
    </div>
  );
}
