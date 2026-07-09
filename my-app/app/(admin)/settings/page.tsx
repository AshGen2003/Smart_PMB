"use client";

import React from "react";

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>Settings</h1>
      <div style={{ backgroundColor: "var(--card-bg)", padding: "2rem", borderRadius: "12px", border: "1px solid var(--card-border)" }}>
        <p style={{ color: "var(--text-muted)" }}>System settings and configuration will go here.</p>
      </div>
    </div>
  );
}
