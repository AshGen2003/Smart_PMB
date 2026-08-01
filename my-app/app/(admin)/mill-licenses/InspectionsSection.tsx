/**
 * Officer-facing mill inspection log: a table of past inspections plus a
 * "Log inspection" action (mill picker, pass/fail/needs-follow-up result,
 * optional notes). Rendered below the license queue on the same
 * `/mill-licenses` page. Read-only when `canWrite` is false (mirrors
 * LicensesManager's canWrite gate on the same page).
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { ClipboardCheck, Plus } from "lucide-react";
import { logInspection } from "@/app/actions/mill-inspections";
import styles from "./Licenses.module.css";

export type InspectionRow = {
  id: number;
  mill_name: string | null;
  mill_registration_no: string | null;
  inspection_date: string;
  result: "pass" | "fail" | "needs_follow_up";
  officer_name: string | null;
  notes: string;
};

export type MillOption = { id: number; name: string };

const RESULT_LABEL: Record<InspectionRow["result"], string> = {
  pass: "Pass",
  fail: "Fail",
  needs_follow_up: "Needs Follow-up",
};

const RESULT_BADGE: Record<InspectionRow["result"], string> = {
  pass: "badge-success",
  fail: "badge-danger",
  needs_follow_up: "badge-warning",
};

export default function InspectionsSection({
  inspections,
  mills,
  canWrite,
}: {
  inspections: InspectionRow[];
  mills: MillOption[];
  canWrite: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [millId, setMillId] = useState("");
  const [result, setResult] = useState<InspectionRow["result"]>("pass");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!millId) {
      setActionError("Select a mill.");
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const res = await logInspection(Number(millId), result, notes);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      setModalOpen(false);
      setMillId("");
      setResult("pass");
      setNotes("");
    });
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h2 className={styles.sectionTitle}>Mill Inspections</h2>
        {canWrite && (
          <button type="button" className={styles.newBtn} onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Log inspection
          </button>
        )}
      </div>

      {actionError && !modalOpen && <div className={styles.banner}>{actionError}</div>}

      <div className={styles.container}>
        {inspections.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mill</th>
                  <th>Date</th>
                  <th>Result</th>
                  <th>Officer</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((i) => (
                  <tr key={i.id}>
                    <td>{i.mill_name ?? "—"}</td>
                    <td>{format(new Date(i.inspection_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={clsx(styles.badge, styles[RESULT_BADGE[i.result]])}>
                        {RESULT_LABEL[i.result]}
                      </span>
                    </td>
                    <td>{i.officer_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <ClipboardCheck size={28} />
            <p>No inspections logged yet.</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Log mill inspection</h3>

            {actionError && <div className={styles.banner}>{actionError}</div>}

            <select className={styles.select} value={millId} onChange={(e) => setMillId(e.target.value)}>
              <option value="" disabled>Select a mill</option>
              {mills.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <select
              className={styles.select}
              value={result}
              onChange={(e) => setResult(e.target.value as InspectionRow["result"])}
            >
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="needs_follow_up">Needs Follow-up</option>
            </select>

            <textarea
              className={styles.textarea}
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} disabled={isPending} onClick={handleSubmit}>
                Log inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
