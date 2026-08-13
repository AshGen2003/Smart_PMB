/**
 * Zoomed-in preview of the current profile picture, opened by clicking the
 * avatar in ProfilePictureUploader.tsx. Offers the three things you'd
 * actually want to do with it: open it full-size in a new tab, replace it,
 * or remove it (behind ConfirmModal, since removal can't be undone once
 * the old file is deleted server-side — see SelfProfileSerializer.save()).
 */
"use client";

import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import styles from "./ProfilePictureModal.module.css";

export default function ProfilePictureModal({
  imageUrl,
  removing,
  onReplace,
  onRemove,
  onClose,
}: {
  imageUrl: string;
  removing: boolean;
  onReplace: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  return (
    <div className={styles.overlay} onClick={removing ? undefined : onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={removing}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Profile" className={styles.previewImage} />

        <div className={styles.actions}>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
          >
            <ExternalLink size={16} /> View full size
          </a>
          <button type="button" className={styles.actionBtn} onClick={onReplace} disabled={removing}>
            <RefreshCw size={16} /> Replace
          </button>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => setConfirmingRemove(true)}
            disabled={removing}
          >
            {removing ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
            Remove
          </button>
        </div>
      </div>

      {confirmingRemove && (
        <ConfirmModal
          title="Remove profile picture?"
          message="This can't be undone — you'll need to upload a new one to have an avatar again."
          confirmLabel="Remove"
          pendingLabel="Removing…"
          variant="danger"
          pending={removing}
          onConfirm={onRemove}
          onClose={() => setConfirmingRemove(false)}
        />
      )}
    </div>
  );
}
