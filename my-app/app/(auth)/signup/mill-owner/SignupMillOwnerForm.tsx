/**
 * Mill owner self-registration form: mill/business details, credentials,
 * and district (location). Mirrors SignupFarmerForm.tsx field-for-field
 * where the domain overlaps (email/password/district), swapping in mill
 * business fields for farmer ones. Submits via the `signupMillOwner`
 * Server Action, which creates the account and sends a confirmation email.
 */
"use client";

import React, { useMemo, useState } from "react";
import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import { signupMillOwner, type SignupState } from "@/app/actions/auth";
import styles from "../../AuthForm.module.css";

export type DistrictOption = {
  id: number;
  name: string;
  province: { name: string } | null;
};

const initialState: SignupState = {};

/** Renders the full multi-field mill owner signup form, grouping the district `<select>` options by province. */
export default function SignupMillOwnerForm({
  districts,
}: {
  districts: DistrictOption[];
}) {
  const [state, formAction, pending] = useActionState(
    signupMillOwner,
    initialState
  );
  const [showPassword, setShowPassword] = useState(false);

  const districtsByProvince = useMemo(() => {
    const groups = new Map<string, DistrictOption[]>();
    for (const d of districts) {
      const province = d.province?.name ?? "Other";
      if (!groups.has(province)) groups.set(province, []);
      groups.get(province)!.push(d);
    }
    return groups;
  }, [districts]);

  return (
    <div className={clsx(styles.card, styles.cardWide)}>
      <div className={styles.mobileLogoRow}>
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span>Smart PMB</span>
      </div>

      <h1 className={styles.title}>Create your mill owner account</h1>
      <p className={styles.subtitle}>
        Register your rice mill to apply for licenses and submit milling reports with Smart PMB.
      </p>

      {state.error && (
        <div className={clsx(styles.banner, styles.bannerError)}>
          {state.error}
        </div>
      )}

      <form action={formAction} noValidate>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="millName">
              Mill name
            </label>
            <input
              id="millName"
              name="millName"
              type="text"
              required
              className={styles.input}
              placeholder="Perera Rice Mill"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ownerName">
              Owner name
            </label>
            <input
              id="ownerName"
              name="ownerName"
              type="text"
              required
              className={styles.input}
              placeholder="K. A. Perera"
            />
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nic">
              NIC number
            </label>
            <input
              id="nic"
              name="nic"
              type="text"
              required
              className={styles.input}
              placeholder="199012345678"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="businessRegNo">
              Business reg. no. <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="businessRegNo"
              name="businessRegNo"
              type="text"
              className={styles.input}
              placeholder="PV 00123456"
            />
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="contactNumber">
              Contact number
            </label>
            <input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              required
              className={styles.input}
              placeholder="0771234567"
            />
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                className={clsx(styles.input, styles.inputWithToggle)}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                className={styles.visibilityToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className={styles.input}
              placeholder="Repeat password"
            />
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="districtId">
              District
            </label>
            <select
              id="districtId"
              name="districtId"
              required
              defaultValue=""
              className={styles.select}
            >
              <option value="" disabled>
                Select mill district
              </option>
              {Array.from(districtsByProvince.entries()).map(
                ([province, items]) => (
                  <optgroup key={province} label={province}>
                    {items.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="capacityMtPerDay">
              Capacity <span className={styles.optional}>(MT/day)</span>
            </label>
            <input
              id="capacityMtPerDay"
              name="capacityMtPerDay"
              type="number"
              step="0.01"
              min="0"
              className={styles.input}
              placeholder="10"
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className={styles.switchLine}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
