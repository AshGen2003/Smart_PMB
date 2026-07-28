/**
 * Licensing application form for authorized purchasers and mill owners:
 * personal details, credentials, license type, and business details.
 * Submits via the `signupPartner` Server Action, which creates the
 * account + a pending LicenseApplication and sends a confirmation email —
 * the applicant still needs an officer/admin to approve it afterward (see
 * `(auth)/confirm-email/page.tsx` and the partner/ route group).
 */
"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import { signupPartner, type SignupState } from "@/app/actions/auth";
import StyledSelect from "@/app/components/StyledSelect";
import styles from "../../AuthForm.module.css";

const initialState: SignupState = {};

export default function SignupPartnerForm() {
  const [state, formAction, pending] = useActionState(signupPartner, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [licenseType, setLicenseType] = useState("");

  return (
    <div className={clsx(styles.card, styles.cardWide)}>
      <div className={styles.mobileLogoRow}>
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span>Smart PMB</span>
      </div>

      <h1 className={styles.title}>Apply for a license</h1>
      <p className={styles.subtitle}>
        For authorized purchasers and mill owners — an officer will review
        your application before you gain access.
      </p>

      {state.error && (
        <div className={clsx(styles.banner, styles.bannerError)}>
          {state.error}
        </div>
      )}

      <form action={formAction} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="licenseType">
            Applying as
          </label>
          <StyledSelect
            id="licenseType"
            name="licenseType"
            required
            value={licenseType}
            onChange={setLicenseType}
            placeholder="Select one"
            options={[
              { value: "authorized_purchaser", label: "Authorized Purchaser" },
              { value: "mill_owner", label: "Mill Owner" },
            ]}
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className={styles.input}
              placeholder="K. A. Perera"
            />
          </div>

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
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="businessName">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              required
              className={styles.input}
              placeholder="e.g. Perera Rice Mill"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="businessRegistrationNo">
              Business registration no.
            </label>
            <input
              id="businessRegistrationNo"
              name="businessRegistrationNo"
              type="text"
              required
              className={styles.input}
              placeholder="e.g. PV 00123456"
            />
          </div>
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

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Submitting…" : "Submit application"}
        </button>
      </form>

      <p className={styles.switchLine}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
