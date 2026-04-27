"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo-mark";

// ─── Translations ─────────────────────────────────────────────────────────────

type Lang = "cs" | "en";
type T = Record<string, string>;

const TRANSLATIONS: Record<Lang, T> = {
  cs: {
    // NAV
    "nav-competitions": "Soutěže",
    "nav-results": "Výsledky",
    "nav-login": "Přihlásit se",
    "nav-register": "Registrovat zdarma",
    // HERO
    "hero-pill": "Správa taneční soutěže",
    "hero-h1-a": "Vše pro taneční soutěž",
    "hero-h1-b": "na jednom místě.",
    "hero-sub":
      "ProPodium za vás vyřeší registraci, platby i počítání výsledků. Vy se můžete soustředit na tanečníky a atmosféru v sále.",
    "hero-cta1": "Registrovat zdarma",
    "hero-cta2": "Jak to funguje",
    "hero-check-1": "Skating systém",
    "hero-check-2": "Kategorie na míru",
    "hero-check-3": "Výsledky online ihned",
    // ROLES
    "roles-title": "Jeden systém pro každého.",
    "role-org-title": "Organizátor",
    "role-org-sub": "Klid v přípravě",
    "role-org-1": "Vytvoříte soutěž za pár minut a hned sbíráte přihlášky",
    "role-org-2": "Přehled o platbách a počtu párů v kategoriích",
    "role-org-3": "Diplomy pro vítěze vytisknete na jeden klik",
    "role-scr-title": "Sčitatel",
    "role-scr-sub": "Hladký průběh",
    "role-scr-1":
      "Žádné počítání v ruce – systém okamžitě a přesně vyhodnotí i ty nejsložitější remízy.",
    "role-scr-2": "Jedním tlačítkem otevírá další kola",
    "role-scr-3": "Na vše důležité ho systém upozorní včas",
    "role-jud-title": "Rozhodčí",
    "role-jud-sub": "Jednoduché bodování",
    "role-jud-1": "Boduje se přímo v prohlížeči v mobilu",
    "role-jud-2": "Funguje i při výpadku internetu — data se odešlou po připojení",
    "role-jud-3": "Systém ohlídá správný počet křížků za vás",
    "role-dan-title": "Tanečník",
    "role-dan-sub": "Okamžitý servis",
    "role-dan-1": "Přihlášení do soutěže bez nutnosti cokoli instalovat",
    "role-dan-2": "Výsledky vidí na mobilu hned, po ukončení kola",
    "role-dan-3": "Ve svém přehledu má všechny své soutěže, výsledky i vývoj výkonnosti",
    // FEATURES
    "feat-eyebrow": "Kompletní platforma",
    "feat-title": "Vše, co soutěž potřebuje.",
    "feat-desc": "Od přihlášek až po diplomy — na jednom místě, bez zbytečných nástrojů navíc.",
    "feat-1-title": "Rychlý check-in",
    "feat-1-desc": "Odbavte tanečníky u vstupu během pár sekund pomocí tabletu nebo mobilu.",
    "feat-2-title": "Harmonogram online",
    "feat-2-desc": "Mějte časový plán neustále aktuální a dostupný pro všechny účastníky.",
    "feat-3-title": "Finance pod kontrolou",
    "feat-3-desc": "Sledujte náklady a příjmy soutěže v reálném čase na jednom místě.",
    "feat-4-title": "Hromadná komunikace",
    "feat-4-desc": "Posílejte e-maily tanečníkům přímo ze systému — přihlášky, změny, výsledky.",
    "feat-5-title": "Analytika a přehledy",
    "feat-5-desc": "Po soutěži získáte jasná data o účasti a výkonnosti tanečníků.",
    "feat-6-title": "Živé výsledky",
    "feat-6-desc": "Tanečníci i diváci sledují postup soutěže v reálném čase na vlastním telefonu.",
    // SECURITY
    "sec-eyebrow": "Bezpečnost a spolehlivost",
    "sec-title": "Vaše data jsou u nás jako v bavlnce.",
    "sec-desc":
      "Nemusíte být expert na právo ani IT. My se staráme o to, aby vše běželo podle předpisů.",
    "sec-1-title": "V souladu s GDPR",
    "sec-1-desc": "Osobní údaje tanečníků jsou v bezpečí a zpracováváme je podle evropských pravidel.",
    "sec-2-title": "Nic se neztratí",
    "sec-2-desc":
      "Každé kliknutí rozhodčího i admina se zaznamenává. Máte tak stoprocentní jistotu správnosti výsledků.",
    "sec-3-title": "Připojení na jeden kód",
    "sec-3-desc": "Rozhodčí se připojí naskenováním QR kódu a hesla.",
    // CTA
    "cta-eyebrow": "Připraveni začít?",
    "cta-title-a": "Uspořádejte svou příští",
    "cta-title-b": "soutěž v klidu.",
    "cta-desc": "Zbavte se chaosu a papírování. Začněte používat systém, který tanci rozumí.",
    "cta-btn": "Chci nezávaznou ukázku",
    // FOOTER
    "footer-competitions": "Soutěže",
    "footer-gdpr": "Zpracování osobních údajů",
    "footer-copy": "© 2026 ProPodium. Navrženo pro tanec.",
  },
  en: {
    // NAV
    "nav-competitions": "Competitions",
    "nav-results": "Results",
    "nav-login": "Log in",
    "nav-register": "Get started free",
    // HERO
    "hero-pill": "Dance competition management",
    "hero-h1-a": "Everything for a dance competition",
    "hero-h1-b": "in one place.",
    "hero-sub":
      "ProPodium handles registration, payments, and result calculation for you. Focus on the dancers and the atmosphere.",
    "hero-cta1": "Get started free",
    "hero-cta2": "How it works",
    "hero-check-1": "Skating system",
    "hero-check-2": "Custom categories",
    "hero-check-3": "Results online instantly",
    // ROLES
    "roles-title": "One system for everyone.",
    "role-org-title": "Organizer",
    "role-org-sub": "Peace of mind in preparation",
    "role-org-1": "Create a competition in minutes and start collecting entries immediately",
    "role-org-2": "Overview of payments and number of pairs in each category",
    "role-org-3": "Print diplomas for winners with a single click",
    "role-scr-title": "Scrutineer",
    "role-scr-sub": "Smooth operation",
    "role-scr-1":
      "No manual counting — the system instantly and accurately resolves even the most complex ties.",
    "role-scr-2": "Open the next round with one button",
    "role-scr-3": "The system notifies you of anything important in time",
    "role-jud-title": "Adjudicator",
    "role-jud-sub": "Simple scoring",
    "role-jud-1": "Score directly in the browser on your phone",
    "role-jud-2": "Works even without internet — data is sent once reconnected",
    "role-jud-3": "The system checks the correct number of marks for you",
    "role-dan-title": "Dancer",
    "role-dan-sub": "Instant service",
    "role-dan-1": "Register for a competition without installing anything",
    "role-dan-2": "See results on your phone immediately after each round",
    "role-dan-3": "Your profile shows all competitions, results, and performance history",
    // FEATURES
    "feat-eyebrow": "Complete platform",
    "feat-title": "Everything a competition needs.",
    "feat-desc": "From registrations to diplomas — in one place, without extra tools.",
    "feat-1-title": "Fast check-in",
    "feat-1-desc": "Check in dancers at the entrance in seconds using a tablet or phone.",
    "feat-2-title": "Live schedule",
    "feat-2-desc": "Keep the timetable up to date and accessible online for all participants.",
    "feat-3-title": "Finance overview",
    "feat-3-desc": "Track competition costs and revenue in real time, all in one place.",
    "feat-4-title": "Bulk communication",
    "feat-4-desc": "Send emails to dancers directly from the system — confirmations, changes, results.",
    "feat-5-title": "Analytics & reports",
    "feat-5-desc": "After the event, get clear data on attendance and dancer performance.",
    "feat-6-title": "Live results",
    "feat-6-desc": "Dancers and spectators follow competition progress in real time on their phones.",
    // SECURITY
    "sec-eyebrow": "Security & reliability",
    "sec-title": "Your data is safe with us.",
    "sec-desc":
      "You don't need to be a legal or IT expert. We take care of keeping everything running according to regulations.",
    "sec-1-title": "GDPR compliant",
    "sec-1-desc": "Dancers' personal data is secure and processed according to European regulations.",
    "sec-2-title": "Nothing is lost",
    "sec-2-desc":
      "Every click by an adjudicator or admin is recorded. You have 100% confidence in the accuracy of results.",
    "sec-3-title": "Connect with one code",
    "sec-3-desc": "Adjudicators join by scanning a QR code — no password needed.",
    // CTA
    "cta-eyebrow": "Ready to start?",
    "cta-title-a": "Run your next competition",
    "cta-title-b": "without the chaos.",
    "cta-desc": "Leave the chaos and paperwork behind. Start using a system built for dance.",
    "cta-btn": "Request a free demo",
    // FOOTER
    "footer-competitions": "Competitions",
    "footer-gdpr": "Privacy Policy",
    "footer-copy": "© 2026 ProPodium. Built for dance.",
  },
};

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

