"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../Sidebar";

type Purchase = {
  purchase_id: number;
  purchase_number: string;
  farmer_name: string;
  paddy_type: string;
  grade: string;
  quantity: string;
  unit_price: string;
  total_price: string;
  moisture_level: string;
  quality_check: boolean;
  warehouse_name: string;
  purchase_date: string;
  status: string;
  payment_status: string;
};

type PaddyType = { paddy_type_id: number; type_name: string; };
type Warehouse = { warehouse_id: number; name: string; };

type FormData = {
  purchase_number: string;
  paddy_type_id: string;
  grade: string;
  quantity: string;
  unit_price: string;
  moisture_level: string;
  quality_check: boolean;
  warehouse_id: string;
};

const emptyForm: FormData = {
  purchase_number: "", paddy_type_id: "",
  grade: "Grade A", quantity: "", unit_price: "",
  moisture_level: "", quality_check: true, warehouse_id: ""
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: "8px",
  border: "1px solid #e0e0e0", fontSize: "14px", color: "#1a1a1a",
  backgroundColor: "white", boxSizing: "border-box" as const, outline: "none",
};

const selectStyle = {
  width: "100%", padding: "10px 12px", borderRadius: "8px",
  border: "1px solid #e0e0e0", fontSize: "14px", color: "#1a1a1a",
  backgroundColor: "white", boxSizing: "border-box" as const,
};

const modalOverlay = {
  position: "fixed" as const, inset: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center",
  justifyContent: "center", zIndex: 100
};

