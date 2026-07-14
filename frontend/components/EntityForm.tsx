"use client";

import { useEffect, useState } from "react";
import { optionsList } from "@/lib/api";
import type { FieldConfig } from "./CrudTable";

function inputType(type?: string): string {
  if (type === "number" || type === "float" || type === "int") return "number";
  if (type === "date") return "date";
  return "text";
}

export default function EntityForm({
  fields,
  initial,
  onSubmit,
  onCancel,
}: {
  fields: FieldConfig[];
  initial: any | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [optionsCache, setOptionsCache] = useState<
    Record<string, { value: any; label: string }[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const v: Record<string, any> = {};
    fields.forEach((f) => {
      const preset = initial ? initial[f.name] : undefined;
      v[f.name] = preset ?? f.defaultValue ?? "";
    });
    setValues(v);
  }, [fields, initial]);

  useEffect(() => {
    fields
      .filter((f) => f.optionsEndpoint)
      .forEach(async (f) => {
        try {
          const data = await optionsList(f.optionsEndpoint!);
          const valueField =
            f.optionsValueField ||
            (data[0] && Object.keys(data[0]).find((k) => k.endsWith("_id"))) ||
            "id";
          const labelField = f.optionsLabelField || "name";
          const opts = data.map((o: any) => ({
            value: o[valueField],
            label: f.optionsLabel ? f.optionsLabel(o) : String(o[labelField]),
          }));
          setOptionsCache((prev) => ({ ...prev, [f.name]: opts }));
        } catch {
          /* endpoint may be unavailable */
        }
      });
  }, [fields]);

  const set = (name: string, val: any) =>
    setValues((prev) => ({ ...prev, [name]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const payload: Record<string, any> = {};
    try {
      for (const f of fields) {
        let val = values[f.name];
        if (f.type === "number" || f.type === "float" || f.type === "int") {
          val = val === "" || val === null || val === undefined ? null : Number(val);
        }
        if (f.type === "date" && val === "") val = null;
        if (val === undefined) val = null;
        payload[f.name] = val;
      }
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="alert-error">{error}</div>}
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>
            {f.label}
            {f.required && <span className="text-red-500"> *</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea
              id={f.name}
              className="textarea"
              rows={3}
              placeholder={f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
            />
          ) : f.type === "select" ? (
            <select
              id={f.name}
              className="select"
              value={values[f.name] ?? ""}
              onChange={(e) =>
                set(f.name, e.target.value === "" ? null : e.target.value)
              }
            >
              {!f.required && <option value="">— None —</option>}
              {(f.options || optionsCache[f.name] || []).map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={f.name}
              className="input"
              type={inputType(f.type)}
              placeholder={f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
