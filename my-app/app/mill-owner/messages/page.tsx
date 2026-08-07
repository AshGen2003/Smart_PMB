/**
 * `/mill-owner/messages` — the mill owner portal's counterpart to
 * `(admin)/messages`: the full paginated history of requests a mill owner
 * has sent to the admin/officer team and the replies they've received.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MessagesHistoryView, { type MessageRow } from "@/app/components/MessagesHistoryView";

/** Server Component: gates access and fetches the first page of message history for a fast initial paint. */
export default async function MillOwnerMessagesPage() {
  const user = await requirePermission("view_messages");

  // Portal Preview never fetches real data — the previewed role's inbox has
  // no meaning for the real admin's own JWT-authenticated account
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
      isFarmer
      initialMessages={data.results}
      initialHasMore={data.next !== null}
    />
  );
}
