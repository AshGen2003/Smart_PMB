"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: "8px",
  border: "1px solid #e0e0e0", fontSize: "14px", color: "#1a1a1a",
  backgroundColor: "white", boxSizing: "border-box" as const, outline: "none",
};

export default function PMBLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/pmb/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("pmb_officer", JSON.stringify(data));
      router.push("/pmb-officer/dashboard");
    } else {
      setError(data.error || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#f5f3ee",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif"
    }}>
      <div style={{ display: "flex", width: "900px", height: "560px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

        {/* Left Panel */}
        <div style={{
          width: "45%", backgroundColor: "#1a3a1a",
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
            "Monitor warehouse stock levels",
            "Approve paddy purchase requests",
            "Manage guaranteed pricing",
            "Generate nationwide reports",
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
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 8px 0" }}>New officer?</p>
            <Link href="/pmb-officer/signup" style={{
              color: "#D4A017", fontSize: "13px", fontWeight: "600", textDecoration: "none"
            }}>Create Account →</Link>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{
          width: "55%", backgroundColor: "white",
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "48px"
        }}>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1a1a1a", margin: "0 0 6px 0" }}>
            Officer Login
          </h2>
          <p style={{ color: "#999", fontSize: "13px", margin: "0 0 32px 0" }}>
            Sign in to your PMB Officer account
          </p>

          {error && (
            <div style={{
              backgroundColor: "#ffebee", border: "1px solid #ffcdd2",
              borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
              fontSize: "13px", color: "#c62828"
            }}>⚠️ {error}</div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Email Address</label>
            <input
              type="email"
              placeholder="officer@pmb.gov.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={{ ...inputStyle, paddingRight: "44px" }}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{
                position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                border: "none", background: "none", cursor: "pointer", fontSize: "16px", color: "#999"
              }}>{showPassword ? "🙈" : "👁️"}</button>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading} style={{
            width: "100%", padding: "13px", backgroundColor: loading ? "#8DBF8D" : "#2D6A2D",
            color: "white", border: "none", borderRadius: "8px",
            fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <span style={{ fontSize: "13px", color: "#999" }}>No account? </span>
            <Link href="/pmb-officer/signup" style={{ fontSize: "13px", color: "#2D6A2D", fontWeight: "600", textDecoration: "none" }}>
              Register here
            </Link>
          </div>

          <p style={{ fontSize: "12px", color: "#bbb", textAlign: "center", marginTop: "16px" }}>
            PMB Officer Portal · Smart PMB System · Group D
          </p>
        </div>
      </div>
    </div>
  );
}