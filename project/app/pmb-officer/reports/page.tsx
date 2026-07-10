"use client";
import { useState } from "react";
import Sidebar from "../Sidebar";

const sidebarItems = [
  { icon: "⊞", label: "Dashboard", href: "/pmb-officer/dashboard" },
  { icon: "✓", label: "Approvals", href: "/pmb-officer/approvals" },
  { icon: "🏭", label: "Warehouses", href: "/pmb-officer/warehouses" },
  { icon: "₨", label: "Pricing", href: "/pmb-officer/pricing" },
  { icon: "📊", label: "Reports", href: "/pmb-officer/reports", active: true },
];

const stockReport = [
  { warehouse: "Galle Collection Warehouse", district: "Galle", samba: 3200, nadu: 2480, keeri: 2000, total: 7680, capacity: 12000 },
  { warehouse: "Dambulla Distribution Hub", district: "Matale", samba: 10000, nadu: 6250, keeri: 4000, total: 20250, capacity: 25000 },
  { warehouse: "Kandy Retail Cluster", district: "Kandy", samba: 1800, nadu: 1960, keeri: 0, total: 3760, capacity: 8000 },
  { warehouse: "Colombo Storage Centre", district: "Colombo", samba: 5200, nadu: 0, keeri: 4600, total: 9800, capacity: 15000 },
  { warehouse: "Anuradhapura North Hub", district: "Anuradhapura", samba: 0, nadu: 4200, keeri: 0, total: 4200, capacity: 20000 },
];

