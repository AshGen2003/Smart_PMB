/**
 * Circular avatar button used on the profile page. Clicking it opens a
 * zoomed-in preview (ProfilePictureModal) with options to view the full
 * image, replace it, or remove it — or, if there's no picture yet, jumps
 * straight to the file picker since there's nothing to preview or remove.
 * Selecting a file (initial upload or a Replace from the modal) shows a
 * local preview and auto-submits (no separate "upload" button) via the
 * `uploadProfilePicture` Server Action.
 */
"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  removeProfilePicture,
  uploadProfilePicture,
  type ProfilePictureState,
} from "@/app/actions/profile";
import ProfilePictureModal from "./ProfilePictureModal";
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
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadProfilePicture,
    initialState
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeProfilePicture,
    initialState
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const removeFormRef = useRef<HTMLFormElement>(null);

  // Release the object URL created for the local preview when it's
  // replaced or the component unmounts, to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pending = uploadPending || removePending;

  // Show an instant local preview from the picked file, then submit the
  // form right away so the upload starts without a separate confirm step.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadFormRef.current?.requestSubmit();
  }

  // Prefer the local preview (instant feedback) over the server-confirmed
  // URL until the page reloads with the new persisted picture.
  const displayUrl = preview ?? currentUrl;

  function handleAvatarClick() {
    if (displayUrl) {
      setShowModal(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  return (
    <>
      <form ref={uploadFormRef} action={uploadAction} className={styles.avatarUploadForm}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={handleAvatarClick}
          aria-label={displayUrl ? "View profile picture" : "Add profile picture"}
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

        {uploadState.error && <p className={styles.avatarError}>{uploadState.error}</p>}
        {removeState.error && <p className={styles.avatarError}>{removeState.error}</p>}
      </form>

      <form ref={removeFormRef} action={removeAction} className={styles.hiddenInput} />

      {showModal && displayUrl && (
        <ProfilePictureModal
          imageUrl={displayUrl}
          removing={removePending}
          onReplace={() => {
            setShowModal(false);
            fileInputRef.current?.click();
          }}
          onRemove={() => removeFormRef.current?.requestSubmit()}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
