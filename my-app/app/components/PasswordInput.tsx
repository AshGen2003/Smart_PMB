"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordInput.module.css";

export function PasswordInput({
  className,
  wrapperClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { wrapperClassName?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`${styles.wrapper} ${wrapperClassName ?? ""}`}>
      <input {...props} type={visible ? "text" : "password"} className={className} />
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
