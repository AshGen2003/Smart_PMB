/**
 * Shared Help Center / FAQ content rendered by (admin)/help, farmer/help,
 * and driver/help — one component so the three portal-specific pages don't
 * each hand-maintain their own copy of the shared "Account & Notifications"
 * section. Plain accordion via native <details>/<summary> (styled in
 * HelpFaq.module.css). Client Component (for useLanguage()) since the
 * common section and the farmer section are translated; the other roles'
 * sections aren't yet (see ROLE_SECTIONS) and stay in English regardless
 * of language.
 */
"use client";

import { useLanguage } from "./LanguageProvider";
import styles from "./HelpFaq.module.css";

type FaqItem = { q: string; a: string };
type FaqSection = { title: string; items: FaqItem[] };

const ROLE_SECTIONS: Record<"driver" | "warehouse_manager" | "admin" | "partner", FaqSection> = {
  driver: {
    title: "For drivers",
    items: [
      {
        q: "What's the difference between Vehicle Details and Vehicle Log?",
        a: "Vehicle Details shows the fixed information about the vehicle assigned to you (type, capacity, registration). Vehicle Log is where you record trip-by-trip activity.",
      },
    ],
  },
  warehouse_manager: {
    title: "For warehouse managers",
    items: [
      {
        q: "Why can I only see one warehouse?",
        a: "Your account is tied to the single warehouse a PMB officer has appointed you to manage. If that assignment changes, what you see here updates automatically.",
      },
      {
        q: "Can I add or remove stock myself?",
        a: "No — this view is read-only. Stock changes (harvest collections, manual adjustments) are recorded by PMB officers; you'll always see the current totals here.",
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

export function HelpFaq({ role }: { role: "farmer" | "driver" | "warehouse_manager" | "admin" | "partner" }) {
  const { t } = useLanguage();

  // The common section is translated for every role. Per-role sections are
  // only translated for farmers so far — other roles keep ROLE_SECTIONS'
  // static English content regardless of language.
  const commonSection: FaqSection = {
    title: t.helpFaqCommon.title,
    items: [
      { q: t.helpFaqCommon.q1, a: t.helpFaqCommon.a1 },
      { q: t.helpFaqCommon.q2, a: t.helpFaqCommon.a2 },
      { q: t.helpFaqCommon.q3, a: t.helpFaqCommon.a3 },
      { q: t.helpFaqCommon.q4, a: t.helpFaqCommon.a4 },
    ],
  };
  const roleSection: FaqSection =
    role === "farmer"
      ? {
          title: t.helpFaqFarmer.title,
          items: [
            { q: t.helpFaqFarmer.q1, a: t.helpFaqFarmer.a1 },
            { q: t.helpFaqFarmer.q2, a: t.helpFaqFarmer.a2 },
            { q: t.helpFaqFarmer.q3, a: t.helpFaqFarmer.a3 },
          ],
        }
      : ROLE_SECTIONS[role];

  const sections = [roleSection, commonSection];

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
