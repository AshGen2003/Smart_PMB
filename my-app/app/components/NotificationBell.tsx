/**
 * Notification bell shown in the navbar (Header.tsx): polls the current
 * user's message inbox, shows an unread-count badge, and lets them
 * compose a new message from the same dropdown — a farmer can only send a
 * "request" to the admin/officer team, while staff (admin/officer) can
 * message any specific user.
 *
 * Client Component: polling + a dropdown need `useEffect`/`useState`, so
 * this can't be a Server Component.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Send } from "lucide-react";
import clsx from "clsx";
import styles from "./NotificationBell.module.css";

type MessageRow = {
  id: number;
  sender: string;
  sender_name: string | null;
  sender_role: string | null;
  recipient: string | null;
  recipient_name: string | null;
  body: string;
  created_at: string;
  is_read: boolean;
};

type RecipientOption = {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
};

const POLL_INTERVAL_MS = 15_000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Renders the bell icon, unread badge, and the dropdown panel (inbox list
 * + compose box). `previewing` disables real data/actions entirely — see
 * app/api/messages/inbox/route.ts for why preview never calls it.
 */
export default function NotificationBell({
  isFarmer,
  previewing = false,
}: {
  isFarmer: boolean;
  previewing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [recipients, setRecipients] = useState<RecipientOption[] | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unreadCount = messages?.filter((m) => !m.is_read).length ?? 0;

  // Poll the inbox — skipped entirely during Portal Preview, since the
  // previewed role's inbox has no meaning for the real admin's own
  // JWT-authenticated account underneath (see route.ts's matching guard).
  useEffect(() => {
    if (previewing) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/messages/inbox", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: MessageRow[] = await res.json();
        if (!cancelled) setMessages(data);
      } catch {
        // Transient network hiccups just skip a tick — the next poll retries.
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [previewing]);

  // Lazily load the recipient picker the first time a staff member opens
  // the dropdown, rather than on every page load.
  useEffect(() => {
    if (previewing || isFarmer || !open || recipients) return;
    let cancelled = false;

    fetch("/api/messages/recipients", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RecipientOption[]) => {
        if (!cancelled) setRecipients(data);
      })
      .catch(() => {
        if (!cancelled) setRecipients([]);
      });

    return () => {
      cancelled = true;
    };
  }, [previewing, isFarmer, open, recipients]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function markRead(id: number) {
    setMessages((prev) => prev?.map((m) => (m.id === id ? { ...m, is_read: true } : m)) ?? prev);
    fetch(`/api/messages/${id}/read`, { method: "POST" }).catch(() => {
      // Best-effort — a failed mark-read just gets retried next time the
      // user clicks it; not worth surfacing an error for.
    });
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (!isFarmer && !recipientId) {
      setSendError("Choose who to send this to.");
      return;
    }

    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: isFarmer ? null : recipientId,
          body: trimmed,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSendError(data.body?.[0] || data.recipient?.[0] || data.detail || "Failed to send.");
        return;
      }
      setBody("");
      setRecipientId("");
      setSendSuccess(true);
    } catch {
      setSendError("Failed to send. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHeader}>
            Messages
            {!previewing && (
              <Link
                href={isFarmer ? "/farmer/messages" : "/messages"}
                className={styles.viewAllLink}
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            )}
          </div>

          {previewing ? (
            <p className={styles.previewNote}>Messaging isn&apos;t available while previewing.</p>
          ) : (
            <>
              <div className={styles.list}>
                {messages === null ? (
                  <p className={styles.emptyState}>Loading…</p>
                ) : messages.length === 0 ? (
                  <p className={styles.emptyState}>No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={clsx(styles.messageRow, !m.is_read && styles.messageUnread)}
                    >
                      <div className={styles.messageMeta}>
                        <span className={styles.messageSender}>
                          {m.sender_name || "Unknown"}
                          {m.sender_role && (
                            <span className={styles.messageSenderRole}> · {m.sender_role}</span>
                          )}
                          {m.recipient === null && (
                            <span className={styles.requestBadge}>Request</span>
                          )}
                        </span>
                        <span className={styles.messageTime}>{formatTime(m.created_at)}</span>
                      </div>
                      <p className={styles.messageBody}>{m.body}</p>
                      {!m.is_read && (
                        <button
                          type="button"
                          className={styles.markReadBtn}
                          onClick={() => markRead(m.id)}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className={styles.composeArea}>
                <p className={styles.composeLabel}>
                  {isFarmer ? "Send a request to Admin" : "Message a user"}
                </p>

                {sendError && <div className={styles.composeError}>{sendError}</div>}
                {sendSuccess && <div className={styles.composeSuccess}>Sent.</div>}

                {!isFarmer && (
                  <select
                    className={styles.recipientSelect}
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                  >
                    <option value="">Select a user…</option>
                    {(recipients ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name} ({r.role_name})
                      </option>
                    ))}
                  </select>
                )}

                <textarea
                  className={styles.composeInput}
                  placeholder={isFarmer ? "Describe what you need help with…" : "Write a message…"}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                />

                <button
                  type="button"
                  className={styles.sendBtn}
                  disabled={sending || !body.trim()}
                  onClick={handleSend}
                >
                  {sending ? <Loader2 size={14} className={styles.spin} /> : <Send size={14} />}
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
