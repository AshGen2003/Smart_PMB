/**
 * `/signup` — role picker: with four self-registerable roles (farmer,
 * mill owner, warehouse manager, transport operator), this replaces
 * hardcoding a specific role's signup link everywhere. Purely a static
 * landing page — each card links to its own dedicated form/route, which
 * still works standalone for deep-linking/bookmarking.
 */
import Link from "next/link";
import { Sprout, Factory, Warehouse, Truck, ShoppingCart } from "lucide-react";
import AuthShell from "../AuthShell";
import formStyles from "../AuthForm.module.css";
import styles from "./RolePicker.module.css";
import clsx from "clsx";

const ROLES = [
  {
    href: "/signup/farmer",
    icon: Sprout,
    label: "Farmer",
    description: "Track harvests, guaranteed prices, and payments.",
  },
  {
    href: "/signup/mill-owner",
    icon: Factory,
    label: "Mill Owner",
    description: "Apply for licenses and submit milling reports.",
  },
  {
    href: "/signup/warehouse-manager",
    icon: Warehouse,
    label: "Warehouse Manager",
    description: "Manage stock, intake, and capacity alerts.",
  },
  {
    href: "/signup/transport-operator",
    icon: Truck,
    label: "Transport Operator",
    description: "Manage the vehicle fleet, drivers, and deliveries.",
  },
  {
    href: "/signup/authorized-purchaser",
    icon: ShoppingCart,
    label: "Authorized Purchaser",
    description: "Record rice purchase requests against warehouse stock.",
  },
];

export default function SignupRolePickerPage() {
  return (
    <AuthShell>
      <div className={clsx(formStyles.card, formStyles.cardWide)}>
        <h1 className={formStyles.title}>Create your account</h1>
        <p className={formStyles.subtitle}>Choose the role that best describes you.</p>

        <div className={styles.grid}>
          {ROLES.map(({ href, icon: Icon, label, description }) => (
            <Link key={href} href={href} className={styles.roleCard}>
              <span className={styles.roleIcon}>
                <Icon size={20} />
              </span>
              <span className={styles.roleLabel}>{label}</span>
              <span className={styles.roleDescription}>{description}</span>
            </Link>
          ))}
        </div>

        <p className={formStyles.switchLine}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
