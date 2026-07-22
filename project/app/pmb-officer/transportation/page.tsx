"use client";
import { useState, useEffect } from "react";
import Sidebar from "../Sidebar";

type Driver = {
  driver_id: number;
  name: string;
  license_no: string;
  contact_no: string;
  address: string;
  status: string;
};

type Vehicle = {
  vehicle_id: number;
  registration_no: string;
  vehicle_type: string;
  capacity: number;
  status: string;
};

type Delivery = {
  delivery_id: number;
  scheduled_date: string;
  delivery_status: string;
  driver_name: string;
  vehicle_no: string;
  vehicle_type: string;
  origin: string;
  destination: string;
  distance: number;
  estimated_time: string;
  warehouse_name: string;
};

type Warehouse = { warehouse_id: number; name: string; };

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

const statusColors: Record<string, { bg: string; color: string }> = {
  active: { bg: "#e8f5e9", color: "#2D6A2D" },
  inactive: { bg: "#f5f5f5", color: "#999" },
  suspended: { bg: "#ffebee", color: "#c62828" },
  on_leave: { bg: "#fff8e1", color: "#D4A017" },
  under_maintenance: { bg: "#fff3e0", color: "#e65100" },
  retired: { bg: "#f3e5f5", color: "#7b1fa2" },
  pending: { bg: "#fff8e1", color: "#D4A017" },
  in_transit: { bg: "#e3f2fd", color: "#1565c0" },
  delivered: { bg: "#e8f5e9", color: "#2D6A2D" },
  cancelled: { bg: "#ffebee", color: "#c62828" },
  failed: { bg: "#ffebee", color: "#c62828" },
};

