/**
 * Settings-page form for a mill owner to edit their mill's business
 * details (the "update mill details" CRUD op) — separate from
 * AccountSettingsForm, which only covers User-level fields (name/NIC/
 * phone/password), not mill business fields. Submits via the
 * updateMillProfile Server Action. Reuses SettingsSections.module.css for
 * visual consistency with the account settings card above it.
 */
"use client";

import React, { useActionState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { updateMillProfile, type MillFormState } from "@/app/actions/mills";
import styles from "@/app/components/SettingsSections.module.css";

export type DistrictOption = { id: number; name: string; province: { name: string } | null };

export type MillDetails = {
  mill_name: string;
  business_reg_no: string;
  location: string;
  district: number | null;
  capacity_mt_per_day: string | null;
  contact_number: string;
};

const initialState: MillFormState = {};

export default function MillDetailsForm({
  mill,
  districts,
}: {
  mill: MillDetails;
  districts: DistrictOption[];
}) {
  const [state, formAction, pending] = useActionState(updateMillProfile, initialState);

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Mill details</h2>
      <p className={styles.cardSubtitle}>
        Update your mill&apos;s business details. Registration number, owner name, and NIC are set at
        registration and can&apos;t be changed here.
      </p>

      {state.error && <div className={clsx(styles.banner, styles.bannerError)}>{state.error}</div>}

      <form action={formAction} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="mill_name">Mill name</label>
          <input
            id="mill_name"
            name="mill_name"
            type="text"
            defaultValue={mill.mill_name}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="business_reg_no">Business reg. no.</label>
            <input
              id="business_reg_no"
              name="business_reg_no"
              type="text"
              defaultValue={mill.business_reg_no}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="contact_number">Contact number</label>
            <input
              id="contact_number"
              name="contact_number"
              type="tel"
              defaultValue={mill.contact_number}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="district">District</label>
            <select
              id="district"
              name="district"
              defaultValue={mill.district ?? ""}
              className={styles.input}
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="capacity_mt_per_day">Capacity (MT/day)</label>
            <input
              id="capacity_mt_per_day"
              name="capacity_mt_per_day"
              type="number"
              step="0.01"
              min="0"
              defaultValue={mill.capacity_mt_per_day ?? ""}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="location">Location</label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={mill.location}
            className={styles.input}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Saving…" : "Save mill details"}
        </button>
      </form>
    </div>
  );
}
