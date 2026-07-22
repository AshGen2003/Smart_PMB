/**
 * Password `<input>` with a built-in show/hide toggle button. Spreads
 * any standard input props through (name, required, minLength, etc.) so it
 * drops into a `<form>` exactly like a plain `<input type="password">`.
 */
"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordInput.module.css";

/** Renders the input plus an eye-icon toggle button that flips the input's type between "password" and "text". */
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
