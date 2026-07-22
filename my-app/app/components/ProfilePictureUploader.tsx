/**
 * Circular avatar button used on the profile page that lets the user pick
 * a new profile picture. Selecting a file immediately shows a local
 * preview and auto-submits the form (no separate "upload" button) via the
 * `uploadProfilePicture` Server Action.
 */
"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  uploadProfilePicture,
  type ProfilePictureState,
} from "@/app/actions/profile";
import styles from "./ProfileView.module.css";

const initialState: ProfilePictureState = {};

/**
 * Renders the avatar (current picture, live local preview, or a fallback
 * letter) with a hidden file input triggered by clicking the avatar itself.
 */
export function ProfilePictureUploader({
  currentUrl,
  fallbackLetter,
}: {
  currentUrl: string | null;
  fallbackLetter: string;
}) {
  const [state, formAction, pending] = useActionState(
    uploadProfilePicture,
    initialState
  );
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Release the object URL created for the local preview when it's
  // replaced or the component unmounts, to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Show an instant local preview from the picked file, then submit the
  // form right away so the upload starts without a separate confirm step.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    formRef.current?.requestSubmit();
  }

  // Prefer the local preview (instant feedback) over the server-confirmed
  // URL until the page reloads with the new persisted picture.
  const displayUrl = preview ?? currentUrl;

  return (
    <form ref={formRef} action={formAction} className={styles.avatarUploadForm}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={() => fileInputRef.current?.click()}
        aria-label="Change profile picture"
        disabled={pending}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="Profile" className={styles.avatarImage} />
        ) : (
          <div className={styles.avatar}>{fallbackLetter}</div>
        )}
        <span className={styles.avatarOverlay}>
          {pending ? <Loader2 size={18} className={styles.spin} /> : <Camera size={18} />}
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        name="profile_picture"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      {state.error && <p className={styles.avatarError}>{state.error}</p>}
    </form>
  );
}
