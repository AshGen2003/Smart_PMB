/**
 * Shared "Messages" page used by both the admin/officer route
 * (`(admin)/messages/page.tsx`) and the farmer route
 * (`farmer/messages/page.tsx`): the full paginated message history behind
 * the notification bell's "View all" link (NotificationBell.tsx only shows
 * the most recent 50, unpaginated), plus an All/Unread filter and the same
 * compose box the bell has.
 */
"use client";

import { useState } from "react";
import clsx from "clsx";
import { Loader2, Send } from "lucide-react";
import StyledSelect from "./StyledSelect";
import { SkeletonRows } from "./Skeleton";
import { useLanguage } from "./LanguageProvider";
import styles from "./MessagesHistoryView.module.css";

export type MessageRow = {
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

type Filter = "all" | "unread";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchPage(filter: Filter, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (filter === "unread") params.set("unread", "1");
  const res = await fetch(`/api/messages/history?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load messages");
  return (await res.json()) as { count: number; next: string | null; results: MessageRow[] };
}

export default function MessagesHistoryView({
  isFarmer,
  initialMessages,
  initialHasMore,
}: {
  isFarmer: boolean;
  initialMessages: MessageRow[];
  initialHasMore: boolean;
}) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const [messages, setMessages] = useState(initialMessages);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recipients, setRecipients] = useState<RecipientOption[] | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [targetRole, setTargetRole] = useState<"admin" | "pmb_officer">("admin");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  async function handleFilterChange(next: Filter) {
    if (next === filter) return;
    setFilter(next);
    setSwitching(true);
    setLoadError(null);
    try {
      const data = await fetchPage(next, 1);
      setMessages(data.results);
      setPage(1);
      setHasMore(data.next !== null);
    } catch {
      setLoadError(t.messagesHistory.failedToLoad);
    } finally {
      setSwitching(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    setLoadError(null);
    try {
      const data = await fetchPage(filter, page + 1);
      setMessages((prev) => [...prev, ...data.results]);
      setPage((p) => p + 1);
      setHasMore(data.next !== null);
    } catch {
      setLoadError(t.messagesHistory.failedToLoadMore);
    } finally {
      setLoadingMore(false);
    }
  }

  function markRead(id: number) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
    fetch(`/api/messages/${id}/read`, { method: "POST" }).catch(() => {
      // Best-effort — a failed mark-read just gets retried next time the
      // user clicks it; not worth surfacing an error for.
    });
  }

  function loadRecipientsIfNeeded() {
    if (isFarmer || recipients) return;
    fetch("/api/messages/recipients", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RecipientOption[]) => setRecipients(data))
      .catch(() => setRecipients([]));
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (!isFarmer && !recipientId) {
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
          recipient: isFarmer ? null : recipientId,
          target_role: isFarmer ? targetRole : undefined,
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

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t.messagesHistory.title}</h1>
          <p className={styles.pageSubtitle}>
            {isFarmer ? t.messagesHistory.subtitleFarmer : t.messagesHistory.subtitleStaff}
          </p>
        </div>
      </div>

      <div className={styles.composeCard}>
        <p className={styles.composeLabel}>
          {isFarmer ? t.messagesHistory.composeLabelFarmer : t.messagesHistory.composeLabelStaff}
        </p>

        {sendError && <div className={styles.banner}>{sendError}</div>}
        {sendSuccess && <div className={styles.bannerSuccess}>{t.messagesHistory.sent}</div>}

        {isFarmer ? (
          <StyledSelect
            value={targetRole}
            onChange={(v) => setTargetRole(v as "admin" | "pmb_officer")}
            options={[
              { value: "admin", label: t.messagesHistory.roleAdmin },
              { value: "pmb_officer", label: t.messagesHistory.roleOfficer },
            ]}
          />
        ) : (
          <StyledSelect
            value={recipientId}
            onFocus={loadRecipientsIfNeeded}
            onChange={setRecipientId}
            placeholder={t.messagesHistory.selectUserPlaceholder}
            options={(recipients ?? []).map((r) => ({ value: r.id, label: `${r.full_name} (${r.role_name})` }))}
          />
        )}

        <textarea
          className={styles.composeInput}
          placeholder={isFarmer ? t.messagesHistory.bodyPlaceholderFarmer : t.messagesHistory.bodyPlaceholderStaff}
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

      <div className={styles.container}>
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={clsx(styles.tab, filter === "all" && styles.tabActive)}
            onClick={() => handleFilterChange("all")}
          >
            {t.messagesHistory.allTab}
          </button>
          <button
            type="button"
            className={clsx(styles.tab, filter === "unread" && styles.tabActive)}
            onClick={() => handleFilterChange("unread")}
          >
            {t.messagesHistory.unreadTab}
            {unreadCount > 0 && <span className={styles.tabCount}>{unreadCount}</span>}
          </button>
        </div>

        {loadError && <div className={styles.banner}>{loadError}</div>}

        {switching ? (
          <SkeletonRows count={5} />
        ) : messages.length === 0 ? (
          <p className={styles.emptyState}>
            {filter === "unread" ? t.messagesHistory.noUnread : t.messagesHistory.noMessages}
          </p>
        ) : (
          <div className={styles.list}>
            {messages.map((m) => (
              <div key={m.id} className={clsx(styles.messageRow, !m.is_read && styles.messageUnread)}>
                <div className={styles.messageMeta}>
                  <span className={styles.messageSender}>
                    {m.sender_name || t.messagesHistory.unknownSender}
                    {m.sender_role && <span className={styles.messageSenderRole}> · {m.sender_role}</span>}
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
                  <button type="button" className={styles.markReadBtn} onClick={() => markRead(m.id)}>
                    {t.messagesHistory.markRead}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {hasMore && !switching && (
          <button type="button" className={styles.loadMoreBtn} disabled={loadingMore} onClick={loadMore}>
            {loadingMore && <Loader2 size={14} className={styles.spin} />}
            {loadingMore ? t.messagesHistory.loading : t.messagesHistory.loadMore}
          </button>
        )}
      </div>
    </div>
  );
}
