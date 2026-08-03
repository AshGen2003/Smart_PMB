/**
 * `/transparency` — public (no login required) aggregate stats: total
 * paddy purchased, guaranteed price trends, and warehouse/district/farmer
 * coverage. Backed by GET /api/public/transparency/, which only ever
 * returns aggregate numbers — no per-farmer or per-harvest data.
 */
import Link from "next/link";
import Image from "next/image";
import { MapPin, Sprout, Warehouse } from "lucide-react";
import TransparencyCharts from "./TransparencyCharts";
import styles from "./Transparency.module.css";

const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

type TransparencyData = {
  year: number;
  total_purchased_kg: number;
  monthly_volume: { period: string; quantity_kg: number }[];
  price_by_paddy_type: { paddy_type: string; average_price: number; current_price: number }[];
  active_warehouse_count: number;
  district_count: number;
  registered_farmer_count: number;
};

export default async function TransparencyPage() {
  const res = await fetch(`${API_URL}/api/public/transparency/`, {
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <Image src="/logo.png" alt="" width={20} height={20} /> Smart PMB
          </Link>
          <p>Transparency data is temporarily unavailable. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  const data = (await res.json()) as TransparencyData;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <Image src="/logo.png" alt="" width={20} height={20} /> Smart PMB
        </Link>

        <div className={styles.header}>
          <h1 className={styles.title}>Public Transparency Report</h1>
          <p className={styles.subtitle}>
            Aggregate, anonymized figures on how much paddy Smart PMB has
            purchased and at what guaranteed prices in {data.year}. No
            individual farmer or transaction data is ever shown here.
          </p>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>
              <Sprout size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Total Purchased ({data.year})
            </p>
            <p className={styles.kpiValue}>{Math.round(data.total_purchased_kg).toLocaleString()} kg</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>
              <Warehouse size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Active Warehouses
            </p>
            <p className={styles.kpiValue}>{data.active_warehouse_count}</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>
              <MapPin size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Districts Covered
            </p>
            <p className={styles.kpiValue}>{data.district_count}</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Registered Farmers</p>
            <p className={styles.kpiValue}>{data.registered_farmer_count.toLocaleString()}</p>
          </div>
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Purchase Volume (last 12 weeks)</h2>
            <TransparencyCharts monthlyVolume={data.monthly_volume} />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Guaranteed Prices (12-month average)</h2>
            {data.price_by_paddy_type.length > 0 ? (
              <div className={styles.priceList}>
                {data.price_by_paddy_type.map((p) => (
                  <div className={styles.priceRow} key={p.paddy_type}>
                    <span className={styles.priceType}>{p.paddy_type}</span>
                    <span className={styles.priceValue}>Rs. {p.average_price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No published paddy prices yet.</p>
            )}
          </div>
        </div>

        <p className={styles.footer}>
          Figures update roughly every 15 minutes. For farmer, purchaser, or
          mill accounts, see the <Link href="/">Smart PMB home page</Link>.
        </p>
      </div>
    </div>
  );
}
