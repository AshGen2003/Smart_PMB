"use client";
import { useState, useEffect } from "react";
import Sidebar from "../Sidebar";

type Warehouse = {
  warehouse_id: number;
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: string;
  contact_number: string;
  established_date: string;
  district: string;
  province: string;
  location: string;
};

type FormData = {
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: string;
  contact_number: string;
  established_date: string;
  location: string;
};

const emptyForm: FormData = {
  name: "", code: "", capacity: "", current_stock: "0",
  status: "active", contact_number: "", established_date: "", location: ""
};

const statusColors: Record<string, { bg: string; color: string }> = {
  active: { bg: "#e8f5e9", color: "#2D6A2D" },
  inactive: { bg: "#f5f5f5", color: "#999" },
  full: { bg: "#fff8e1", color: "#D4A017" },
  under_maintenance: { bg: "#fff3e0", color: "#e65100" },
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

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchWarehouses = () => {
    fetch("/api/warehouses")
      .then(r => r.json())
      .then(data => {
        setWarehouses(data);
        setLoading(false);
      });
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const handleFormChange = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowAddModal(false);
      setForm(emptyForm);
      window.location.reload();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    console.log("handleEdit called", editingWarehouse, form);
    if (!editingWarehouse) return;
    setSaving(true);
    const res = await fetch(`/api/warehouses/${editingWarehouse.warehouse_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setEditingWarehouse(null);
      setSelected(null);
      setForm(emptyForm);
      window.location.reload();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await fetch(`/api/warehouses/${deleteConfirm.warehouse_id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirm(null);
      setSelected(null);
      window.location.reload();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
  };

  const openEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setForm({
      name: w.name,
      code: w.code,
      capacity: w.capacity,
      current_stock: w.current_stock,
      status: w.status,
      contact_number: w.contact_number || "",
      established_date: w.established_date ? w.established_date.split("T")[0] : "",
      location: w.location || ""
    });
  };

  const totalStock = warehouses.reduce((a, w) => a + parseFloat(w.current_stock || "0"), 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>Warehouse Management</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>Monitor stock levels and manage warehouses</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => { setShowAddModal(true); setForm(emptyForm); }} style={{
              padding: "10px 20px", backgroundColor: "#D4A017", color: "white",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600"
            }}>+ Add Warehouse</button>
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

        {/* Summary Cards */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            {[
              { label: "Total Warehouses", value: warehouses.length, color: "#1a3a1a", text: "white" },
              { label: "Active", value: warehouses.filter(w => w.status === "active").length, color: "#2D6A2D", text: "white" },
              { label: "Full / Maintenance", value: warehouses.filter(w => w.status === "full" || w.status === "under_maintenance").length, color: "#D4A017", text: "white" },
              { label: "Total Stock (kg)", value: totalStock.toLocaleString(), color: "#8DBF8D", text: "#1a3a1a" },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: card.color, borderRadius: "12px", padding: "20px", color: card.text }}>
                <div style={{ fontSize: "28px", fontWeight: "bold" }}>{card.value}</div>
                <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: "60px", color: "#999", fontSize: "14px" }}>Loading warehouses...</div>}

        {/* Warehouse Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {warehouses.map((w) => {
            const pct = Math.round((parseFloat(w.current_stock) / parseFloat(w.capacity)) * 100);
            const sc = statusColors[w.status] || { bg: "#f5f5f5", color: "#999" };
            return (
              <div key={w.warehouse_id} style={{
                backgroundColor: "white", borderRadius: "12px", padding: "20px",
                cursor: "pointer", border: selected?.warehouse_id === w.warehouse_id ? "2px solid #2D6A2D" : "2px solid transparent"
              }} onClick={() => setSelected(selected?.warehouse_id === w.warehouse_id ? null : w)}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ fontSize: "32px" }}>🏭</div>
                  <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: sc.bg, color: sc.color }}>
                    {w.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>

                <div style={{ fontWeight: "700", fontSize: "15px", color: "#1a1a1a", marginBottom: "4px" }}>{w.name}</div>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "12px" }}>{w.code} · {w.district}, {w.province}</div>

                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#666" }}>Stock level</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: pct > 80 ? "#D4A017" : "#2D6A2D" }}>{pct}%</span>
                  </div>
                  <div style={{ backgroundColor: "#f0f0f0", borderRadius: "4px", height: "6px" }}>
                    <div style={{ height: "6px", borderRadius: "4px", width: `${pct}%`, backgroundColor: pct > 80 ? "#D4A017" : "#2D6A2D" }}></div>
                  </div>
                </div>

                <div style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
                  {parseFloat(w.current_stock).toLocaleString()} / {parseFloat(w.capacity).toLocaleString()} kg
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(w); }} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #2D6A2D", backgroundColor: "transparent", color: "#2D6A2D", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(w); }} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #c62828", backgroundColor: "transparent", color: "#c62828", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && !editingWarehouse && (
        <div style={{ width: "320px", backgroundColor: "white", borderLeft: "1px solid #eee", padding: "28px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Warehouse Detail</h2>
            <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: "#666" }}>✕</button>
          </div>
          <div style={{ backgroundColor: "#1a3a1a", borderRadius: "10px", padding: "16px", color: "white", marginBottom: "20px" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>{selected.name}</div>
            <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>{selected.code}</div>
          </div>
          {[
            ["District", selected.district],
            ["Province", selected.province],
            ["Location", selected.location || "—"],
            ["Contact", selected.contact_number || "—"],
            ["Established", selected.established_date ? new Date(selected.established_date).toLocaleDateString() : "—"],
            ["Capacity", `${parseFloat(selected.capacity).toLocaleString()} kg`],
            ["Current Stock", `${parseFloat(selected.current_stock).toLocaleString()} kg`],
            ["Status", selected.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ fontSize: "13px", color: "#666" }}>{label}</span>
              <span style={{ fontSize: "13px", fontWeight: "600" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Add New Warehouse</h2>
              <button onClick={() => setShowAddModal(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>

            {([
              { label: "Warehouse Name", key: "name" as keyof FormData, type: "text" },
              { label: "Code", key: "code" as keyof FormData, type: "text" },
              { label: "Location", key: "location" as keyof FormData, type: "text" },
              { label: "Capacity (kg)", key: "capacity" as keyof FormData, type: "number" },
              { label: "Current Stock (kg)", key: "current_stock" as keyof FormData, type: "number" },
              { label: "Contact Number", key: "contact_number" as keyof FormData, type: "text" },
              { label: "Established Date", key: "established_date" as keyof FormData, type: "date" },
            ]).map(field => (
              <div key={field.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type={field.type} value={form[field.key]} onChange={e => handleFormChange(field.key, e.target.value)} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Status</label>
              <select value={form.status} onChange={e => handleFormChange("status", e.target.value)} style={selectStyle}>
                {["active", "inactive", "full", "under_maintenance"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingWarehouse && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Edit Warehouse</h2>
              <button onClick={() => setEditingWarehouse(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>

            {([
              { label: "Warehouse Name", key: "name" as keyof FormData, type: "text" },
              { label: "Code", key: "code" as keyof FormData, type: "text" },
              { label: "Location", key: "location" as keyof FormData, type: "text" },
              { label: "Capacity (kg)", key: "capacity" as keyof FormData, type: "number" },
              { label: "Current Stock (kg)", key: "current_stock" as keyof FormData, type: "number" },
              { label: "Contact Number", key: "contact_number" as keyof FormData, type: "text" },
              { label: "Established Date", key: "established_date" as keyof FormData, type: "date" },
            ]).map(field => (
              <div key={field.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input type={field.type} value={form[field.key]} onChange={e => handleFormChange(field.key, e.target.value)} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Status</label>
              <select value={form.status} onChange={e => handleFormChange("status", e.target.value)} style={selectStyle}>
                {["active", "inactive", "full", "under_maintenance"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleEdit} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditingWarehouse(null)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Delete Warehouse</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
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