const CheckSvgSmall = ({ stroke }: { stroke: string }) => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 6.5L4.5 9L10 3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeroCheckSvg = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path d="M1.5 4L3.5 6L6.5 2" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, [threshold]);
  return scrolled;
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("visible");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
    );
    document.querySelectorAll<HTMLElement>(".reveal").forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 0.08}s`;
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [lang, setLang] = useState<Lang>("cs");
  const scrolled = useScrolled();
  useReveal();

  const toggle = useCallback(() => setLang((l) => (l === "cs" ? "en" : "cs")), []);
  const t = (k: string) => TRANSLATIONS[lang][k] ?? k;

  return (
    <>
      <style>{CSS}</style>

      <nav aria-label="Hlavní navigace" className={scrolled ? "lp-nav scrolled" : "lp-nav"}>
        <Link href="/" className="lp-nav-logo">
          <LogoMark size={24} />
          <span>ProPodium</span>
        </Link>

        <ul className="lp-nav-links" role="list">
          <li><Link href="/competitions">{t("nav-competitions")}</Link></li>
          <li><Link href="/competitions">{t("nav-results")}</Link></li>
        </ul>

        {/* Soutěže — center on mobile, hidden on desktop (nav-links handles it) */}
        <Link href="/competitions" className="lp-nav-competitions-btn">{t("nav-competitions")}</Link>

        <div className="lp-nav-right">
          <button className="lp-lang-btn" onClick={toggle} aria-label="Switch language">
            {lang === "cs" ? "EN" : "CS"}
          </button>
          <Link href="/login" className="lp-btn-primary">{t("nav-login")}</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" aria-labelledby="lp-hero-h">
        <div className="lp-hero-content">
          <h1 id="lp-hero-h" className="lp-a0">
            {t("hero-h1-a")}<br />
            <em>{t("hero-h1-b")}</em>
          </h1>

          <p className="lp-hero-sub lp-a1">{t("hero-sub")}</p>

          <div className="lp-hero-actions lp-a2">
            <a href="#roles" className="lp-btn-hero-s">{t("hero-cta2")}</a>
          </div>

          <div className="lp-hero-checks lp-a3" role="list">
            {(["hero-check-1", "hero-check-2", "hero-check-3"] as const).map((k) => (
              <div key={k} className="lp-hcheck" role="listitem">
                <span className="lp-hcheck-dot" aria-hidden="true"><HeroCheckSvg /></span>
                {t(k)}
              </div>
            ))}
          </div>
        </div>

        <div className="lp-hero-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="lp-roles" aria-labelledby="lp-roles-h">
        <div className="lp-roles-header reveal">
          <h2 className="lp-sec-title" id="lp-roles-h">{t("roles-title")}</h2>
        </div>

        <div className="lp-roles-grid reveal">
          <RoleCard
            color="blue"
            strokeColor="#6366f1"
            iconBg="rgba(99,102,241,.1)"
            iconBorder="rgba(99,102,241,.2)"
            icon={<path d="M3 4h18v18H3V4zm0 6h18M8 2v4M16 2v4" />}
            title={t("role-org-title")}
            sub={t("role-org-sub")}
            items={[t("role-org-1"), t("role-org-2"), t("role-org-3")]}
          />
          <RoleCard
            color="green"
            strokeColor="#059669"
            iconBg="rgba(5,150,105,.08)"
            iconBorder="rgba(5,150,105,.2)"
            icon={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>}
            title={t("role-scr-title")}
            sub={t("role-scr-sub")}
            items={[t("role-scr-1"), t("role-scr-2"), t("role-scr-3")]}
          />
          <RoleCard
            color="amber"
            strokeColor="#d97706"
            iconBg="rgba(217,119,6,.08)"
            iconBorder="rgba(217,119,6,.2)"
            icon={<><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>}
            title={t("role-jud-title")}
            sub={t("role-jud-sub")}
            items={[t("role-jud-1"), t("role-jud-2"), t("role-jud-3")]}
          />
          <RoleCard
            color="rose"
            strokeColor="#e11d48"
            iconBg="rgba(225,29,72,.08)"
            iconBorder="rgba(225,29,72,.18)"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>}
            title={t("role-dan-title")}
            sub={t("role-dan-sub")}
            items={[t("role-dan-1"), t("role-dan-2"), t("role-dan-3")]}
          />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-feat-section" aria-labelledby="lp-feat-h">
        <div className="lp-sec-header reveal">
          <span className="lp-eyebrow">{t("feat-eyebrow")}</span>
          <h2 className="lp-sec-title" id="lp-feat-h">{t("feat-title")}</h2>
          <p className="lp-sec-desc">{t("feat-desc")}</p>
        </div>
        <div className="lp-feat-grid reveal">
          <FeatBlock
            title={t("feat-1-title")}
            desc={t("feat-1-desc")}
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>}
          />
          <FeatBlock
            title={t("feat-2-title")}
            desc={t("feat-2-desc")}
            icon={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>}
          />
          <FeatBlock
            title={t("feat-3-title")}
            desc={t("feat-3-desc")}
            icon={<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>}
          />
          <FeatBlock
            title={t("feat-4-title")}
            desc={t("feat-4-desc")}
            icon={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>}
          />
          <FeatBlock
            title={t("feat-5-title")}
            desc={t("feat-5-desc")}
            icon={<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>}
          />
          <FeatBlock
            title={t("feat-6-title")}
            desc={t("feat-6-desc")}
            icon={<><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></>}
          />
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="security" className="lp-security" aria-labelledby="lp-sec-h">
        <div className="lp-sec-header reveal">
          <span className="lp-eyebrow">{t("sec-eyebrow")}</span>
          <h2 className="lp-sec-title" id="lp-sec-h">{t("sec-title")}</h2>
          <p className="lp-sec-desc">{t("sec-desc")}</p>
        </div>
        <div className="lp-sec-cols reveal">
          <SecBlock
            title={t("sec-1-title")}
            desc={t("sec-1-desc")}
            icon={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
          />
          <SecBlock
            title={t("sec-2-title")}
            desc={t("sec-2-desc")}
            icon={<><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" /></>}
          />
          <SecBlock
            title={t("sec-3-title")}
            desc={t("sec-3-desc")}
            icon={<><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><path d="M21 16h-3v3M21 21v.01M12 7v3M12 3v.01M12 12h.01M7 12h3" /></>}
          />
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="lp-cta-section">
        <div className="lp-cta-box reveal">
          <div className="lp-cta-inner">
            <span className="lp-eyebrow">{t("cta-eyebrow")}</span>
            <h2>{t("cta-title-a")}<br />{t("cta-title-b")}</h2>
            <p>{t("cta-desc")}</p>
            <a href="mailto:info@propodium.cz" className="lp-btn-cta-g">{t("cta-btn")}</a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <Link href="/" className="lp-footer-logo">
            <LogoMark size={20} />
            ProPodium
          </Link>
          <ul className="lp-footer-links" role="list">
            <li><Link href="/competitions">{t("footer-competitions")}</Link></li>
            <li><Link href="/privacy">{t("footer-gdpr")}</Link></li>
          </ul>
          <p className="lp-footer-copy">{t("footer-copy")}</p>
          <button className="lp-lang-btn lp-footer-lang-btn" onClick={toggle} aria-label="Switch language">
            {lang === "cs" ? "EN" : "CS"}
          </button>
        </div>
      </footer>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleCard({
  color, strokeColor, iconBg, iconBorder, icon, title, sub, items,
}: {
  color: "blue" | "green" | "amber" | "rose";
  strokeColor: string;
  iconBg: string;
  iconBorder: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  items: string[];
}) {
  return (
    <div className={`lp-role-card lp-c-${color}`}>
      <div
        className="lp-role-icon"
        style={{ background: iconBg, border: `1.5px solid ${iconBorder}` }}
        aria-hidden="true"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <h3>{title}</h3>
      <p className="lp-role-sub">{sub}</p>
      <ul className="lp-role-list">
        {items.map((item, i) => (
          <li key={i}>
            <span className="lp-li-d" aria-hidden="true"><CheckSvgSmall stroke={strokeColor} /></span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatBlock({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="lp-feat-block">
      <div className="lp-feat-ico" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function SecBlock({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="lp-sec-block">
      <div className="lp-sec-ico" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  .lp-nav, .lp-hero, .lp-roles, .lp-feat-section, .lp-security,
  .lp-cta-section, .lp-footer, .lp-footer * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  @keyframes lp-fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: none; }
  }
  .lp-a0 { animation: lp-fadeUp .9s cubic-bezier(.16,1,.3,1) both; }
  .lp-a1 { animation: lp-fadeUp .9s cubic-bezier(.16,1,.3,1) .1s both; }
  .lp-a2 { animation: lp-fadeUp .9s cubic-bezier(.16,1,.3,1) .22s both; }
  .lp-a3 { animation: lp-fadeUp .9s cubic-bezier(.16,1,.3,1) .34s both; }

  .reveal {
    opacity: 0; transform: translateY(20px);
    transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1);
  }
  .reveal.visible { opacity: 1; transform: none; }

  /* ── NAV ── */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 56px; display: flex; align-items: center;
    justify-content: space-between; padding: 0 28px;
    transition: background .25s, box-shadow .25s, border-color .25s;
    border-bottom: 1px solid transparent;
  }
  .lp-nav.scrolled {
    background: rgba(255,255,255,.92);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom-color: #e5e7eb;
    box-shadow: 0 1px 0 #e5e7eb;
  }
  .lp-nav-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: .9rem; font-weight: 600; letter-spacing: -.025em;
    color: #fff; text-decoration: none; transition: opacity .2s, color .25s;
  }
  .lp-nav-logo:hover { opacity: .65; }
  .lp-nav.scrolled .lp-nav-logo { color: #0f0f14; }

  .lp-nav-links {
    position: absolute; left: 50%; transform: translateX(-50%);
    display: flex; list-style: none; margin: 0; padding: 0;
  }
  .lp-nav-links a {
    display: block; padding: 4px 14px; font-size: .82rem; font-weight: 400;
    color: rgba(255,255,255,.55); text-decoration: none; transition: color .15s; letter-spacing: -.01em;
  }
  .lp-nav-links a:hover { color: #fff; }
  .lp-nav.scrolled .lp-nav-links a { color: #6b7280; }
  .lp-nav.scrolled .lp-nav-links a:hover { color: #0f0f14; }

  .lp-nav-right { display: flex; gap: 8px; align-items: center; }
  .lp-lang-btn {
    padding: 4px 10px; border-radius: 6px; font-size: .75rem; font-weight: 500;
    letter-spacing: .04em; color: rgba(255,255,255,.5); background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.12); cursor: pointer; transition: all .15s;
    font-family: inherit;
  }
  .lp-lang-btn:hover { color: #fff; background: rgba(255,255,255,.15); }
  .lp-nav.scrolled .lp-lang-btn { color: #6b7280; background: #f3f4f6; border-color: #e5e7eb; }
  .lp-nav.scrolled .lp-lang-btn:hover { color: #0f0f14; background: #f9fafb; }

  .lp-btn-ghost {
    padding: 6px 14px; font-size: .82rem; font-weight: 400; letter-spacing: -.01em;
    color: rgba(255,255,255,.55); background: transparent; border: none;
    text-decoration: none; transition: color .15s; cursor: pointer; border-radius: 7px;
  }
  .lp-btn-ghost:hover { color: #fff; }
  .lp-nav.scrolled .lp-btn-ghost { color: #6b7280; }
  .lp-nav.scrolled .lp-btn-ghost:hover { color: #0f0f14; }

  .lp-btn-primary {
    padding: 7px 16px; border-radius: 7px; font-size: .82rem; font-weight: 500;
    letter-spacing: -.01em; background: #fff; color: #0f0f14;
    text-decoration: none; border: none; transition: opacity .15s; cursor: pointer;
  }
  .lp-btn-primary:hover { opacity: .85; }
  .lp-nav.scrolled .lp-btn-primary { background: #0f0f14; color: #fff; }

  /* ── HERO ── */
  .lp-hero {
    min-height: 100vh; position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 130px 24px 140px;
    background: #080810;
  }
  .lp-hero::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,.18) 0%, transparent 70%),
      radial-gradient(ellipse 45% 35% at 80% 85%, rgba(244,114,182,.08) 0%, transparent 60%);
  }
  .lp-hero-wave {
    position: absolute; bottom: -2px; left: 0; right: 0;
    pointer-events: none; line-height: 0;
  }
  .lp-hero-wave svg { display: block; width: 100%; }
  .lp-hero-content { position: relative; z-index: 2; }

  .lp-hero-pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 14px 5px 8px; border-radius: 980px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(99,102,241,.12);
    font-size: .76rem; font-weight: 500; color: #a5b4fc;
    margin-bottom: 32px; letter-spacing: -.01em;
  }
  .lp-pill-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #818cf8; flex-shrink: 0;
  }

  .lp-hero h1 {
    font-size: clamp(2.8rem, 7vw, 6rem);
    font-weight: 800; line-height: 1.04; letter-spacing: -.05em;
    color: #fff; margin: 0 0 24px; max-width: 840px;
  }
  .lp-hero h1 em {
    font-style: normal;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lp-hero-sub {
    font-size: clamp(.92rem, 1.8vw, 1.06rem); font-weight: 400;
    line-height: 1.72; color: rgba(255,255,255,.5); letter-spacing: -.01em;
    max-width: 500px; margin: 0 auto 44px;
  }
  .lp-hero-actions {
    display: flex; gap: 10px; justify-content: center;
    flex-wrap: wrap; margin-bottom: 52px;
  }
  .lp-btn-hero-p {
    padding: 12px 24px; border-radius: 8px; font-size: .9rem; font-weight: 600;
    letter-spacing: -.015em; background: #6366f1; color: #fff;
    text-decoration: none; border: none; transition: all .2s; cursor: pointer;
  }
  .lp-btn-hero-p:hover { background: #4f46e5; box-shadow: 0 4px 20px rgba(99,102,241,.4); }
  .lp-btn-hero-s {
    padding: 12px 24px; border-radius: 8px; font-size: .9rem; font-weight: 400;
    letter-spacing: -.015em; border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.65);
    text-decoration: none; background: rgba(255,255,255,.06); transition: all .2s; cursor: pointer;
  }
  .lp-btn-hero-s:hover { background: rgba(255,255,255,.1); color: #fff; border-color: rgba(255,255,255,.28); }

  .lp-hero-checks { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }
  .lp-hcheck {
    display: flex; align-items: center; gap: 7px;
    font-size: .76rem; color: rgba(255,255,255,.3); letter-spacing: -.01em;
  }
  .lp-hcheck-dot {
    width: 14px; height: 14px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,.2);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  /* ── SHARED SECTION ── */
  .lp-eyebrow {
    display: block; font-size: .7rem; font-weight: 600; letter-spacing: .1em;
    text-transform: uppercase; color: #6366f1; margin-bottom: 14px;
  }
  .lp-sec-title {
    font-size: clamp(1.8rem, 3.5vw, 2.8rem);
    font-weight: 700; letter-spacing: -.04em; line-height: 1.1;
    color: #0f0f14; margin: 0 0 14px;
  }
  .lp-sec-desc {
    font-size: .97rem; color: #6b7280;
    line-height: 1.7; letter-spacing: -.01em; margin: 0;
  }
  .lp-sec-header { max-width: 560px; margin: 0 auto 52px; text-align: center; }

  /* ── ROLES ── */
  .lp-roles { padding: 72px 24px; background: #ffffff; }
  .lp-roles-header { max-width: 560px; margin: 0 auto 56px; text-align: center; }
  .lp-roles-grid {
    max-width: 960px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(2,1fr); gap: 10px;
  }
  .lp-role-card {
    padding: 32px; border-radius: 14px;
    border: 1.5px solid #e5e7eb; background: #ffffff;
    transition: border-color .25s, box-shadow .25s, background .25s;
  }
  .lp-role-card:hover { background: #f9fafb; }
  .lp-c-blue:hover  { border-color: rgba(99,102,241,.35);  box-shadow: 0 4px 32px rgba(99,102,241,.08); }
  .lp-c-green:hover { border-color: rgba(5,150,105,.3);    box-shadow: 0 4px 32px rgba(5,150,105,.06); }
  .lp-c-amber:hover { border-color: rgba(217,119,6,.3);    box-shadow: 0 4px 32px rgba(217,119,6,.06); }
  .lp-c-rose:hover  { border-color: rgba(225,29,72,.3);    box-shadow: 0 4px 32px rgba(225,29,72,.06); }

  .lp-role-icon {
    width: 36px; height: 36px; border-radius: 9px; margin-bottom: 18px;
    display: flex; align-items: center; justify-content: center;
  }
  .lp-role-card h3 {
    font-size: 1rem; font-weight: 600; letter-spacing: -.025em;
    color: #0f0f14; margin: 0 0 4px;
  }
  .lp-role-sub { font-size: .8rem; letter-spacing: -.01em; margin: 0 0 20px; }
  .lp-c-blue  .lp-role-sub { color: #6366f1; }
  .lp-c-green .lp-role-sub { color: #059669; }
  .lp-c-amber .lp-role-sub { color: #d97706; }
  .lp-c-rose  .lp-role-sub { color: #e11d48; }

  .lp-role-list { list-style: none; margin: 0; padding: 0; }
  .lp-role-list li {
    font-size: .84rem; color: #6b7280; line-height: 1.55;
    padding: 8px 0; border-bottom: 1px solid #e5e7eb;
    display: flex; gap: 9px; align-items: flex-start; letter-spacing: -.01em;
  }
  .lp-role-list li:last-child { border-bottom: none; }
  .lp-li-d { flex-shrink: 0; margin-top: 2px; }

  /* ── FEATURES ── */
  .lp-feat-section { padding: 72px 24px; background: #f5f5f7; }
  .lp-feat-grid {
    max-width: 960px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(3,1fr); gap: 12px;
  }
  .lp-feat-block {
    background: #fff; border-radius: 14px; padding: 28px 24px;
    display: flex; flex-direction: column; gap: 12px;
    transition: box-shadow .2s;
  }
  .lp-feat-block:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
  .lp-feat-ico {
    width: 36px; height: 36px; border-radius: 10px; background: rgba(99,102,241,.08);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .lp-feat-block h3 { font-size: .9rem; font-weight: 600; letter-spacing: -.02em; color: #0f0f14; margin: 0; }
  .lp-feat-block p { font-size: .82rem; color: #6b7280; line-height: 1.6; margin: 0; }

  /* ── SECURITY ── */
  .lp-security { padding: 72px 24px; background: #ffffff; }
  .lp-sec-cols {
    max-width: 960px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
  }
  .lp-sec-block {
    padding: 32px; border-radius: 14px;
    border: 1.5px solid #e5e7eb; background: #f9fafb;
    transition: border-color .25s, background .25s, box-shadow .25s;
  }
  .lp-sec-block:hover { background: #fff; border-color: #d1d5db; box-shadow: 0 2px 16px rgba(0,0,0,.05); }
  .lp-sec-ico {
    width: 32px; height: 32px; border-radius: 8px; margin-bottom: 18px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(99,102,241,.08); border: 1.5px solid rgba(99,102,241,.18);
  }
  .lp-sec-block h3 {
    font-size: .94rem; font-weight: 600; letter-spacing: -.02em;
    color: #0f0f14; margin: 0 0 8px;
  }
  .lp-sec-block p { font-size: .83rem; color: #6b7280; line-height: 1.65; letter-spacing: -.01em; margin: 0; }

  /* ── CTA ── */
  .lp-cta-section { padding: 0; }
  .lp-cta-box {
    text-align: center; padding: 100px 40px;
    background: #0f0f14;
    position: relative; overflow: hidden;
  }
  .lp-cta-box::before {
    content: ''; position: absolute; bottom: -80px; left: 50%; transform: translateX(-50%);
    width: 500px; height: 300px;
    background: radial-gradient(ellipse, rgba(99,102,241,.3) 0%, transparent 70%);
    pointer-events: none;
  }
  .lp-cta-box::after {
    content: ''; position: absolute; top: -60px; right: -60px;
    width: 300px; height: 300px;
    background: radial-gradient(ellipse, rgba(244,114,182,.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .lp-cta-inner { position: relative; z-index: 1; max-width: 520px; margin: 0 auto; }
  .lp-cta-inner .lp-eyebrow { color: #a5b4fc; margin-bottom: 16px; }
  .lp-cta-inner h2 {
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 700; letter-spacing: -.04em; line-height: 1.1;
    color: #fff; margin: 0 0 16px;
  }
  .lp-cta-inner p {
    font-size: .97rem; color: rgba(255,255,255,.45);
    line-height: 1.7; letter-spacing: -.01em; margin: 0 0 36px;
  }
  .lp-btn-cta-g {
    display: inline-block;
    padding: 12px 24px; border-radius: 8px; font-size: .9rem; font-weight: 400;
    border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.65);
    background: rgba(255,255,255,.06); text-decoration: none;
    transition: all .2s; cursor: pointer; letter-spacing: -.01em;
  }
  .lp-btn-cta-g:hover { background: rgba(255,255,255,.1); color: rgba(255,255,255,.9); }

  /* ── FOOTER ── */
  .lp-footer { padding: 24px 28px; background: #0f0f14; }
  .lp-footer-inner {
    max-width: 960px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
  }
  .lp-footer-logo {
    display: flex; align-items: center; gap: 7px;
    font-size: .8rem; font-weight: 500; letter-spacing: -.01em;
    color: #9ca3af; text-decoration: none; transition: color .2s;
  }
  .lp-footer-logo:hover { color: #d1d5db; }
  .lp-footer-logo-mark {
    width: 20px; height: 20px; border-radius: 5px;
    background: #6366f1; display: flex; align-items: center; justify-content: center;
  }
  .lp-footer-links { display: flex; gap: 20px; list-style: none; margin: 0; padding: 0; }
  .lp-footer-links a {
    font-size: .76rem; color: #9ca3af;
    text-decoration: none; transition: color .2s; letter-spacing: -.01em;
  }
  .lp-footer-links a:hover { color: #d1d5db; }
  .lp-footer-copy { font-size: .72rem; color: #9ca3af; letter-spacing: -.01em; margin: 0; }

  /* Soutěže — centered absolutely in nav on mobile, hidden on desktop */
  .lp-nav-competitions-btn {
    display: none;
    position: absolute; left: 0; right: 0; margin: 0 auto; width: fit-content;
    padding: 4px 14px; font-size: .82rem; font-weight: 400;
    letter-spacing: -.01em; color: rgba(255,255,255,.55); text-decoration: none;
    transition: color .15s;
  }
  .lp-nav-competitions-btn:hover { color: #fff; }
  .lp-nav.scrolled .lp-nav-competitions-btn { color: #6b7280; }
  .lp-nav.scrolled .lp-nav-competitions-btn:hover { color: #0f0f14; }

  .lp-footer-lang-btn { display: none; }

  /* ── RESPONSIVE ── */
  @media (max-width: 860px) {
    .lp-nav-links { display: none; }
    .lp-nav-competitions-btn { display: block; }
    .lp-sec-cols { grid-template-columns: 1fr !important; }
    .lp-lang-btn:not(.lp-footer-lang-btn) { display: none; }
    .lp-footer-lang-btn { display: inline-block; color: #6b7280; background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.1); }
    .lp-footer-lang-btn:hover { color: #d1d5db; background: rgba(255,255,255,.12); }
  }
  @media (max-width: 680px) {
    .lp-feat-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 640px) {
    .lp-roles-grid { grid-template-columns: 1fr !important; }
    .lp-btn-ghost { display: none; }
    .lp-footer-links { display: flex; flex-wrap: wrap; gap: 12px; }
  }
  @media (max-width: 420px) {
    .lp-feat-grid { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
`;
