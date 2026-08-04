/**
 * Settings-page form for a farmer to edit their own payout bank details
 * (bank name + account number) — separate from AccountSettingsForm, which
 * only covers User-level fields (name/NIC/phone/password). Submits via the
 * updateBankDetails Server Action. Mirrors partner/settings/MillDetailsForm.tsx.
 */
"use client";

import React, { useActionState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { updateBankDetails, type BankDetailsFormState } from "@/app/actions/farmer";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "@/app/components/SettingsSections.module.css";

const initialState: BankDetailsFormState = {};

export default function FarmerBankDetailsForm({
  bankAccount,
  bankName,
}: {
  bankAccount: string;
  bankName: string;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(updateBankDetails, initialState);

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t.settingsBankDetails.title}</h2>
      <p className={styles.cardSubtitle}>{t.settingsBankDetails.subtitle}</p>

      {state.error && <div className={clsx(styles.banner, styles.bannerError)}>{state.error}</div>}

      <form action={formAction} noValidate>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bank_name">{t.settingsBankDetails.bankName}</label>
            <input
              id="bank_name"
              name="bank_name"
              type="text"
              defaultValue={bankName}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bank_account">{t.settingsBankDetails.accountNumber}</label>
            <input
              id="bank_account"
              name="bank_account"
              type="text"
              defaultValue={bankAccount}
              className={styles.input}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? t.settingsBankDetails.saving : t.settingsBankDetails.save}
        </button>
      </form>
    </div>
  );
}