export default function TransportationPage() {
  const [activeTab, setActiveTab] = useState<"drivers" | "vehicles" | "deliveries">("drivers");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDelivery, setShowAddDelivery] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number; name: string } | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [driverForm, setDriverForm] = useState({ name: "", license_no: "", contact_no: "", address: "", status: "active" });
  const [vehicleForm, setVehicleForm] = useState({ registration_no: "", vehicle_type: "", capacity: "", status: "active" });
  const [deliveryForm, setDeliveryForm] = useState({ vehicle_id: "", driver_id: "", scheduled_date: "", warehouse_id: "", origin: "", destination: "", distance: "", estimated_time: "" });

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/drivers").then(r => r.json()),
      fetch("/api/vehicles").then(r => r.json()),
      fetch("/api/deliveries").then(r => r.json()),
      fetch("/api/warehouses").then(r => r.json()),
    ]).then(([d, v, del, w]) => {
      setDrivers(Array.isArray(d) ? d : []);
      setVehicles(Array.isArray(v) ? v : []);
      setDeliveries(Array.isArray(del) ? del : []);
      setWarehouses(Array.isArray(w) ? w : []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleAddDriver = async () => {
    setSaving(true);
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driverForm)
    });
    if (res.ok) {
      setShowAddDriver(false);
      setDriverForm({ name: "", license_no: "", contact_no: "", address: "", status: "active" });
      showMsg("Driver added successfully!");
      fetchAll();
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
    setSaving(false);
  };

  const handleEditDriver = async () => {
    if (!editDriver) return;
    setSaving(true);
    const res = await fetch(`/api/drivers/${editDriver.driver_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driverForm)
    });
    if (res.ok) {
      setEditDriver(null);
      showMsg("Driver updated successfully!");
      fetchAll();
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
    setSaving(false);
  };

  const handleAddVehicle = async () => {
    setSaving(true);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicleForm)
    });
    if (res.ok) {
      setShowAddVehicle(false);
      setVehicleForm({ registration_no: "", vehicle_type: "", capacity: "", status: "active" });
      showMsg("Vehicle added successfully!");
      fetchAll();
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
    setSaving(false);
  };

  const handleEditVehicle = async () => {
    if (!editVehicle) return;
    setSaving(true);
    const res = await fetch(`/api/vehicles/${editVehicle.vehicle_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicleForm)
    });
    if (res.ok) {
      setEditVehicle(null);
      showMsg("Vehicle updated successfully!");
      fetchAll();
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
    setSaving(false);
  };

  const handleAddDelivery = async () => {
    setSaving(true);
    const res = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deliveryForm)
    });
    if (res.ok) {
      setShowAddDelivery(false);
      setDeliveryForm({ vehicle_id: "", driver_id: "", scheduled_date: "", warehouse_id: "", origin: "", destination: "", distance: "", estimated_time: "" });
      showMsg("Delivery added successfully!");
      fetchAll();
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
    setSaving(false);
  };

  const handleUpdateDeliveryStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/deliveries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_status: status })
    });
    if (res.ok) {
      showMsg("Delivery status updated!");
      setSelectedDelivery(null);
      fetchAll();
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const url = deleteConfirm.type === "driver"
      ? `/api/drivers/${deleteConfirm.id}`
      : deleteConfirm.type === "vehicle"
        ? `/api/vehicles/${deleteConfirm.id}`
        : `/api/deliveries/${deleteConfirm.id}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      showMsg(`${deleteConfirm.type} deleted successfully!`);
      setDeleteConfirm(null);
      fetchAll();
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
  };

  const sc = (status: string) => statusColors[status] || { bg: "#f5f5f5", color: "#999" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f3ee", fontFamily: "sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a1a1a", margin: 0 }}>Transportation</h1>
            <p style={{ color: "#666", margin: "4px 0 0 0", fontSize: "14px" }}>Manage drivers, vehicles and deliveries</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {activeTab === "drivers" && (
              <button onClick={() => { setShowAddDriver(true); setDriverForm({ name: "", license_no: "", contact_no: "", address: "", status: "active" }); }} style={{ padding: "10px 20px", backgroundColor: "#D4A017", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>+ Add Driver</button>
            )}
            {activeTab === "vehicles" && (
              <button onClick={() => { setShowAddVehicle(true); setVehicleForm({ registration_no: "", vehicle_type: "", capacity: "", status: "active" }); }} style={{ padding: "10px 20px", backgroundColor: "#D4A017", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>+ Add Vehicle</button>
            )}
            {activeTab === "deliveries" && (
              <button onClick={() => { setShowAddDelivery(true); setDeliveryForm({ vehicle_id: "", driver_id: "", scheduled_date: "", warehouse_id: "", origin: "", destination: "", distance: "", estimated_time: "" }); }} style={{ padding: "10px 20px", backgroundColor: "#D4A017", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>+ Add Delivery</button>
            )}
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
              { label: "Total Drivers", value: drivers.length, color: "#1a3a1a", text: "white" },
              { label: "Active Vehicles", value: vehicles.filter(v => v.status === "active").length, color: "#2D6A2D", text: "white" },
              { label: "Pending Deliveries", value: deliveries.filter(d => d.delivery_status === "pending").length, color: "#D4A017", text: "white" },
              { label: "In Transit", value: deliveries.filter(d => d.delivery_status === "in_transit").length, color: "#8DBF8D", text: "#1a3a1a" },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: card.color, borderRadius: "12px", padding: "20px", color: card.text }}>
                <div style={{ fontSize: "28px", fontWeight: "bold" }}>{card.value}</div>
                <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", backgroundColor: "#e8e5df", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
          {(["drivers", "vehicles", "deliveries"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 24px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: activeTab === tab ? "600" : "400",
              backgroundColor: activeTab === tab ? "white" : "transparent",
              color: activeTab === tab ? "#1a1a1a" : "#666",
              boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              textTransform: "capitalize"
            }}>{tab}</button>
          ))}
        </div>

        {loading && <div style={{ textAlign: "center", padding: "60px", color: "#999", fontSize: "14px" }}>Loading transportation data...</div>}

        {/* Drivers Table */}
        {!loading && activeTab === "drivers" && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  {["ID", "NAME", "LICENSE NO", "CONTACT", "ADDRESS", "STATUS", "ACTIONS"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#999" }}>No drivers found. Add one!</td></tr>
                ) : drivers.map(d => (
                  <tr key={d.driver_id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a", fontWeight: "600" }}>#{d.driver_id}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.name}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.license_no}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.contact_no}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#666" }}>{d.address || "—"}</td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: sc(d.status).bg, color: sc(d.status).color }}>
                        {d.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => { setEditDriver(d); setDriverForm({ name: d.name, license_no: d.license_no, contact_no: d.contact_no, address: d.address || "", status: d.status }); }} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2D6A2D", backgroundColor: "transparent", color: "#2D6A2D", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Edit</button>
                        <button onClick={() => setDeleteConfirm({ type: "driver", id: d.driver_id, name: d.name })} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #c62828", backgroundColor: "transparent", color: "#c62828", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vehicles Table */}
        {!loading && activeTab === "vehicles" && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  {["ID", "REGISTRATION NO", "TYPE", "CAPACITY", "STATUS", "ACTIONS"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#999" }}>No vehicles found. Add one!</td></tr>
                ) : vehicles.map(v => (
                  <tr key={v.vehicle_id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a", fontWeight: "600" }}>#{v.vehicle_id}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{v.registration_no}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{v.vehicle_type}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{v.capacity} kg</td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: sc(v.status).bg, color: sc(v.status).color }}>
                        {v.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => { setEditVehicle(v); setVehicleForm({ registration_no: v.registration_no, vehicle_type: v.vehicle_type, capacity: v.capacity.toString(), status: v.status }); }} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2D6A2D", backgroundColor: "transparent", color: "#2D6A2D", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Edit</button>
                        <button onClick={() => setDeleteConfirm({ type: "vehicle", id: v.vehicle_id, name: v.registration_no })} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #c62828", backgroundColor: "transparent", color: "#c62828", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Deliveries Table */}
        {!loading && activeTab === "deliveries" && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  {["ID", "DRIVER", "VEHICLE", "ORIGIN", "DESTINATION", "DISTANCE", "DATE", "STATUS", "ACTIONS"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#999", fontWeight: "600" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#999" }}>No deliveries found. Add one!</td></tr>
                ) : deliveries.map(d => (
                  <tr key={d.delivery_id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a", fontWeight: "600" }}>#{d.delivery_id}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.driver_name || "—"}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.vehicle_no || "—"}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.origin || "—"}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.destination || "—"}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#1a1a1a" }}>{d.distance ? `${d.distance} km` : "—"}</td>
                    <td style={{ padding: "14px 12px", fontSize: "13px", color: "#666" }}>{d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "14px 12px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: sc(d.delivery_status).bg, color: sc(d.delivery_status).color }}>
                        {d.delivery_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => setSelectedDelivery(d)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2D6A2D", backgroundColor: "transparent", color: "#2D6A2D", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>View</button>
                        <button onClick={() => setDeleteConfirm({ type: "delivery", id: d.delivery_id, name: `Delivery #${d.delivery_id}` })} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #c62828", backgroundColor: "transparent", color: "#c62828", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Add New Driver</h2>
              <button onClick={() => setShowAddDriver(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            {[
              { label: "Full Name", key: "name" },
              { label: "License No", key: "license_no" },
              { label: "Contact No", key: "contact_no" },
              { label: "Address", key: "address" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{f.label}</label>
                <input type="text" value={driverForm[f.key as keyof typeof driverForm]} onChange={e => setDriverForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button onClick={handleAddDriver} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setShowAddDriver(false)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {editDriver && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Edit Driver</h2>
              <button onClick={() => setEditDriver(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            {[
              { label: "Full Name", key: "name" },
              { label: "License No", key: "license_no" },
              { label: "Contact No", key: "contact_no" },
              { label: "Address", key: "address" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{f.label}</label>
                <input type="text" value={driverForm[f.key as keyof typeof driverForm]} onChange={e => setDriverForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Status</label>
              <select value={driverForm.status} onChange={e => setDriverForm(prev => ({ ...prev, status: e.target.value }))} style={selectStyle}>
                {["active", "inactive", "suspended", "on_leave"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleEditDriver} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>{saving ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => setEditDriver(null)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Add New Vehicle</h2>
              <button onClick={() => setShowAddVehicle(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            {[
              { label: "Registration No", key: "registration_no", type: "text" },
              { label: "Vehicle Type", key: "vehicle_type", type: "text" },
              { label: "Capacity (kg)", key: "capacity", type: "number" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{f.label}</label>
                <input type={f.type} value={vehicleForm[f.key as keyof typeof vehicleForm]} onChange={e => setVehicleForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button onClick={handleAddVehicle} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setShowAddVehicle(false)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editVehicle && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Edit Vehicle</h2>
              <button onClick={() => setEditVehicle(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            {[
              { label: "Registration No", key: "registration_no", type: "text" },
              { label: "Vehicle Type", key: "vehicle_type", type: "text" },
              { label: "Capacity (kg)", key: "capacity", type: "number" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{f.label}</label>
                <input type={f.type} value={vehicleForm[f.key as keyof typeof vehicleForm]} onChange={e => setVehicleForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Status</label>
              <select value={vehicleForm.status} onChange={e => setVehicleForm(prev => ({ ...prev, status: e.target.value }))} style={selectStyle}>
                {["active", "inactive", "under_maintenance", "retired"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleEditVehicle} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>{saving ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => setEditVehicle(null)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Delivery Modal */}
      {showAddDelivery && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>Add New Delivery</h2>
              <button onClick={() => setShowAddDelivery(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Driver</label>
              <select value={deliveryForm.driver_id} onChange={e => setDeliveryForm(prev => ({ ...prev, driver_id: e.target.value }))} style={selectStyle}>
                <option value="">Select driver</option>
                {drivers.filter(d => d.status === "active").map(d => (
                  <option key={d.driver_id} value={d.driver_id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Vehicle</label>
              <select value={deliveryForm.vehicle_id} onChange={e => setDeliveryForm(prev => ({ ...prev, vehicle_id: e.target.value }))} style={selectStyle}>
                <option value="">Select vehicle</option>
                {vehicles.filter(v => v.status === "active").map(v => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>{v.registration_no} — {v.vehicle_type}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>Warehouse</label>
              <select value={deliveryForm.warehouse_id} onChange={e => setDeliveryForm(prev => ({ ...prev, warehouse_id: e.target.value }))} style={selectStyle}>
                <option value="">Select warehouse</option>
                {warehouses.map(w => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
                ))}
              </select>
            </div>
            {[
              { label: "Origin", key: "origin", type: "text", placeholder: "e.g. Colombo" },
              { label: "Destination", key: "destination", type: "text", placeholder: "e.g. Kandy" },
              { label: "Distance (km)", key: "distance", type: "number", placeholder: "e.g. 115" },
              { label: "Estimated Time", key: "estimated_time", type: "text", placeholder: "e.g. 3 hours" },
              { label: "Scheduled Date", key: "scheduled_date", type: "date", placeholder: "" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", display: "block", marginBottom: "6px" }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={deliveryForm[f.key as keyof typeof deliveryForm]} onChange={e => setDeliveryForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleAddDelivery} disabled={saving} style={{ flex: 1, padding: "12px", backgroundColor: "#2D6A2D", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setShowAddDelivery(false)} style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#666", border: "1px solid #e0e0e0", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Detail Modal */}
      {selectedDelivery && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Delivery #{selectedDelivery.delivery_id}</h2>
              <button onClick={() => setSelectedDelivery(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            {[
              ["Driver", selectedDelivery.driver_name || "—"],
              ["Vehicle", `${selectedDelivery.vehicle_no || "—"} (${selectedDelivery.vehicle_type || "—"})`],
              ["Origin", selectedDelivery.origin || "—"],
              ["Destination", selectedDelivery.destination || "—"],
              ["Distance", selectedDelivery.distance ? `${selectedDelivery.distance} km` : "—"],
              ["Estimated Time", selectedDelivery.estimated_time || "—"],
              ["Warehouse", selectedDelivery.warehouse_name || "—"],
              ["Scheduled Date", selectedDelivery.scheduled_date ? new Date(selectedDelivery.scheduled_date).toLocaleDateString() : "—"],
              ["Status", selectedDelivery.delivery_status],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                <span style={{ fontSize: "13px", color: "#666" }}>{label}</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop: "20px" }}>
              <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>Update Status</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {["pending", "in_transit", "delivered", "cancelled"].map(s => (
                  <button key={s} onClick={() => handleUpdateDeliveryStatus(selectedDelivery.delivery_id, s)} style={{
                    padding: "8px", borderRadius: "8px", border: "1px solid", cursor: "pointer",
                    fontSize: "12px", fontWeight: "600", textTransform: "capitalize",
                    backgroundColor: selectedDelivery.delivery_status === s ? sc(s).bg : "white",
                    borderColor: selectedDelivery.delivery_status === s ? sc(s).color : "#e0e0e0",
                    color: selectedDelivery.delivery_status === s ? sc(s).color : "#666",
                  }}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: "bold", color: "#1a1a1a" }}>
              Delete {deleteConfirm.type.charAt(0).toUpperCase() + deleteConfirm.type.slice(1)}
            </h2>
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