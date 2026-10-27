"use client";

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
import { useLanguage } from "./components/LanguageProvider";
import styles from "./LandingPage.module.css";

const FEATURE_ICONS = [Sprout, QrCode, Warehouse, Factory, Truck, BrainCircuit];

export default function LandingPage() {
  const { t } = useLanguage();

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
            {t.hero.eyebrow}
          </span>
          <h1 className={styles.heroTitle}>
            {t.hero.titleBefore}
            <span className={styles.heroTitleAccent}>{t.hero.titleAccent}</span>
            {t.hero.titleAfter}
          </h1>
          <p className={styles.heroSubtitle}>{t.hero.subtitle}</p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.btnPrimary}>
              {t.hero.loginCta}
              <ArrowRight size={16} />
            </Link>
            <Link href="/signup/farmer" className={styles.btnSecondary}>
              {t.hero.farmerCta}
            </Link>
            <Link href="/signup/partner" className={styles.btnSecondary}>
              {t.hero.partnerCta}
            </Link>
          </div>
        </div>

        <a href="#about" className={styles.scrollCue} aria-label={t.hero.scrollAria}>
          <ChevronDown size={18} />
        </a>
      </section>

      <section id="about" className={styles.section}>
        <div className={`${styles.blob} ${styles.blobPrimary}`} />
        <div className={styles.sectionInner}>
          <div className={styles.aboutGrid}>
            <Reveal>
              <p className={styles.sectionEyebrow}>{t.about.eyebrow}</p>
              <h2 className={styles.sectionHeading}>{t.about.heading}</h2>
              <p className={styles.sectionSubheading}>{t.about.body}</p>

              <div className={styles.statRow}>
                {t.about.stats.map((item, i) => (
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
            <p className={styles.sectionEyebrow}>{t.features.eyebrow}</p>
            <h2 className={styles.sectionHeading}>{t.features.heading}</h2>
            <p className={styles.sectionSubheading}>{t.features.subheading}</p>
          </Reveal>

          <div className={styles.featureGrid}>
            {t.features.items.map(({ title, text }, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <Reveal delay={i * 70} key={title}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>
                      <Icon size={22} />
                    </div>
                    <h3 className={styles.featureTitle}>{title}</h3>
                    <p className={styles.featureText}>{text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="get-started" className={`${styles.section} ${styles.ctaSection}`}>
        <div className={`${styles.blob} ${styles.blobAccent}`} />
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.ctaBand}>
              <div>
                <p className={styles.sectionEyebrow}>{t.cta.eyebrow}</p>
                <h2 className={styles.ctaHeading}>{t.cta.heading}</h2>
                <p className={styles.ctaSubheading}>{t.cta.subheading}</p>
              </div>
              <div className={styles.ctaActions}>
                <Link href="/login" className={styles.btnPrimary}>
                  <LogIn size={16} />
                  {t.cta.login}
                </Link>
                <Link href="/signup/farmer" className={styles.btnSecondary}>
                  {t.cta.farmer}
                </Link>
                <Link href="/signup/partner" className={styles.btnSecondary}>
                  {t.cta.partner}
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
            <p className={styles.footerTagline}>{t.footer.tagline}</p>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerLinkGroup}>
              <h4>{t.footer.platformHeading}</h4>
              <a href="#about">{t.footer.about}</a>
              <a href="#features">{t.footer.features}</a>
              <a href="#get-started">{t.footer.getStarted}</a>
              <Link href="/transparency">{t.footer.transparency}</Link>
            </div>
            <div className={styles.footerLinkGroup}>
              <h4>{t.footer.accessHeading}</h4>
              <Link href="/login">{t.footer.login}</Link>
              <Link href="/signup/farmer">{t.footer.farmerSignup}</Link>
              <Link href="/signup/partner">{t.footer.partnerSignup}</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          &copy; {new Date().getFullYear()} Smart PMB — {t.footer.copyright}
        </div>
      </footer>
    </div>
  );
}
