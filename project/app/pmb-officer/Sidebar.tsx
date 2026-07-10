"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const sidebarItems = [
  { icon: "⊞", label: "Dashboard", href: "/pmb-officer/dashboard" },
  { icon: "✓", label: "Approvals", href: "/pmb-officer/approvals" },
  { icon: "🏭", label: "Warehouses", href: "/pmb-officer/warehouses" },
  { icon: "₨", label: "Pricing", href: "/pmb-officer/pricing" },
  { icon: "👥", label: "Staff", href: "/pmb-officer/staff" },
  { icon: "📊", label: "Reports", href: "/pmb-officer/reports" },
  { icon: "👤", label: "Profile", href: "/pmb-officer/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("pmb_officer");
    router.push("/pmb-officer/login");
  };

  return (
    <>
      <div style={{
        width: "80px", backgroundColor: "#1a3a1a", display: "flex",
        flexDirection: "column", alignItems: "center", paddingTop: "20px",
        gap: "8px", minHeight: "100vh", position: "sticky", top: 0
      }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          backgroundColor: "#D4A017", display: "flex", alignItems: "center",
          justifyContent: "center", marginBottom: "16px", fontSize: "20px"
        }}>🌾</div>

        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{
                width: "64px", padding: "10px 0", display: "flex",
                flexDirection: "column", alignItems: "center", gap: "4px",
                borderRadius: "8px", cursor: "pointer",
                backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                borderLeft: isActive ? "3px solid #D4A017" : "3px solid transparent",
              }}>
                <span style={{ fontSize: "18px" }}>{item.icon}</span>
                <span style={{
                  color: isActive ? "white" : "rgba(255,255,255,0.6)",
                  fontSize: "10px", fontWeight: isActive ? "600" : "400"
                }}>{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Logout Button at bottom */}
        <div style={{ flex: 1 }} />
        <div onClick={() => setShowLogout(true)} style={{
          width: "64px", padding: "10px 0", display: "flex",
          flexDirection: "column", alignItems: "center", gap: "4px",
          borderRadius: "8px", cursor: "pointer", marginBottom: "16px",
        }}>
          <span style={{ fontSize: "18px" }}>🚪</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px" }}>Logout</span>
        </div>
      </div>

      {/* Logout Confirm */}
      {showLogout && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "380px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚪</div>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Logout</h2>
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>Are you sure you want to logout?</p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleLogout} style={{ flex: 1, padding: "12px", backgroundColor: "#c62828", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                Yes, Logout
              </button>
              <button onClick={() => setShowLogout(false)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}