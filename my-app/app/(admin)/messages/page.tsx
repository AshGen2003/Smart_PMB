/**
 * `/messages` — the full paginated message history behind the
 * notification bell's "View all" link (see components/NotificationBell.tsx,
 * which only shows the most recent 50, unpaginated). Requires
 * `view_messages` — granted to every role by default (see the
 * accounts/0015 migration), toggleable per role from /roles or the Preview
 * Portal's quick-toggle checklist.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MessagesHistoryView, { type MessageRow } from "@/app/components/MessagesHistoryView";

/** Server Component: gates access and fetches the first page of message history for a fast initial paint. */
export default async function MessagesPage() {
  const user = await requirePermission("view_messages");

  // Portal Preview never fetches real data — the previewed role's inbox
  // has no meaning for the real admin's own JWT-authenticated account
  // underneath (see NotificationBell.tsx for the same guard).
  if (user.previewing) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Messaging isn&apos;t available while previewing.
      </div>
    );
  }

  const res = await apiFetch("/api/messages/history/?page=1");
  const data: { count: number; next: string | null; results: MessageRow[] } = res.ok
    ? await res.json()
    : { count: 0, next: null, results: [] };

  return (
    <MessagesHistoryView
      isFarmer={false}
      initialMessages={data.results}
      initialHasMore={data.next !== null}
    />
  );
}
