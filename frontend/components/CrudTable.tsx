"use client";

import { useCallback, useEffect, useState, ReactNode } from "react";
import { create, list, remove, update } from "@/lib/api";
import Modal from "./Modal";
import EntityForm from "./EntityForm";
import StatusBadge from "./StatusBadge";
import PageHeader from "./PageHeader";

export interface FieldConfig {
  name: string;
  label: string;
  type?: "text" | "number" | "float" | "int" | "date" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { value: string | number; label: string }[];
  optionsEndpoint?: string;
  optionsLabelField?: string;
  optionsValueField?: string;
  optionsLabel?: (item: any) => string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  badge?: boolean;
  render?: (row: any) => ReactNode;
}

export default function CrudTable({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  rowIdKey = "id",
}: {
  title: string;
  subtitle?: string;
  endpoint: string;
  columns: ColumnConfig[];
  fields: FieldConfig[];
  rowIdKey?: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await list(endpoint);
      setRows(data?.results || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const onAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (row: any) => {
    setEditing(row);
    setModalOpen(true);
  };
  const onDelete = async (row: any) => {
    if (!confirm(`Delete this ${title.replace(/s$/, "")}? This cannot be undone.`))
      return;
    setDeleting(row[rowIdKey]);
    try {
      await remove(endpoint, row[rowIdKey]);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };
  const onSubmit = async (data: any) => {
    if (editing) await update(endpoint, editing[rowIdKey], data);
    else await create(endpoint, data);
    setModalOpen(false);
    await load();
  };

  const singular = title.replace(/s$/, "");

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        <button className="btn-primary" onClick={onAdd}>
          + Add {singular}
        </button>
      </PageHeader>

      {error && <div className="alert-error">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-pmb-100 bg-pmb-50 text-pmb-700">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pmb-50">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-pmb-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-pmb-500">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row[rowIdKey]} className="hover:bg-pmb-50/60">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-pmb-800">
                      {c.render
                        ? c.render(row)
                        : c.badge
                        ? <StatusBadge status={row[c.key]} />
                        : row[c.key] ?? "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button className="link mr-3" onClick={() => onEdit(row)}>
                      Edit
                    </button>
                    <button
                      className="link-danger"
                      onClick={() => onDelete(row)}
                      disabled={deleting === row[rowIdKey]}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${singular}` : `Add ${singular}`}
        onClose={() => setModalOpen(false)}
      >
        <EntityForm
          fields={fields}
          initial={editing}
          onSubmit={onSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