export default function ApprovalsPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paddyTypes, setPaddyTypes] = useState<PaddyType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Purchase | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/purchases").then(r => r.json()),
      fetch("/api/paddy-types").then(r => r.json()),
      fetch("/api/warehouses").then(r => r.json()),
    ]).then(([p, pt, w]) => {
      setPurchases(p);
      setPaddyTypes(pt);
      setWarehouses(w);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFormChange = (key: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setMessage("Purchase added successfully!");
      setShowAddModal(false);
      setForm(emptyForm);
      fetchData();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleStatusChange = async (id: number, status: string) => {
    const res = await fetch(`/api/purchases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setMessage(`Purchase ${status} successfully!`);
      setSelectedPurchase(null);
      fetchData();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await fetch(`/api/purchases/${deleteConfirm.purchase_id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Purchase deleted successfully!");
      setDeleteConfirm(null);
      setSelectedPurchase(null);
      fetchData();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const tabs = ["pending", "completed", "cancelled"];
  const filtered = purchases.filter(p => p.status === activeTab);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>Purchase Approvals</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>Review and approve paddy purchase requests</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => { setShowAddModal(true); setForm(emptyForm); }} style={{
              padding: "10px 20px", backgroundColor: "#D4A017", color: "white",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600"
            }}>+ Add Purchase</button>
            <div style={{ backgroundColor: "#2D6A2D", color: "white", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", backgroundColor: "#8DBF8D", borderRadius: "50%", display: "inline-block" }}></span>
              On duty
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#D4A017", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "14px" }}>SW</div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px",
            backgroundColor: message.startsWith("Error") ? "#ffebee" : "#e8f5e9",
            color: message.startsWith("Error") ? "#c62828" : "#2D6A2D",
            border: `1px solid ${message.startsWith("Error") ? "#ffcdd2" : "#c8e6c9"}`
          }}>{message}</div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", backgroundColor: "#e8e5df", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 24px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: activeTab === tab ? "600" : "400",
              backgroundColor: activeTab === tab ? "white" : "transparent",
              color: activeTab === tab ? "#1a1a1a" : "#666",
              boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              textTransform: "capitalize"
            }}>
              {tab}
              <span style={{
                marginLeft: "8px", padding: "2px 8px", borderRadius: "10px", fontSize: "11px",
                backgroundColor: activeTab === tab ? (tab === "pending" ? "#D4A017" : tab === "completed" ? "#2D6A2D" : "#c62828") : "#ccc",
                color: "white"
              }}>
                {purchases.filter(p => p.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: "center", padding: "60px", color: "#999", fontSize: "14px" }}>Loading purchases...</div>}

        {/* Table */}
        {!loading && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  {["PURCHASE NO", "FARMER", "PADDY TYPE", "GRADE", "QUANTITY", "MOISTURE %", "WAREHOUSE", "DATE", "ACTIONS"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#999", fontSize: "14px" }}>
                      No {activeTab} purchases found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.purchase_id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{row.purchase_number}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{row.farmer_name || "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{row.paddy_type || "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{row.grade}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{parseFloat(row.quantity).toLocaleString()} kg</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>
                        <span style={{ color: parseFloat(row.moisture_level) > 15 ? "#c62828" : "#2D6A2D", fontWeight: "600" }}>
                          {row.moisture_level}%
                        </span>
                      </td>
                      <td style={{ padding: "14px 12px", fontSize: "13px" }}>{row.warehouse_name || "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#666" }}>
                        {new Date(row.purchase_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => setSelectedPurchase(row)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #2D6A2D", backgroundColor: "transparent", color: "#2D6A2D", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>View</button>
                          <button onClick={() => setDeleteConfirm(row)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #c62828", backgroundColor: "transparent", color: "#c62828", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPurchase && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Purchase Details</h2>
              <button onClick={() => setSelectedPurchase(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>

            {[
              ["Purchase No", selectedPurchase.purchase_number],
              ["Farmer", selectedPurchase.farmer_name || "—"],
              ["Paddy Type", selectedPurchase.paddy_type || "—"],
              ["Grade", selectedPurchase.grade],
              ["Quantity", `${parseFloat(selectedPurchase.quantity).toLocaleString()} kg`],
              ["Unit Price", `Rs ${parseFloat(selectedPurchase.unit_price).toFixed(2)}`],
              ["Total Price", `Rs ${parseFloat(selectedPurchase.total_price).toLocaleString()}`],
              ["Moisture Level", `${selectedPurchase.moisture_level}%`],
              ["Quality Check", selectedPurchase.quality_check ? "✅ Passed" : "❌ Failed"],
              ["Warehouse", selectedPurchase.warehouse_name || "—"],
              ["Date", new Date(selectedPurchase.purchase_date).toLocaleDateString()],
              ["Status", selectedPurchase.status],
              ["Payment Status", selectedPurchase.payment_status],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <span style={{ fontSize: "13px", color: "#666" }}>{label}</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{value}</span>
              </div>
            ))}

            {selectedPurchase.status === "pending" && (
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button onClick={() => handleStatusChange(selectedPurchase.purchase_id, "completed")} style={{
                  flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white",
                  border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer"
                }}>✓ Approve</button>
                <button onClick={() => handleStatusChange(selectedPurchase.purchase_id, "cancelled")} style={{
                  flex: 1, padding: "12px", backgroundColor: "white", color: "#c62828",
                  border: "1px solid #c62828", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer"
                }}>✕ Reject</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Add New Purchase</h2>
              <button onClick={() => setShowAddModal(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Purchase Number</label>
              <input type="text" value={form.purchase_number} onChange={e => handleFormChange("purchase_number", e.target.value)} style={inputStyle} placeholder="e.g. PO-3310" />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Paddy Type</label>
              <select value={form.paddy_type_id} onChange={e => handleFormChange("paddy_type_id", e.target.value)} style={selectStyle}>
                <option value="">Select paddy type</option>
                {paddyTypes.map(pt => <option key={pt.paddy_type_id} value={pt.paddy_type_id}>{pt.type_name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Warehouse</label>
              <select value={form.warehouse_id} onChange={e => handleFormChange("warehouse_id", e.target.value)} style={selectStyle}>
                <option value="">Select warehouse</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Grade</label>
              <select value={form.grade} onChange={e => handleFormChange("grade", e.target.value)} style={selectStyle}>
                {["Grade A", "Grade B", "Grade C"].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {[
              { label: "Quantity (kg)", key: "quantity" as keyof FormData, type: "number" },
              { label: "Unit Price (Rs per kg)", key: "unit_price" as keyof FormData, type: "number" },
              { label: "Moisture Level (%)", key: "moisture_level" as keyof FormData, type: "number" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type={field.type} value={form[field.key] as string} onChange={e => handleFormChange(field.key, e.target.value)} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="checkbox" checked={form.quality_check} onChange={e => handleFormChange("quality_check", e.target.checked)} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>Quality Check Passed</label>
            </div>

            {form.quantity && form.unit_price && (
              <div style={{ backgroundColor: "#e8f5e9", borderRadius: "8px", padding: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "13px", color: "#2D6A2D", fontWeight: "600" }}>
                  Total Price: Rs {(parseFloat(form.quantity) * parseFloat(form.unit_price)).toLocaleString()}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Delete Purchase</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>
              Are you sure you want to delete purchase <strong>{deleteConfirm.purchase_number}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleDelete} style={{ flex: 1, padding: "12px", backgroundColor: "#c62828", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Delete</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}