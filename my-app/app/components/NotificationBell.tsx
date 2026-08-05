/**
 * Notification bell shown in the navbar (Header.tsx): polls the current
 * user's message inbox, shows an unread-count badge, and lets them
 * compose a new message from the same dropdown — a farmer or driver can
 * only send a "request" to the admin/officer team, while staff
 * (admin/officer) can message any specific user.
 *
 * Client Component: polling + a dropdown need `useEffect`/`useState`, so
 * this can't be a Server Component.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Send } from "lucide-react";
import clsx from "clsx";
import StyledSelect from "./StyledSelect";
import { SkeletonRows } from "./Skeleton";
import { useLanguage } from "./LanguageProvider";
import styles from "./NotificationBell.module.css";

type MessageRow = {
  id: number;
  sender: string;
  sender_name: string | null;
  sender_role: string | null;
  recipient: string | null;
  recipient_name: string | null;
  target_role: "admin" | "pmb_officer" | null;
  target_role_label: string | null;
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

// Every active session polls this on its own timer indefinitely while the
// app is open, so this interval directly sets the server's steady-state
// request load — 15s was needlessly aggressive for something that doesn't
// need to feel instant; 45s still reads as "live" to a user while cutting
// request volume 3x.
const POLL_INTERVAL_MS = 45_000;

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
  restrictedCompose,
  messagesHref,
  previewing = false,
  notifyMessages = true,
}: {
  // True for farmer/driver accounts: compose can only send a request to
  // the admin team (recipient=null), not pick a specific user.
  restrictedCompose: boolean;
  // Where the "View all" link goes — differs per portal (/messages,
  // /farmer/messages, /driver/messages).
  messagesHref: string;
  previewing?: boolean;
  // Settings → Notifications → "Message alerts". Off just mutes polling
  // and the unread badge — compose still works, and /messages is unaffected.
  notifyMessages?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [recipients, setRecipients] = useState<RecipientOption[] | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [targetRole, setTargetRole] = useState<"admin" | "pmb_officer">("admin");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unreadCount = messages?.filter((m) => !m.is_read).length ?? 0;

  // Poll the inbox — skipped during Portal Preview (the previewed role's
  // inbox has no meaning for the real admin's own JWT-authenticated account
  // underneath, see route.ts's matching guard) and while the user has
  // turned message alerts off in Settings.
  useEffect(() => {
    if (previewing || !notifyMessages) return;
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
  }, [previewing, notifyMessages]);

  // Lazily load the recipient picker the first time a staff member opens
  // the dropdown, rather than on every page load.
  useEffect(() => {
    if (previewing || restrictedCompose || !open || recipients) return;
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
  }, [previewing, restrictedCompose, open, recipients]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      // The recipient StyledSelect's option list is portaled to
      // document.body (see StyledSelect.tsx), so it's never a DOM
      // descendant of wrapRef even while "logically" part of this
      // dropdown — without this check, clicking a recipient registers as
      // an outside click and closes the whole panel before the click's
      // own selection can run, silently discarding it.
      if (target instanceof Element && target.closest("[data-styled-select-panel]")) return;
      setOpen(false);
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

  async function markAllRead() {
    setMarkingAllRead(true);
    // Optimistic — the next poll (or a failed call below) reconciles it
    // either way, same tolerance as the single markRead() above.
    setMessages((prev) => prev?.map((m) => ({ ...m, is_read: true })) ?? prev);
    try {
      await fetch("/api/messages/mark-all-read", { method: "POST" });
    } catch {
      // Best-effort, same as markRead() — the next poll will show any
      // messages that didn't actually get marked read server-side.
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (!restrictedCompose && !recipientId) {
      setSendError(t.messagesHistory.chooseRecipient);
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
          recipient: restrictedCompose ? null : recipientId,
          target_role: restrictedCompose ? targetRole : undefined,
          body: trimmed,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSendError(data.body?.[0] || data.recipient?.[0] || data.detail || t.messagesHistory.failedToSend);
        return;
      }
      setBody("");
      setRecipientId("");
      setSendSuccess(true);
    } catch {
      setSendError(t.messagesHistory.failedConnection);
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
        aria-label={t.notificationBell.ariaLabel}
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
            {t.notificationBell.messagesHeader}
            {!previewing && (
              <div className={styles.headerActions}>
                {notifyMessages && messages !== null && (
                  <button
                    type="button"
                    className={styles.markAllReadLink}
                    onClick={markAllRead}
                    disabled={markingAllRead || unreadCount === 0}
                  >
                    {markingAllRead ? t.notificationBell.markingAllRead : t.notificationBell.markAllRead}
                  </button>
                )}
                <Link
                  href={messagesHref}
                  className={styles.viewAllLink}
                  onClick={() => setOpen(false)}
                >
                  {t.notificationBell.viewAll}
                </Link>
              </div>
            )}
          </div>

          {previewing ? (
            <p className={styles.previewNote}>{t.notificationBell.previewNote}</p>
          ) : (
            <>
              {!notifyMessages ? (
                <p className={styles.previewNote}>
                  {t.notificationBell.mutedNotePrefix} <Link href={messagesHref}>{t.notificationBell.mutedNoteLink}</Link>.
                </p>
              ) : (
              <div className={styles.list}>
                {messages === null ? (
                  <SkeletonRows count={3} />
                ) : messages.length === 0 ? (
                  <p className={styles.emptyState}>{t.notificationBell.noMessagesYet}</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={clsx(styles.messageRow, !m.is_read && styles.messageUnread)}
                    >
                      <div className={styles.messageMeta}>
                        <span className={styles.messageSender}>
                          {m.sender_name || t.messagesHistory.unknownSender}
                          {m.sender_role && (
                            <span className={styles.messageSenderRole}> · {m.sender_role}</span>
                          )}
                          {m.recipient === null && (
                            <span className={styles.requestBadge}>
                              {t.messagesHistory.requestTo} {m.target_role_label ?? t.messagesHistory.roleAdmin}
                            </span>
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
                          {t.messagesHistory.markRead}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              )}

              <div className={styles.composeArea}>
                <p className={styles.composeLabel}>
                  {restrictedCompose ? t.messagesHistory.composeLabelFarmer : t.messagesHistory.composeLabelStaff}
                </p>

                {sendError && <div className={styles.composeError}>{sendError}</div>}
                {sendSuccess && <div className={styles.composeSuccess}>{t.messagesHistory.sent}</div>}

                {restrictedCompose ? (
                  <StyledSelect
                    compact
                    value={targetRole}
                    onChange={(v) => setTargetRole(v as "admin" | "pmb_officer")}
                    options={[
                      { value: "admin", label: t.messagesHistory.roleAdmin },
                      { value: "pmb_officer", label: t.messagesHistory.roleOfficer },
                    ]}
                  />
                ) : (
                  <StyledSelect
                    compact
                    value={recipientId}
                    onChange={setRecipientId}
                    placeholder={t.messagesHistory.selectUserPlaceholder}
                    options={(recipients ?? []).map((r) => ({ value: r.id, label: `${r.full_name} (${r.role_name})` }))}
                  />
                )}

                <textarea
                  className={styles.composeInput}
                  placeholder={restrictedCompose ? t.messagesHistory.bodyPlaceholderFarmer : t.messagesHistory.bodyPlaceholderStaff}
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
                  {sending ? t.messagesHistory.sending : t.messagesHistory.send}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