const transactionReport = [
  { id: "PO-3301", farmer: "K. Perera", district: "Galle", type: "Samba", qty: 1200, price: 65.00, total: 78000, warehouse: "Galle Warehouse", date: "25 Jun 2026", status: "Approved" },
  { id: "PO-3298", farmer: "S. Silva", district: "Matale", type: "Nadu", qty: 850, price: 58.00, total: 49300, warehouse: "Dambulla Hub", date: "25 Jun 2026", status: "Pending" },
  { id: "PO-3295", farmer: "R. Fernando", district: "Kandy", type: "Keeri Samba", qty: 600, price: 80.00, total: 48000, warehouse: "Kandy Cluster", date: "24 Jun 2026", status: "Approved" },
  { id: "PO-3290", farmer: "M. Jayasinghe", district: "Colombo", type: "Samba", qty: 2100, price: 65.00, total: 136500, warehouse: "Galle Warehouse", date: "24 Jun 2026", status: "Rejected" },
  { id: "PO-3285", farmer: "A. Bandara", district: "Kandy", type: "Nadu", qty: 980, price: 58.00, total: 56840, warehouse: "Colombo Store", date: "23 Jun 2026", status: "Approved" },
  { id: "PO-3280", farmer: "T. Rathnayake", district: "Matale", type: "Samba", qty: 1450, price: 65.00, total: 94250, warehouse: "Dambulla Hub", date: "23 Jun 2026", status: "Approved" },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<"stock" | "transactions">("stock");
  const [filterDistrict, setFilterDistrict] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [printed, setPrinted] = useState(false);

  const districts = ["All", "Galle", "Matale", "Kandy", "Colombo", "Anuradhapura"];
  const paddyTypes = ["All", "Samba", "Nadu", "Keeri Samba"];

  const filteredStock = stockReport.filter(r =>
    filterDistrict === "All" || r.district === filterDistrict
  );

  const filteredTransactions = transactionReport.filter(r =>
    (filterDistrict === "All" || r.district === filterDistrict) &&
    (filterType === "All" || r.type === filterType)
  );

  const totalQty = filteredTransactions.reduce((a, r) => a + r.qty, 0);
  const totalValue = filteredTransactions.reduce((a, r) => a + r.total, 0);
  const approved = filteredTransactions.filter(r => r.status === "Approved").length;

  const handleExport = () => {
    setPrinted(true);
    setTimeout(() => setPrinted(false), 2000);

    // Build CSV content
    let csv = "";
    if (activeReport === "stock") {
      csv = "Warehouse,District,Samba (kg),Nadu (kg),Keeri Samba (kg),Total (kg),Capacity (kg),Usage %\n";
      filteredStock.forEach(r => {
        const pct = Math.round((r.total / r.capacity) * 100);
        csv += `${r.warehouse},${r.district},${r.samba},${r.nadu},${r.keeri},${r.total},${r.capacity},${pct}%\n`;
      });
    } else {
      csv = "Purchase ID,Farmer,District,Paddy Type,Quantity (kg),Unit Price (Rs),Total (Rs),Warehouse,Date,Status\n";
      filteredTransactions.forEach(r => {
        csv += `${r.id},${r.farmer},${r.district},${r.type},${r.qty},${r.price},${r.total},${r.warehouse},${r.date},${r.status}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pmb-${activeReport}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>

      <Sidebar />

      {/* Main Content */}
      <div style={{ flex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>Reports</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>Generate and export nationwide PMB reports</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={handleExport} style={{
              padding: "8px 20px", backgroundColor: "#D4A017", color: "white",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px",
              fontWeight: "600", display: "flex", alignItems: "center", gap: "6px"
            }}>
              {printed ? "✓ Exported!" : "⬇ Export CSV"}
            </button>
            <div style={{ backgroundColor: "#2D6A2D", color: "white", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", backgroundColor: "#8DBF8D", borderRadius: "50%", display: "inline-block" }}></span>
              On duty
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#D4A017", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "14px" }}>SW</div>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", backgroundColor: "#e8e5df", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
          {(["stock", "transactions"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveReport(tab)} style={{
              padding: "8px 24px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: activeReport === tab ? "600" : "400",
              backgroundColor: activeReport === tab ? "white" : "transparent",
              color: activeReport === tab ? "#1a1a1a" : "#666",
              boxShadow: activeReport === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              textTransform: "capitalize"
            }}>
              {tab === "stock" ? "📦 Stock Report" : "📋 Transaction Report"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>District</label>
            <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} style={{
              padding: "8px 12px", borderRadius: "8px", border: "1px solid #e0e0e0",
              backgroundColor: "white", fontSize: "13px", color: "#1a1a1a", cursor: "pointer"
            }}>
              {districts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {activeReport === "transactions" && (
            <div>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Paddy Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
                padding: "8px 12px", borderRadius: "8px", border: "1px solid #e0e0e0",
                backgroundColor: "white", fontSize: "13px", color: "#1a1a1a", cursor: "pointer"
              }}>
                {paddyTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Summary Cards - Transactions only */}
        {activeReport === "transactions" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
            {[
              { label: "Total Purchases", value: filteredTransactions.length, color: "#1a3a1a", text: "white" },
              { label: "Total Quantity (kg)", value: totalQty.toLocaleString(), color: "#2D6A2D", text: "white" },
              { label: "Total Value (Rs)", value: totalValue.toLocaleString(), color: "#D4A017", text: "white" },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: card.color, borderRadius: "12px", padding: "20px", color: card.text }}>
                <div style={{ fontSize: "24px", fontWeight: "bold" }}>{card.value}</div>
                <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stock Report Table */}
        {activeReport === "stock" && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: "4px", height: "18px", backgroundColor: "#D4A017", borderRadius: "2px" }}></div>
              <span style={{ fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>STOCK SUMMARY BY WAREHOUSE</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  {["WAREHOUSE", "DISTRICT", "SAMBA (kg)", "NADU (kg)", "KEERI SAMBA (kg)", "TOTAL (kg)", "CAPACITY (kg)", "USAGE"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((row) => {
                  const pct = Math.round((row.total / row.capacity) * 100);
                  return (
                    <tr key={row.warehouse} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{row.warehouse}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#666" }}>{row.district}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.samba.toLocaleString()}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.nadu.toLocaleString()}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.keeri.toLocaleString()}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "600" }}>{row.total.toLocaleString()}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#666" }}>{row.capacity.toLocaleString()}</td>
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ backgroundColor: "#f0f0f0", borderRadius: "4px", height: "6px", width: "60px" }}>
                            <div style={{ height: "6px", borderRadius: "4px", width: `${pct}%`, backgroundColor: pct > 80 ? "#D4A017" : "#2D6A2D" }}></div>
                          </div>
                          <span style={{ fontSize: "12px", color: pct > 80 ? "#D4A017" : "#2D6A2D", fontWeight: "600" }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals Row */}
                <tr style={{ backgroundColor: "#f9f9f9", borderTop: "2px solid #eee" }}>
                  <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "700" }}>TOTAL</td>
                  <td style={{ padding: "14px 12px" }}></td>
                  <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "700" }}>{filteredStock.reduce((a, r) => a + r.samba, 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "700" }}>{filteredStock.reduce((a, r) => a + r.nadu, 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "700" }}>{filteredStock.reduce((a, r) => a + r.keeri, 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "700" }}>{filteredStock.reduce((a, r) => a + r.total, 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "700" }}>{filteredStock.reduce((a, r) => a + r.capacity, 0).toLocaleString()}</td>
                  <td style={{ padding: "14px 12px" }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Transaction Report Table */}
        {activeReport === "transactions" && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: "4px", height: "18px", backgroundColor: "#D4A017", borderRadius: "2px" }}></div>
              <span style={{ fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>TRANSACTION LOG</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  {["PURCHASE ID", "FARMER", "DISTRICT", "PADDY TYPE", "QTY (kg)", "UNIT PRICE", "TOTAL (Rs)", "WAREHOUSE", "DATE", "STATUS"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "600" }}>{row.id}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.farmer}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#666" }}>{row.district}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.type}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.qty.toLocaleString()}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px" }}>Rs {row.price.toFixed(2)}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "600" }}>Rs {row.total.toLocaleString()}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.warehouse}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#666" }}>{row.date}</td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                        backgroundColor: row.status === "Approved" ? "#e8f5e9" : row.status === "Pending" ? "#fff8e1" : "#ffebee",
                        color: row.status === "Approved" ? "#2D6A2D" : row.status === "Pending" ? "#D4A017" : "#c62828"
                      }}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}