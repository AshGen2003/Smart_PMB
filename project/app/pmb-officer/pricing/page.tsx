"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../Sidebar";

type PaddyType = {
  paddy_type_id: number;
  type_name: string;
  variety: string;
  description: string;
  guaranteed_price: string;
  is_active: boolean;
};

type FormData = {
  type_name: string;
  variety: string;
  description: string;
  guaranteed_price: string;
  is_active: boolean;
};

const emptyForm: FormData = {
  type_name: "", variety: "", description: "", guaranteed_price: "", is_active: true
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: "8px",
  border: "1px solid #e0e0e0", fontSize: "14px", color: "#1a1a1a",
  backgroundColor: "white", boxSizing: "border-box" as const, outline: "none",
};

const modalOverlay = {
  position: "fixed" as const, inset: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center",
  justifyContent: "center", zIndex: 100
};

export default function PricingPage() {
  const [paddyTypes, setPaddyTypes] = useState<PaddyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPaddy, setEditingPaddy] = useState<PaddyType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PaddyType | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchPaddyTypes = useCallback(() => {
    fetch("/api/paddy-types")
      .then(r => r.json())
      .then(data => {
        setPaddyTypes(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchPaddyTypes(); }, [fetchPaddyTypes]);

  const handleFormChange = (key: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/paddy-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setMessage("Paddy type added successfully!");
      setShowAddModal(false);
      setForm(emptyForm);
      fetchPaddyTypes();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = async () => {
    if (!editingPaddy) return;
    setSaving(true);
    const res = await fetch(`/api/paddy-types/${editingPaddy.paddy_type_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setMessage("Paddy type updated successfully!");
      setEditingPaddy(null);
      setForm(emptyForm);
      fetchPaddyTypes();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await fetch(`/api/paddy-types/${deleteConfirm.paddy_type_id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Paddy type deleted successfully!");
      setDeleteConfirm(null);
      fetchPaddyTypes();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const openEdit = (paddy: PaddyType) => {
    setEditingPaddy(paddy);
    setForm({
      type_name: paddy.type_name,
      variety: paddy.variety,
      description: paddy.description,
      guaranteed_price: parseFloat(paddy.guaranteed_price).toFixed(2),
      is_active: paddy.is_active
    });
  };

  const activePrices = paddyTypes.filter(p => p.is_active).map(p => parseFloat(p.guaranteed_price));

  const FormModal = ({ title, onSave, onClose }: { title: string; onSave: () => void; onClose: () => void }) => (
    <div style={modalOverlay}>
      <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
        </div>

        {([
          { label: "Paddy Type Name", key: "type_name", type: "text" },
          { label: "Variety", key: "variety", type: "text" },
          { label: "Guaranteed Price (Rs per kg)", key: "guaranteed_price", type: "number" },
        ] as { label: string; key: keyof FormData; type: string }[]).map(field => (
          <div key={field.key} style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{field.label}</label>
            <input
              type={field.type}
              value={form[field.key] as string}
              onChange={e => handleFormChange(field.key, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}

        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => handleFormChange("description", e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </div>

        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => handleFormChange("is_active", e.target.checked)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", cursor: "pointer" }}>Active</label>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onSave} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>Pricing Management</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>Set and update guaranteed prices for paddy types</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => { setShowAddModal(true); setForm(emptyForm); }} style={{
              padding: "10px 20px", backgroundColor: "#D4A017", color: "white",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600"
            }}>+ Add Paddy Type</button>
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

        {/* Info Banner */}
        <div style={{ backgroundColor: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: "10px", padding: "14px 18px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>ℹ️</span>
          <span style={{ fontSize: "13px", color: "#2D6A2D" }}>Guaranteed prices are set per kilogram (kg). Changes take effect immediately for all new purchase approvals.</span>
        </div>

        {/* Summary Cards */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
            {[
              { label: "Active Paddy Types", value: paddyTypes.filter(p => p.is_active).length, color: "#2D6A2D", text: "white" },
              { label: "Highest Price (per kg)", value: activePrices.length ? `Rs ${Math.max(...activePrices).toFixed(2)}` : "N/A", color: "#D4A017", text: "white" },
              { label: "Lowest Price (per kg)", value: activePrices.length ? `Rs ${Math.min(...activePrices).toFixed(2)}` : "N/A", color: "#8DBF8D", text: "#1a3a1a" },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: card.color, borderRadius: "12px", padding: "20px", color: card.text }}>
                <div style={{ fontSize: "26px", fontWeight: "bold" }}>{card.value}</div>
                <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", padding: "60px", color: "#999", fontSize: "14px" }}>Loading paddy types...</div>}

        {/* Paddy Type Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {paddyTypes.map((paddy) => (
            <div key={paddy.paddy_type_id} style={{
              backgroundColor: "white", borderRadius: "12px", padding: "24px",
              border: `2px solid ${paddy.is_active ? "#e8f5e9" : "#f5f5f5"}`,
              opacity: paddy.is_active ? 1 : 0.6
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>{paddy.type_name}</div>
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>{paddy.variety}</div>
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                  backgroundColor: paddy.is_active ? "#e8f5e9" : "#f5f5f5",
                  color: paddy.is_active ? "#2D6A2D" : "#999"
                }}>{paddy.is_active ? "Active" : "Inactive"}</span>
              </div>

              <div style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>{paddy.description}</div>

              <div style={{ backgroundColor: "#f9f9f9", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Guaranteed Price per kg</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1a3a1a" }}>
                  Rs {parseFloat(paddy.guaranteed_price).toFixed(2)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => openEdit(paddy)} style={{ flex: 1, padding: "10px", backgroundColor: "#D4A017", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>✏️ Edit</button>
                <button onClick={() => setDeleteConfirm(paddy)} style={{ flex: 1, padding: "10px", backgroundColor: "white", color: "#c62828", border: "1px solid #c62828", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && <FormModal title="Add New Paddy Type" onSave={handleAdd} onClose={() => setShowAddModal(false)} />}

      {/* Edit Modal */}
      {editingPaddy && <FormModal title="Edit Paddy Type" onSave={handleEdit} onClose={() => setEditingPaddy(null)} />}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Delete Paddy Type</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>
              Are you sure you want to delete <strong>{deleteConfirm.type_name}</strong>? This cannot be undone.
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