"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const designations = [
  "chief_officer", "senior_officer", "junior_officer",
  "field_officer", "administrative_officer", "finance_officer", "operations_officer"
];

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: "8px",
  border: "1px solid #e0e0e0", fontSize: "14px", color: "#1a1a1a",
  backgroundColor: "white", boxSizing: "border-box" as const, outline: "none",
};

const selectStyle = {
  width: "100%", padding: "11px 14px", borderRadius: "8px",
  border: "1px solid #e0e0e0", fontSize: "14px", color: "#1a1a1a",
  backgroundColor: "white", boxSizing: "border-box" as const,
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm_password: "",
    employee_no: "", nic: "", designation: "junior_officer",
    contact_number: "", location: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSignup = async () => {
    setError("");

    if (!form.name || !form.email || !form.password || !form.employee_no || !form.nic) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("pmb_officer", JSON.stringify(data));
      router.push("/pmb-officer/dashboard");
    } else {
      setError(data.error || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#f5f3ee",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif", padding: "20px"
    }}>
      <div style={{ display: "flex", width: "960px", minHeight: "600px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

        {/* Left Panel */}
        <div style={{
          width: "38%", backgroundColor: "#1a3a1a",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "48px"
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            backgroundColor: "#D4A017", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "32px", marginBottom: "24px"
          }}>🌾</div>

          <h1 style={{ color: "white", fontSize: "24px", fontWeight: "bold", margin: "0 0 8px 0", textAlign: "center" }}>
            SMART PMB
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textAlign: "center", margin: "0 0 40px 0" }}>
            Digital Paddy Ecosystem for Sri Lanka
          </p>

          {[
            "Manage warehouses nationwide",
            "Approve paddy purchases",
            "Set guaranteed pricing",
            "Generate analytical reports",
          ].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", width: "100%" }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                backgroundColor: "#D4A017", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "11px", flexShrink: 0
              }}>✓</div>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>{item}</span>
            </div>
          ))}

          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 8px 0" }}>Already have an account?</p>
            <Link href="/pmb-officer/login" style={{
              color: "#D4A017", fontSize: "13px", fontWeight: "600", textDecoration: "none"
            }}>Sign In →</Link>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{
          width: "62%", backgroundColor: "white",
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "48px", overflowY: "auto"
        }}>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 6px 0" }}>
            Create Officer Account
          </h2>
          <p style={{ color: "#999", fontSize: "13px", margin: "0 0 28px 0" }}>
            Register as a PMB Officer to access the system
          </p>

          {error && (
            <div style={{
              backgroundColor: "#ffebee", border: "1px solid #ffcdd2",
              borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
              fontSize: "13px", color: "#c62828"
            }}>⚠️ {error}</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { label: "Full Name *", key: "name", type: "text", placeholder: "e.g. Sandalu Perera" },
              { label: "Email Address *", key: "email", type: "email", placeholder: "officer@pmb.gov.lk" },
              { label: "Employee No *", key: "employee_no", type: "text", placeholder: "PMB-EMP-003" },
              { label: "NIC *", key: "nic", type: "text", placeholder: "200012345678" },
              { label: "Contact Number", key: "contact_number", type: "text", placeholder: "077XXXXXXX" },
              { label: "Location", key: "location", type: "text", placeholder: "PMB Office, Colombo" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "5px" }}>{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "5px" }}>Designation</label>
            <select value={form.designation} onChange={e => handleChange("designation", e.target.value)} style={selectStyle}>
              {designations.map(d => (
                <option key={d} value={d}>{d.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "5px" }}>Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => handleChange("password", e.target.value)}
                  style={{ ...inputStyle, paddingRight: "40px" }}
                />
                <button onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "none", cursor: "pointer", fontSize: "14px", color: "#999"
                }}>{showPassword ? "🙈" : "👁️"}</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "5px" }}>Confirm Password *</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={form.confirm_password}
                onChange={e => handleChange("confirm_password", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <button onClick={handleSignup} disabled={loading} style={{
            width: "100%", padding: "13px", backgroundColor: loading ? "#8DBF8D" : "#2D6A2D",
            color: "white", border: "none", borderRadius: "8px",
            fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer",
            marginTop: "24px"
          }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p style={{ fontSize: "12px", color: "#bbb", textAlign: "center", marginTop: "20px" }}>
            PMB Officer Portal · Smart PMB System · Group D
          </p>
        </div>
      </div>
    </div>
  );
}