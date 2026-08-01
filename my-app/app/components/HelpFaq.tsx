/**
 * Shared Help Center / FAQ content rendered by (admin)/help, farmer/help,
 * and driver/help — one component so the three portal-specific pages don't
 * each hand-maintain their own copy of the shared "Account & Notifications"
 * section. Plain accordion via native <details>/<summary> (styled in
 * HelpFaq.module.css), so no client-side state is needed for this page.
 */
import styles from "./HelpFaq.module.css";

type FaqItem = { q: string; a: string };
type FaqSection = { title: string; items: FaqItem[] };

const COMMON_SECTION: FaqSection = {
  title: "Account & notifications",
  items: [
    {
      q: "How do I change my password or profile picture?",
      a: "Go to Settings → Account. Setting a new password requires entering your current one first, as a safeguard in case your session was left open on a shared device.",
    },
    {
      q: "How do I switch between light and dark mode?",
      a: "Use the sun/moon icon in the top header, or the theme switch under Settings → Appearance — both control the same setting and stay in sync.",
    },
    {
      q: "How do notifications work, and how do I turn them off?",
      a: "The bell icon in the header alerts you when someone sends you a message or request. Go to Settings → Notifications to turn message alerts off — you can still send and read messages either way, you just won't get the badge/alert. Farmers have a second toggle there for harvest-status updates.",
    },
    {
      q: "How do I contact someone directly?",
      a: "Click the bell icon for a quick note, or open Messages from the sidebar for the full history and a larger compose box.",
    },
  ],
};

const ROLE_SECTIONS: Record<"farmer" | "driver" | "admin" | "partner", FaqSection> = {
  farmer: {
    title: "For farmers",
    items: [
      {
        q: "What do the harvest statuses on my dashboard mean?",
        a: "Pending — your officer has recorded the delivery but hasn't reviewed it yet. Verified — it's been approved and graded, and payment is now pending. Collected — the paddy has been moved to a warehouse and payment is complete. Rejected — the submission wasn't accepted; contact your PMB officer if you're not sure why.",
      },
      {
        q: "Who records my harvest delivery?",
        a: "Your PMB officer logs each delivery when you bring paddy in, including its grade, moisture level, and unit price — there's no separate self-submission form on your end.",
      },
      {
        q: "How will I know when my payment status changes?",
        a: "You'll get a notification on your dashboard each time a submission is approved, rejected, or collected, as long as harvest-status notifications are turned on in Settings.",
      },
    ],
  },
  driver: {
    title: "For drivers",
    items: [
      {
        q: "What's the difference between Vehicle Details and Vehicle Log?",
        a: "Vehicle Details shows the fixed information about the vehicle assigned to you (type, capacity, registration). Vehicle Log is where you record trip-by-trip activity.",
      },
    ],
  },
  partner: {
    title: "For authorized purchasers & mill owners",
    items: [
      {
        q: "Why can't I access anything yet?",
        a: "Your account exists, but an officer or admin still needs to review and approve your licensing application before you get real access. You'll get an email as soon as a decision is made.",
      },
      {
        q: "How do I check on my application?",
        a: "Log in and you'll see its current status (pending or, if it wasn't approved, the reason) — there's nothing further to submit unless an officer contacts you directly via Messages.",
      },
    ],
  },
  admin: {
    title: "For officers & admins",
    items: [
      {
        q: "Where do I approve, reject, or mark a harvest as collected?",
        a: "The Approvals page. Approving requires setting a grade, moisture level, and unit price first, which is what calculates the farmer's payment amount.",
      },
      {
        q: "What's the difference between Warehouses, Pricing, and Transportation?",
        a: "Warehouses tracks storage locations and their current stock. Pricing manages the guaranteed price per kg for each paddy type. Transportation covers the vehicle fleet, drivers, and deliveries between warehouses.",
      },
      {
        q: "What is Preview Portal?",
        a: "A way to see the app exactly as another role would (real pages, not a mockup) without actually logging in as them — useful for checking what a role can and can't do before handing out that role to someone. All actions are read-only and use sample data, so nothing real gets touched.",
      },
      {
        q: "Where can I see system errors or audit activity?",
        a: "The Maintenance page has separate tabs for the audit log (who did what) and an Errors tab (unhandled exceptions the system has logged).",
      },
      {
        q: "How do I control what a role can see or do?",
        a: "Roles lets you edit each role's permission set directly. The same checklist is mirrored, read-only, inside Preview Portal for a quick reference while you're looking at what that role actually sees.",
      },
    ],
  },
};

export function HelpFaq({ role }: { role: "farmer" | "driver" | "admin" | "partner" }) {
  const sections = [ROLE_SECTIONS[role], COMMON_SECTION];

  return (
    <div className={styles.page}>
      {sections.map((section) => (
        <div className={styles.section} key={section.title}>
          <p className={styles.sectionTitle}>{section.title}</p>
          {section.items.map((item) => (
            <details className={styles.item} key={item.q}>
              <summary className={styles.question}>{item.q}</summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}
