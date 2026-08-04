/**
 * Renders the public trace page's content (not-found state or the full
 * lot journey). Split out from page.tsx (a Server Component) into its own
 * Client Component because it needs useLanguage() for translations.
 */
"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowRight, Sprout, Warehouse } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "./Trace.module.css";

const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

export type TraceData = {
  lot_code: string;
  paddy_type: string | null;
  variety: string | null;
  quantity_kg: string;
  grade: "A" | "B" | "C" | null;
  quality_check: boolean | null;
  harvest_date: string;
  purchase_date: string | null;
  status: string;
  warehouse_name: string | null;
  warehouse_district: string | null;
  farmer_registration_no: string;
  farmer_district: string | null;
};

function Brand() {
  const { t } = useLanguage();
  return (
    <Link href="/" className={styles.brand}>
      <Image src="/logo.png" alt="" width={20} height={20} />
      {t.trace.brand}
    </Link>
  );
}

export default function TraceView({
  data,
  lotCode,
}: {
  data: TraceData | null;
  lotCode: string;
}) {
  const { t } = useLanguage();

  if (!data) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <Brand />
          <div className={styles.notFound}>
            <p className={styles.notFoundTitle}>{t.trace.notFoundTitle}</p>
            <p>
              {t.trace.notFoundBody}{" "}
              <span className={styles.lotCode}>{lotCode}</span>. {t.trace.notFoundSuffix}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Brand />

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              {data.paddy_type ?? t.trace.defaultPaddyType} {t.trace.lotSuffix}
            </h1>
            <span className={styles.lotCode}>{data.lot_code}</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- external Django-served PNG, not a static asset Next can optimize */}
          <img
            src={`${API_URL}/api/public/trace/${data.lot_code}/qr.png`}
            alt={t.trace.qrAlt}
            className={styles.qrImg}
          />
        </div>

        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{t.trace.quantity}</p>
            <p className={styles.statValue}>{Number(data.quantity_kg).toLocaleString()} kg</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{t.trace.grade}</p>
            <p className={styles.statValue}>{data.grade ? `${t.trace.gradePrefix} ${data.grade}` : "—"}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{t.trace.qualityCheck}</p>
            <p className={styles.statValue}>
              <span className={`${styles.badge} ${data.quality_check ? styles.badgeSuccess : styles.badgeNeutral}`}>
                {data.quality_check ? t.trace.passed : "—"}
              </span>
            </p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>{t.trace.variety}</p>
            <p className={styles.statValue}>{data.variety || "—"}</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.trace.journeyTitle}</h2>
          <div className={styles.journey}>
            <div className={styles.journeyNode}>
              <span className={styles.journeyNodeLabel}>
                <Sprout size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                {t.trace.grownIn}
              </span>
              <span className={styles.journeyNodeValue}>{data.farmer_district ?? t.trace.defaultCountry}</span>
            </div>
            <ArrowRight size={16} className={styles.journeyArrow} />
            <div className={styles.journeyNode}>
              <span className={styles.journeyNodeLabel}>
                <Warehouse size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                {t.trace.collectedAt}
              </span>
              <span className={styles.journeyNodeValue}>
                {data.warehouse_name ?? "—"}
                {data.warehouse_district ? `, ${data.warehouse_district}` : ""}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.trace.verifiedSourceTitle}</h2>
          <p style={{ margin: 0, color: "var(--foreground)" }}>
            {t.trace.farmerRegistration} <strong>{data.farmer_registration_no}</strong>
            {data.farmer_district ? ` · ${data.farmer_district} ${t.trace.districtSuffix}` : ""}
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.trace.timelineTitle}</h2>
          <p style={{ margin: 0, color: "var(--foreground)" }}>
            {t.trace.submitted} {format(new Date(data.harvest_date), "MMM d, yyyy")}
            {data.purchase_date && ` · ${t.trace.purchased} ${format(new Date(data.purchase_date), "MMM d, yyyy")}`}
          </p>
        </div>

        <div className={styles.footer}>{t.trace.footer}</div>
      </div>
    </div>
  );
}
