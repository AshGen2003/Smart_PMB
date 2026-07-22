"use client";
import { useState, useEffect } from "react";
import Sidebar from "../Sidebar";
import Link from "next/link";

type Warehouse = {
  warehouse_id: number;
  name: string;
  capacity: string;
  current_stock: string;
};

type Purchase = {
  purchase_id: number;
  purchase_number: string;
  farmer_name: string;
  paddy_type: string;
  quantity: string;
  status: string;
  purchase_date: string;
};

type PaddyType = {
  paddy_type_id: number;
  is_active: boolean;
};

export default function PMBDashboard() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paddyTypes, setPaddyTypes] = useState<PaddyType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/warehouses").then(r => r.json()),
      fetch("/api/purchases").then(r => r.json()),
      fetch("/api/paddy-types").then(r => r.json()),
    ]).then(([w, p, pt]) => {
      setWarehouses(w);
      setPurchases(p);
      setPaddyTypes(pt);
      setLoading(false);
    });
  }, []);

  const totalStock = warehouses.reduce((a, w) => a + parseFloat(w.current_stock || "0"), 0);
  const pendingCount = purchases.filter(p => p.status === "pending").length;
  const activePaddyTypes = paddyTypes.filter(p => p.is_active).length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "32px" }}>

        {/* Top Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>Good morning, Officer</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
              {pendingCount > 0 ? ` · ${pendingCount} approvals pending` : " · All caught up!"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ backgroundColor: "#2D6A2D", color: "white", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", backgroundColor: "#8DBF8D", borderRadius: "50%", display: "inline-block" }}></span>
              On duty
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#D4A017", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "14px" }}>SW</div>
          </div>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#999", fontSize: "14px" }}>Loading data from database...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
              {[
                { label: "Total Warehouses", value: warehouses.length, color: "#D4A017", textColor: "white" },
                { label: "Total Stock (kg)", value: totalStock.toLocaleString(), color: "#2D6A2D", textColor: "white" },
                { label: "Pending Approvals", value: pendingCount, color: "#8DBF8D", textColor: "#1a3a1a" },
                { label: "Active Paddy Types", value: activePaddyTypes, color: "#1a3a1a", textColor: "white" },
              ].map((card) => (
                <div key={card.label} style={{ backgroundColor: card.color, borderRadius: "12px", padding: "24px 20px", color: card.textColor }}>
                  <div style={{ fontSize: "32px", fontWeight: "bold" }}>{card.value}</div>
                  <div style={{ fontSize: "13px", marginTop: "6px", opacity: 0.9 }}>{card.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "20px" }}>

              {/* Recent Purchases */}
              <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "4px", height: "18px", backgroundColor: "#D4A017", borderRadius: "2px" }}></div>
                    <span style={{ fontWeight: "600", fontSize: "14px", color: "#1a1a1a", textTransform: "uppercase", letterSpacing: "0.05em" }}>RECENT PURCHASE APPROVALS</span>
                  </div>
                  <Link href="/pmb-officer/approvals" style={{ color: "#2D6A2D", fontSize: "13px", textDecoration: "none" }}>View all →</Link>
                </div>

                {purchases.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px", color: "#999", fontSize: "13px" }}>No purchases yet</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #eee" }}>
                        {["PURCHASE ID", "FARMER", "PADDY TYPE", "QTY", "STATUS"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 6px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.slice(0, 5).map((row) => (
                        <tr key={row.purchase_id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                          <td style={{ padding: "12px 6px", fontSize: "13px", fontWeight: "600" }}>{row.purchase_number}</td>
                          <td style={{ padding: "12px 6px", fontSize: "13px" }}>{row.farmer_name}</td>
                          <td style={{ padding: "12px 6px", fontSize: "13px" }}>{row.paddy_type}</td>
                          <td style={{ padding: "12px 6px", fontSize: "13px" }}>{parseFloat(row.quantity).toLocaleString()} kg</td>
                          <td style={{ padding: "12px 6px" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                              backgroundColor: row.status === "completed" ? "#e8f5e9" : row.status === "pending" ? "#fff8e1" : "#ffebee",
                              color: row.status === "completed" ? "#2D6A2D" : row.status === "pending" ? "#D4A017" : "#c62828"
                            }}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Warehouse Stock */}
              <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ width: "4px", height: "18px", backgroundColor: "#D4A017", borderRadius: "2px" }}></div>
                  <span style={{ fontWeight: "600", fontSize: "14px", color: "#1a1a1a", textTransform: "uppercase", letterSpacing: "0.05em" }}>WAREHOUSE STOCK</span>
                </div>

                {warehouses.map((w) => {
                  const pct = Math.round((parseFloat(w.current_stock) / parseFloat(w.capacity)) * 100);
                  return (
                    <div key={w.warehouse_id} style={{ marginBottom: "18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", color: "#1a1a1a" }}>{w.name}</span>
                        <span style={{ fontSize: "13px", color: "#666" }}>{pct}%</span>
                      </div>
                      <div style={{ backgroundColor: "#f0f0f0", borderRadius: "4px", height: "8px" }}>
                        <div style={{ height: "8px", borderRadius: "4px", width: `${pct}%`, backgroundColor: pct > 80 ? "#D4A017" : "#2D6A2D" }}></div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>
                        {parseFloat(w.current_stock).toLocaleString()} / {parseFloat(w.capacity).toLocaleString()} kg
                      </div>
                    </div>
                  );
                })}

                <Link href="/pmb-officer/warehouses" style={{ display: "block", textAlign: "center", padding: "10px", border: "1px solid #e0e0e0", borderRadius: "8px", color: "#2D6A2D", fontSize: "13px", textDecoration: "none", marginTop: "8px" }}>
                  Manage warehouses →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}