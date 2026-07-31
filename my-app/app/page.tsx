import Image from "next/image";
import Link from "next/link";
import {
  Sprout,
  QrCode,
  Warehouse,
  Factory,
  Truck,
  BrainCircuit,
  ArrowRight,
  LogIn,
  ChevronDown,
} from "lucide-react";
import LandingNav from "./components/LandingNav";
import Reveal from "./components/Reveal";
import styles from "./LandingPage.module.css";

const FEATURES = [
  {
    icon: Sprout,
    title: "Farmer Dashboard",
    text: "Submit harvests, view guaranteed prices, and track paddy sales and payments in real time.",
  },
  {
    icon: QrCode,
    title: "Digital Purchasing",
    text: "Purchase approvals, transaction verification, and QR-based digital receipts for every sale.",
  },
  {
    icon: Warehouse,
    title: "Warehouse Management",
    text: "Real-time inventory tracking, capacity monitoring, and spoilage reporting across depots.",
  },
  {
    icon: Factory,
    title: "Rice Mill Management",
    text: "License applications, inspection records, and milling reports in one place.",
  },
  {
    icon: Truck,
    title: "Transport & Logistics",
    text: "Vehicle assignments, GPS delivery tracking, and route monitoring for every shipment.",
  },
  {
    icon: BrainCircuit,
    title: "AI Analytics",
    text: "Price forecasting, yield prediction, crop disease detection, and nationwide reporting.",
  },
];

const BEFORE_AFTER = [
  { before: "Manual paperwork", after: "Digital records for every transaction" },
  { before: "Delayed farmer payments", after: "Real-time payment tracking" },
  { before: "Disconnected systems", after: "One connected platform, nationwide" },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingNav />

      <section className={styles.hero}>
        <Image
          src="/images/hero-paddy.jpg"
          alt="Golden-hour aerial view of green paddy terraces"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            Digital Paddy Ecosystem for Sri Lanka
          </span>
          <h1 className={styles.heroTitle}>
            One platform connecting every step of the{" "}
            <span className={styles.heroTitleAccent}>paddy journey</span>
          </h1>
          <p className={styles.heroSubtitle}>
            From the farmer&apos;s field to the warehouse floor, Smart PMB
            brings guaranteed pricing, digital purchasing, and AI-powered
            insights to Sri Lanka&apos;s paddy purchasing network.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.btnPrimary}>
              Log in
              <ArrowRight size={16} />
            </Link>
            <Link href="/signup" className={styles.btnSecondary}>
              Create an account
            </Link>
          </div>
        </div>

        <a href="#about" className={styles.scrollCue} aria-label="Scroll to learn more">
          <ChevronDown size={18} />
        </a>
      </section>

      <section id="about" className={styles.section}>
        <div className={`${styles.blob} ${styles.blobPrimary}`} />
        <div className={styles.sectionInner}>
          <div className={styles.aboutGrid}>
            <Reveal>
              <p className={styles.sectionEyebrow}>Overview</p>
              <h2 className={styles.sectionHeading}>
                Modernizing how Sri Lanka grows, sells, and moves paddy
              </h2>
              <p className={styles.sectionSubheading}>
                Sri Lanka&apos;s paddy sector still depends heavily on manual
                paperwork and disconnected workflows. Farmers struggle to get
                real-time guaranteed prices, track sales, or reach purchasing
                centers, while PMB officers face difficulty monitoring
                nationwide stock, warehouses, and rice mill licensing. Smart
                PMB replaces that patchwork with one centralized system —
                mobile apps, web dashboards, AI-powered analytics, and a
                secure database working together to make every step
                transparent and traceable.
              </p>

              <div className={styles.statRow}>
                {BEFORE_AFTER.map((item, i) => (
                  <Reveal delay={120 + i * 90} key={item.before}>
                    <div className={styles.statCard}>
                      <p className={styles.statBefore}>{item.before}</p>
                      <p className={styles.statAfter}>{item.after}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className={styles.aboutImageWrap}>
                <Image
                  src="/images/about-paddy-srilanka.jpg"
                  alt="Terraced paddy fields in Sri Lanka"
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className={styles.aboutImage}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="features" className={styles.section}>
        <div className={styles.sectionInner}>
          <Reveal>
            <p className={styles.sectionEyebrow}>Features</p>
            <h2 className={styles.sectionHeading}>
              Every module the paddy supply chain needs
            </h2>
            <p className={styles.sectionSubheading}>
              Purpose-built modules for farmers, purchasers, mills,
              warehouses, logistics, and nationwide analytics — all under one
              roof.
            </p>
          </Reveal>

          <div className={styles.featureGrid}>
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal delay={i * 70} key={title}>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon size={22} />
                  </div>
                  <h3 className={styles.featureTitle}>{title}</h3>
                  <p className={styles.featureText}>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="get-started" className={`${styles.section} ${styles.ctaSection}`}>
        <div className={`${styles.blob} ${styles.blobAccent}`} />
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.ctaBand}>
              <div>
                <p className={styles.sectionEyebrow}>Get started</p>
                <h2 className={styles.ctaHeading}>
                  One secure sign-in for every role
                </h2>
                <p className={styles.ctaSubheading}>
                  Farmers, PMB officers, purchasers, and administrators all
                  sign in from the same place — you&apos;ll land on the
                  dashboard built for your role automatically.
                </p>
              </div>
              <div className={styles.ctaActions}>
                <Link href="/login" className={styles.btnPrimary}>
                  <LogIn size={16} />
                  Log in
                </Link>
                <Link href="/signup/farmer" className={styles.btnSecondary}>
                  Register as a Farmer
                </Link>
                <Link href="/signup/mill-owner" className={styles.btnSecondary}>
                  Register as a Mill Owner
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerBrand}>
              <Image src="/logo.png" alt="" width={24} height={24} />
              <span>Smart PMB</span>
            </div>
            <p className={styles.footerTagline}>
              A digital ecosystem platform connecting farmers, purchasers,
              mills, warehouses, and logistics across Sri Lanka&apos;s paddy
              industry.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerLinkGroup}>
              <h4>Platform</h4>
              <a href="#about">About</a>
              <a href="#features">Features</a>
              <a href="#get-started">Get started</a>
            </div>
            <div className={styles.footerLinkGroup}>
              <h4>Access</h4>
              <Link href="/login">Log in</Link>
              <Link href="/signup">Sign up</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          &copy; {new Date().getFullYear()} Smart PMB — Digital Paddy
          Ecosystem for Sri Lanka.
        </div>
      </footer>
    </div>
  );
}
