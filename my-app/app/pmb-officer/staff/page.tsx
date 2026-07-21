"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../Sidebar";

type Officer = {
  pmb_officer_id: number;
  employee_no: string;
  name: string;
  nic: string;
  designation: string;
  location: string;
  contact_number: string;
  email: string;
  joined_date: string;
  status: string;
  district: string;
  province: string;
};

type FormData = {
  name: string;
  employee_no: string;
  nic: string;
  designation: string;
  location: string;
  contact_number: string;
  email: string;
  status: string;
};

const designations = [
  "chief_officer", "senior_officer", "junior_officer",
  "field_officer", "administrative_officer", "finance_officer", "operations_officer"
];

const emptyForm: FormData = {
  name: "", employee_no: "", nic: "", designation: "junior_officer",
  location: "", contact_number: "", email: "", status: "active"
};

const statusColors: Record<string, { bg: string; color: string }> = {
  active: { bg: "#e8f5e9", color: "#2D6A2D" },
  inactive: { bg: "#f5f5f5", color: "#999" },
  suspended: { bg: "#ffebee", color: "#c62828" },
  on_leave: { bg: "#fff8e1", color: "#D4A017" },
  retired: { bg: "#f3e5f5", color: "#7b1fa2" },
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e0e0e0",
  fontSize: "14px",
  color: "#1a1a1a",
  backgroundColor: "white",
  boxSizing: "border-box" as const,
  outline: "none",
};

const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e0e0e0",
  fontSize: "14px",
  color: "#1a1a1a",
  backgroundColor: "white",
  boxSizing: "border-box" as const,
};

export default function StaffPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Officer | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchOfficers = useCallback(() => {
    fetch("/api/officers")
      .then(r => r.json())
      .then(data => {
        setOfficers(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  const handleFormChange = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/officers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setMessage("Officer added successfully!");
      setShowAddModal(false);
      setForm(emptyForm);
      fetchOfficers();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = async () => {
    if (!editingOfficer) return;
    setSaving(true);
    const res = await fetch(`/api/officers/${editingOfficer.pmb_officer_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setMessage("Officer updated successfully!");
      setEditingOfficer(null);
      setForm(emptyForm);
      fetchOfficers();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await fetch(`/api/officers/${deleteConfirm.pmb_officer_id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Officer deleted successfully!");
      setDeleteConfirm(null);
      fetchOfficers();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const openEdit = (officer: Officer) => {
    setEditingOfficer(officer);
    setForm({
      name: officer.name,
      employee_no: officer.employee_no,
      nic: officer.nic,
      designation: officer.designation,
      location: officer.location || "",
      contact_number: officer.contact_number || "",
      email: officer.email,
      status: officer.status
    });
  };

  const modalOverlay = {
    position: "fixed" as const, inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 100
  };

  const modalBox = {
    backgroundColor: "white", borderRadius: "16px",
    padding: "32px", width: "520px",
    maxHeight: "90vh", overflowY: "auto" as const,
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>Staff Management</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>Manage PMB Officers — add, edit, and remove staff</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => { setShowAddModal(true); setForm(emptyForm); }} style={{
              padding: "10px 20px", backgroundColor: "#D4A017", color: "white",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600"
            }}>+ Add Officer</button>
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
              { label: "Total Officers", value: officers.length, color: "#1a3a1a", text: "white" },
              { label: "Active", value: officers.filter(o => o.status === "active").length, color: "#2D6A2D", text: "white" },
              { label: "On Leave", value: officers.filter(o => o.status === "on_leave").length, color: "#D4A017", text: "white" },
              { label: "Suspended", value: officers.filter(o => o.status === "suspended").length, color: "#8DBF8D", text: "#1a3a1a" },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: card.color, borderRadius: "12px", padding: "20px", color: card.text }}>
                <div style={{ fontSize: "28px", fontWeight: "bold" }}>{card.value}</div>
                <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: "#999", fontSize: "14px" }}>Loading officers from database...</div>
        )}

        {/* Table */}
        {!loading && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: "4px", height: "18px", backgroundColor: "#D4A017", borderRadius: "2px" }}></div>
              <span style={{ fontWeight: "600", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>ALL OFFICERS</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  {["EMP NO", "NAME", "NIC", "DESIGNATION", "DISTRICT", "CONTACT", "STATUS", "ACTIONS"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => {
                  const sc = statusColors[officer.status] || { bg: "#f5f5f5", color: "#999" };
                  return (
                    <tr key={officer.pmb_officer_id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "14px 12px", fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{officer.employee_no}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{officer.name}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{officer.nic}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{officer.designation.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{officer.district || "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{officer.contact_number || "—"}</td>
                      <td style={{ padding: "14px 12px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: sc.bg, color: sc.color }}>
                          {officer.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => openEdit(officer)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2D6A2D", backgroundColor: "transparent", color: "#2D6A2D", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Edit</button>
                          <button onClick={() => setDeleteConfirm(officer)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #c62828", backgroundColor: "transparent", color: "#c62828", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Add New Officer</h2>
              <button onClick={() => setShowAddModal(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>

            {([
              { label: "Full Name", key: "name" as keyof FormData, type: "text" },
              { label: "Employee No", key: "employee_no" as keyof FormData, type: "text" },
              { label: "NIC", key: "nic" as keyof FormData, type: "text" },
              { label: "Location", key: "location" as keyof FormData, type: "text" },
              { label: "Contact Number", key: "contact_number" as keyof FormData, type: "text" },
              { label: "Email", key: "email" as keyof FormData, type: "email" },
            ]).map(field => (
              <div key={field.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={e => handleFormChange(field.key, e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Designation</label>
              <select value={form.designation} onChange={e => handleFormChange("designation", e.target.value)} style={selectStyle}>
                {designations.map(d => <option key={d} value={d}>{d.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Status</label>
              <select value={form.status} onChange={e => handleFormChange("status", e.target.value)} style={selectStyle}>
                {["active", "inactive", "suspended", "on_leave", "retired"].map(s => (
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
      {editingOfficer && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Edit Officer</h2>
              <button onClick={() => setEditingOfficer(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>

            {([
              { label: "Full Name", key: "name" as keyof FormData, type: "text" },
              { label: "Employee No", key: "employee_no" as keyof FormData, type: "text" },
              { label: "NIC", key: "nic" as keyof FormData, type: "text" },
              { label: "Location", key: "location" as keyof FormData, type: "text" },
              { label: "Contact Number", key: "contact_number" as keyof FormData, type: "text" },
              { label: "Email", key: "email" as keyof FormData, type: "email" },
            ]).map(field => (
              <div key={field.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={e => handleFormChange(field.key, e.target.value)}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Designation</label>
              <select value={form.designation} onChange={e => handleFormChange("designation", e.target.value)} style={selectStyle}>
                {designations.map(d => <option key={d} value={d}>{d.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Status</label>
              <select value={form.status} onChange={e => handleFormChange("status", e.target.value)} style={selectStyle}>
                {["active", "inactive", "suspended", "on_leave", "retired"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleEdit} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditingOfficer(null)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "400px" }}>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Delete Officer</h2>
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