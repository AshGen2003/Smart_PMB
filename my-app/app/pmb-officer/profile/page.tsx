"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../Sidebar";

type Officer = {
  pmb_officer_id: number;
  name: string;
  email: string;
  employee_no: string;
  designation: string;
  status: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pmb_officer");
    if (!stored) {
      router.push("/pmb-officer/login");
      return;
    }
    setOfficer(JSON.parse(stored));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("pmb_officer");
    router.push("/pmb-officer/login");
  };

  if (!officer) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>My Profile</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>View your account details</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setShowLogoutConfirm(true)} style={{
              padding: "10px 20px", backgroundColor: "#c62828", color: "white",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600"
            }}>Logout</button>
            <div style={{ backgroundColor: "#2D6A2D", color: "white", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", backgroundColor: "#8DBF8D", borderRadius: "50%", display: "inline-block" }}></span>
              On duty
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div style={{ maxWidth: "600px" }}>

          {/* Avatar Card */}
          <div style={{ backgroundColor: "#1a3a1a", borderRadius: "16px", padding: "32px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              backgroundColor: "#D4A017", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "32px", fontWeight: "bold", color: "white", flexShrink: 0
            }}>
              {officer.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "bold", color: "white" }}>{officer.name}</div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                {officer.designation.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={{
                  padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                  backgroundColor: officer.status === "active" ? "#D4A017" : "#c62828",
                  color: "white"
                }}>{officer.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <div style={{ width: "4px", height: "18px", backgroundColor: "#D4A017", borderRadius: "2px" }}></div>
              <span style={{ fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>ACCOUNT DETAILS</span>
            </div>

            {[
              { label: "Full Name", value: officer.name, icon: "👤" },
              { label: "Email Address", value: officer.email, icon: "📧" },
              { label: "Employee No", value: officer.employee_no, icon: "🪪" },
              { label: "Designation", value: officer.designation.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon: "💼" },
              { label: "Account Status", value: officer.status.toUpperCase(), icon: "✅" },
              { label: "Officer ID", value: `#${officer.pmb_officer_id}`, icon: "🔑" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f5f5f5" }}>
                <span style={{ fontSize: "18px", marginRight: "12px" }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a", marginTop: "2px" }}>{item.value}</div>
                </div>
              </div>
            ))}

            <button onClick={() => setShowLogoutConfirm(true)} style={{
              width: "100%", padding: "13px", backgroundColor: "#c62828", color: "white",
              border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600",
              cursor: "pointer", marginTop: "24px"
            }}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "380px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚪</div>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Logout</h2>
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>Are you sure you want to logout from the PMB Officer portal?</p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleLogout} style={{ flex: 1, padding: "12px", backgroundColor: "#c62828", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                Yes, Logout
              </button>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}