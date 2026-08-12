/**
 * Fallback dashboard shown to admin/officer users who don't have the
 * `manage_users` or `monitor_operations` permissions (e.g. narrower roles
 * such as record_purchases-only officers). Everything here is placeholder
 * mock data — it's a generic "coming soon" style overview, not a real
 * data-backed panel.
 *
 * Client Component (needs useState/useEffect and browser-only chart
 * rendering via recharts).
 */
"use client";

import React, { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { 
  Users, 
  Home, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { format } from "date-fns";
import clsx from "clsx";
import { SkeletonDashboard } from "@/app/components/Skeleton";
import ChartLegend from "@/app/components/ChartLegend";

// Mock data — this component is a static placeholder and does not fetch
// anything from the backend.
const REVENUE_DATA = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 5500 },
  { name: 'Jul', value: 7000 },
];

const PAYMENT_DATA = [
  { name: 'Paid', value: 75, color: '#10b981' },
  { name: 'Pending', value: 15, color: '#f59e0b' },
  { name: 'Overdue', value: 10, color: '#ef4444' },
];

const LEGEND_STYLE = {
  wrapperStyle: { fontSize: 12, color: "var(--text-muted)" },
  iconType: "circle" as const,
  iconSize: 8,
};

const RECENT_TRANSACTIONS = [
  { id: 'TRX-101', resident: 'Alice Smith', unit: 'A-102', amount: '$1,200', status: 'paid', date: '2026-07-01' },
  { id: 'TRX-102', resident: 'Bob Johnson', unit: 'B-205', amount: '$950', status: 'pending', date: '2026-07-02' },
  { id: 'TRX-103', resident: 'Charlie Davis', unit: 'C-304', amount: '$1,400', status: 'overdue', date: '2026-06-28' },
  { id: 'TRX-104', resident: 'Diana Evans', unit: 'A-105', amount: '$1,200', status: 'paid', date: '2026-07-03' },
];

const ACTIVE_TICKETS = [
  { id: 'REQ-50', issue: 'Leaking Faucet', unit: 'B-205', priority: 'medium', status: 'in progress' },
  { id: 'REQ-51', issue: 'AC Not Cooling', unit: 'C-304', priority: 'high', status: 'to do' },
  { id: 'REQ-52', issue: 'Broken Blinds', unit: 'D-101', priority: 'low', status: 'to do' },
];

/** Renders placeholder KPI cards, charts (recharts), and tables of mock data. */
export default function GenericDashboard() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  // Defer rendering the date/charts until after the client has mounted so
  // the server-rendered HTML (which has no "current date") matches the
  // first client render, then swap in the real content.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setCurrentDate(format(new Date(), "EEEE, MMMM do, yyyy"));
  }, []);

  // Avoid hydration mismatch on charts — show a matching skeleton instead of
  // a blank flash until the client has mounted.
  if (!mounted) return <SkeletonDashboard />;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back, Admin</h1>
        <span className={styles.subtitle}>{currentDate}</span>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Users</span>
            <div className={styles.kpiIcon}><Users size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>1,248</h2>
          <div className={clsx(styles.kpiTrend, styles.trendUp)}>
            <TrendingUp size={16} /> <span>+4% this month</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Occupied Units</span>
            <div className={styles.kpiIcon}><Home size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>85%</h2>
          <div className={clsx(styles.kpiTrend, styles.trendUp)}>
            <TrendingUp size={16} /> <span>+2% this month</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Monthly Revenue</span>
            <div className={styles.kpiIcon}><DollarSign size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>$142,500</h2>
          <div className={clsx(styles.kpiTrend, styles.trendDown)}>
            <TrendingDown size={16} /> <span>-1.5% this month</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Pending Requests</span>
            <div className={styles.kpiIcon}><AlertTriangle size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>24</h2>
          <div className={clsx(styles.kpiTrend, styles.trendUp)}>
            <TrendingUp size={16} /> <span>+8 from yesterday</span>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Revenue Trends (Last 7 Months)</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={REVENUE_DATA} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Legend {...LEGEND_STYLE} />
                <Line type="monotone" dataKey="value" name="Revenue" stroke="var(--primary)" strokeWidth={3} dot={{ fill: 'var(--accent)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Payment Status</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PAYMENT_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {PAYMENT_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend items={PAYMENT_DATA.map((entry) => ({ label: entry.name, color: entry.color }))} />
        </div>
      </div>

      <div className={styles.tablesGrid}>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Transactions</h3>
            <a href="/payments" className={styles.viewAll}>View All</a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Resident</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_TRANSACTIONS.map((trx) => (
                <tr key={trx.id}>
                  <td>
                    <div>{trx.resident}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{trx.unit}</div>
                  </td>
                  <td>{trx.amount}</td>
                  <td>
                    <span className={clsx(styles.badge, styles[`badge-${trx.status === 'paid' ? 'success' : trx.status === 'pending' ? 'warning' : 'danger'}`])}>
                      {trx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Active Maintenance</h3>
            <a href="/maintenance" className={styles.viewAll}>View All</a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Issue</th>
                <th>Unit</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVE_TICKETS.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.issue}</td>
                  <td>{ticket.unit}</td>
                  <td>
                    <span className={clsx(styles.badge, styles[`badge-${ticket.priority === 'low' ? 'success' : ticket.priority === 'medium' ? 'warning' : 'danger'}`])}>
                      {ticket.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
