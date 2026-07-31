/**
 * `/transport-operator/messages` — the transport-operator-portal
 * counterpart to `/messages`: the full paginated message history. Not
 * restricted like farmer/driver/mill-owner — a transport operator is
 * staff and can message a specific user, same as PMB Officer.
 */
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MessagesHistoryView, { type MessageRow } from "@/app/components/MessagesHistoryView";

export default async function TransportOperatorMessagesPage() {
  const user = await requireUser();

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
