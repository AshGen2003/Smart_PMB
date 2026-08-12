/**
 * Shared "Messages" page used by both the admin/officer route
 * (`(admin)/messages/page.tsx`) and the farmer route
 * (`farmer/messages/page.tsx`): the full paginated message history behind
 * the notification bell's "View all" link (NotificationBell.tsx only shows
 * the most recent 50, unpaginated), plus an All/Unread filter and the same
 * compose box the bell has.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, Search, Send } from "lucide-react";
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

async function fetchPage(filter: Filter, page: number, search: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (filter === "unread") params.set("unread", "1");
  if (search.trim()) params.set("q", search.trim());
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
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  // Debounced copy of `search` — what's actually been sent to the server.
  // Keeps every keystroke from firing its own request while still updating
  // the input instantly.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const [recipients, setRecipients] = useState<RecipientOption[] | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [targetRole, setTargetRole] = useState<"admin" | "pmb_officer">("admin");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  async function loadFirstPage(nextFilter: Filter, nextSearch: string) {
    setSwitching(true);
    setLoadError(null);
    try {
      const data = await fetchPage(nextFilter, 1, nextSearch);
      setMessages(data.results);
      setPage(1);
      setHasMore(data.next !== null);
    } catch {
      setLoadError(t.messagesHistory.failedToLoad);
    } finally {
      setSwitching(false);
    }
  }

  function handleFilterChange(next: Filter) {
    if (next === filter) return;
    setFilter(next);
    loadFirstPage(next, appliedSearch);
  }

  // Debounce raw typing into `appliedSearch` — only actually re-fetches
  // once typing pauses for 350ms, not on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setAppliedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Skips the very first run (mount) so it doesn't redundantly re-fetch the
  // initialMessages the server already fetched — only fires when
  // appliedSearch actually changes to something new afterward.
  const skipNextSearchEffect = useRef(true);
  useEffect(() => {
    if (skipNextSearchEffect.current) {
      skipNextSearchEffect.current = false;
      return;
    }
    loadFirstPage(filter, appliedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only appliedSearch changing should retrigger this; filter changes go through handleFilterChange instead
  }, [appliedSearch]);

  async function loadMore() {
    setLoadingMore(true);
    setLoadError(null);
    try {
      const data = await fetchPage(filter, page + 1, appliedSearch);
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
    fetch(`/api/messages/${id}/read`, { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {
        // Best-effort — a failed mark-read just gets retried next time the
        // user clicks it; not worth surfacing an error for.
      });
  }

  // router.refresh() here (and in markRead above) re-runs the (admin)
  // layout's server-side unread count — the sidebar's dot is computed
  // once when that layout mounts and otherwise never re-checks itself
  // just because this page's own client state changed.
  async function markAllRead() {
    setMarkingAllRead(true);
    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
    try {
      await fetch("/api/messages/mark-all-read", { method: "POST" });
      router.refresh();
    } catch {
      // Best-effort, same as markRead() above.
    } finally {
      setMarkingAllRead(false);
    }
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
        <div className={styles.toolbarRow}>
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
            <button
              type="button"
              className={styles.markAllReadBtn}
              onClick={markAllRead}
              disabled={markingAllRead || unreadCount === 0}
            >
              {markingAllRead ? t.notificationBell.markingAllRead : t.notificationBell.markAllRead}
            </button>
          </div>

          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t.messagesHistory.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loadError && <div className={styles.banner}>{loadError}</div>}

        {switching ? (
          <SkeletonRows count={5} />
        ) : messages.length === 0 ? (
          <p className={styles.emptyState}>
            {appliedSearch
              ? t.messagesHistory.noSearchResults
              : filter === "unread"
              ? t.messagesHistory.noUnread
              : t.messagesHistory.noMessages}
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
