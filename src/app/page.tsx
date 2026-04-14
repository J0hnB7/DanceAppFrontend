"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/locale-context";
import {
  CalendarDays, LayoutDashboard, Smartphone, Users,
  Lock, ClipboardList, Shield,
  Scale, Music, Shuffle, Search,
  Check,
} from "lucide-react";

/* ─── tiny helpers ───────────────────────────────────── */
function useScrollNav(heroRef: React.RefObject<HTMLElement | null>) {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const fn = () => {
      const h = heroRef.current?.offsetHeight ?? 600;
      setLight(window.scrollY > h - 80);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [heroRef]);
  return light;
}

function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(".reveal");
    const ro = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("visible");
            ro.unobserve(e.target);
          }
        }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 0.07}s`;
      ro.observe(el);
    });
    return () => ro.disconnect();
  }, []);
}

/* ─── main page ──────────────────────────────────────── */
export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const navLight = useScrollNav(heroRef);
  useReveal();
  const { t: _t } = useLocale();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const t = (key: string, params?: Record<string, string | number>) => mounted ? _t(key, params) : "";

  const roleCards = [
    {
      Icon: CalendarDays,
      iconBg: "linear-gradient(135deg,#3395ff,#0a84ff)",
      title: "Organizátor",
      desc: "Správa soutěže před i po soutěžním dni.",
      items: ["Tvorba soutěží a kategorií", "Import párů z Excelu", "Správa plateb a poplatků", "Diplomy jedním kliknutím", "Check-in na soutěžní den", "Analytika a přehledy ročníků"],
    },
    {
      Icon: LayoutDashboard,
      iconBg: "linear-gradient(135deg,#4ade80,#059669)",
      title: "Admin soutěže",
      desc: "Operativní řízení průběhu v reálném čase.",
      items: ["Živý dashboard soutěže", "Otevírání a uzavírání kol", "Skating systém + řešení kolizí", "Výsledky v reálném čase", "Prezentační režim na projektor", "Řešení nečekaných situací"],
    },
    {
      Icon: Smartphone,
      iconBg: "linear-gradient(135deg,#FCD34D,#F59E0B)",
      title: "Rozhodčí",
      desc: "Bodování v prohlížeči, bez instalace.",
      items: ["Připojení přes QR kód", "Bodování přímo v prohlížeči", "Offline s auto-synchronizací", "Předkola i finálová kola"],
    },
    {
      Icon: Users,
      iconBg: "linear-gradient(135deg,#F9A8D4,#EC4899)",
      title: "Tanečník",
      desc: "Přihlášení, živé výsledky, bez nutnosti účtu.",
      items: ["Registrace bez vytváření účtu", "Živý výsledkový servis", "Veřejné výsledky bez přihlášení"],
    },
  ];

  const securityCards = [
    {
      Icon: Lock,
      iconBg: "linear-gradient(135deg,#3395ff,#0a84ff)",
      title: "Dvoufaktorové ověřování",
      desc: "TOTP přes autentikátorovou aplikaci. Rozhodčí a moderátoři se připojují přes jednorázové tokeny bez trvalých hesel.",
    },
    {
      Icon: ClipboardList,
      iconBg: "linear-gradient(135deg,#FCD34D,#F59E0B)",
      title: "Auditní stopa",
      desc: "Každá akce admina a rozhodčího je logována s časovým razítkem — plná transparentnost výsledků.",
    },
    {
      Icon: Shield,
      iconBg: "linear-gradient(135deg,#A78BFA,#7C3AED)",
      title: "GDPR compliant",
      desc: "Data zpracována pouze v EU. Účastníci mohou exportovat nebo smazat svá data přímo z profilu.",
    },
  ];

  const scoringFeatures = [
    "Skating Rules 5–11 přesně implementovány",
    "Automatická detekce kolizí a remíz",
    "Navrhovaná Dance-off kola při patové situaci",
    "Export výsledků do Excelu",
    "Auditní stopa každého výsledku",
  ];

  const heroFeaturePills = ["Skating systém", "GDPR compliant", "Offline rozhodčí", "Živé výsledky"];

  return (
    <>
      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-25px)}66%{transform:translate(-12px,18px)}}
        @keyframes pdot{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
        @keyframes heroUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        .hero-anim-0{animation:heroUp .7s ease both}
        .hero-anim-1{animation:heroUp .7s ease .1s both}
        .hero-anim-2{animation:heroUp .7s ease .2s both}
        .hero-anim-3{animation:heroUp .7s ease .3s both}
        .badge-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 0 rgba(74,222,128,.6);animation:pdot 2s infinite;display:inline-block}
        .reveal{opacity:0;transform:translateY(22px);transition:opacity .65s ease,transform .65s ease}
        .reveal.visible{opacity:1;transform:none}
        .rc-hover{transition:box-shadow .25s,transform .25s;cursor:pointer}
        .rc-hover:hover{box-shadow:0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)!important;transform:translateY(-4px)}
        .pill-style{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:100px;border:1px solid #E5E7EB;background:#fff;font-size:.825rem;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.07);color:#111827}
        .pill-style.active{border-color:#4F46E5;background:#EEF2FF;color:#4F46E5}
        @media(max-width:900px){.nav-links-hide{display:none!important}.sk-two-col{grid-template-columns:1fr!important;gap:40px!important}.roles-4col{grid-template-columns:1fr 1fr!important}.gdpr-3col{grid-template-columns:1fr 1fr!important}}
        @media(max-width:640px){.roles-4col{grid-template-columns:1fr!important}.gdpr-3col{grid-template-columns:1fr!important}.nav-signin-hide{display:none!important}}
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5vw", transition: "all .3s",
        background: navLight ? "rgba(255,255,255,.95)" : "transparent",
        backdropFilter: navLight ? "blur(20px)" : undefined,
        boxShadow: navLight ? "0 1px 0 #E5E7EB" : undefined,
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.15rem",
          letterSpacing: "-.03em", textDecoration: "none", display: "flex", alignItems: "center", gap: 7,
          color: navLight ? "#111827" : "#fff",
        }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 900, color: "#fff", letterSpacing: "-.05em" }}>PP</div>
          ProPodium
        </Link>
        <ul className="nav-links-hide" style={{ display: "flex", gap: 28, listStyle: "none" }}>
          {[["#roles", t("landing.navRoles")], ["#scoring", t("landing.navScoring")], ["#security", t("landing.navSecurity")]].map(([href, label]) => (
            <li key={href}>
              <a href={href} style={{ fontSize: ".875rem", textDecoration: "none", fontWeight: 500, cursor: "pointer", color: navLight ? "#4B5563" : "rgba(255,255,255,.65)", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#4F46E5")}
                onMouseLeave={e => (e.currentTarget.style.color = navLight ? "#4B5563" : "rgba(255,255,255,.65)")}
              >{label}</a>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" className="nav-signin-hide" style={{
            padding: "7px 16px", borderRadius: 8, fontSize: ".875rem", fontWeight: 500, textDecoration: "none", transition: "all .2s",
            background: navLight ? "transparent" : "rgba(255,255,255,.1)",
            color: navLight ? "#4B5563" : "#fff",
            border: navLight ? "1px solid #E5E7EB" : "1px solid rgba(255,255,255,.2)",
          }}>{t("landing.signIn")}</Link>
          <Link href="/register" style={{
            padding: "7px 18px", borderRadius: 8, fontSize: ".875rem", fontWeight: 600, textDecoration: "none", transition: "all .2s",
            background: navLight ? "#4F46E5" : "#fff",
            color: navLight ? "#fff" : "#0A1628",
          }}>{t("landing.startFree")}</Link>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} style={{
        position: "relative", minHeight: "100vh", background: "#0A1628",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "110px 5vw 140px", overflow: "hidden",
      }}>
        {[
          { w: 650, h: 650, bg: "radial-gradient(circle,rgba(79,70,229,.32) 0%,transparent 65%)", style: { top: -220, right: -80, animationDuration: "9s", animationDelay: "0s" } },
          { w: 500, h: 500, bg: "radial-gradient(circle,rgba(124,58,237,.22) 0%,transparent 65%)", style: { bottom: -180, left: -80, animationDuration: "11s", animationDelay: "-4s" } },
          { w: 380, h: 380, bg: "radial-gradient(circle,rgba(6,182,212,.18) 0%,transparent 65%)", style: { top: "35%", right: "8%", animationDuration: "13s", animationDelay: "-7s" } },
        ].map((orb, i) => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none",
            width: orb.w, height: orb.h, background: orb.bg,
            animation: `orb ${orb.style.animationDuration} ease-in-out ${orb.style.animationDelay} infinite`,
            ...orb.style,
          }} />
        ))}

        <div className="hero-anim-0" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", backdropFilter: "blur(8px)", fontSize: ".8rem", fontWeight: 500, color: "rgba(255,255,255,.75)", marginBottom: 28 }}>
          <span className="badge-dot" /> {t("landing.heroReady")}
        </div>

        <h1 className="hero-anim-1" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(2.8rem,6vw,5.2rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.04em", color: "#fff", maxWidth: 860, marginBottom: 22 }}>
          {t("landing.heroTitle1")}<br />
          <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#a5b4fc 0%,#67e8f9 45%,#6ee7b7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>{t("landing.heroTitle2")}</em>
        </h1>

        <p className="hero-anim-2" style={{ fontSize: "1.1rem", lineHeight: 1.72, color: "rgba(255,255,255,.68)", maxWidth: 540, marginBottom: 38 }}>
          {t("landing.heroDesc")}
        </p>

        <div className="hero-anim-3" style={{ display: "flex", gap: 13, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
          <Link href="/register" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", background: "#fff", color: "#0A1628", border: "none", fontWeight: 700, textDecoration: "none", transition: "all .2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 30px rgba(255,255,255,.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
          >{t("landing.ctaStart")}</Link>
          <a href="#roles" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", border: "1px solid rgba(255,255,255,.22)", color: "#fff", fontWeight: 500, textDecoration: "none", background: "rgba(255,255,255,.06)", transition: "all .2s" }}>{t("landing.howItWorks")}</a>
        </div>

        <div className="hero-anim-3" style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {heroFeaturePills.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".8rem", color: "rgba(255,255,255,.45)", fontWeight: 500 }}>
              <Check size={13} color="#4ade80" aria-hidden="true" />
              {f}
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "100%" }}>
            <path d="M0,50 C360,100 720,0 1080,50 C1260,75 1380,30 1440,50 L1440,100 L0,100 Z" fill="#F9FAFB" />
          </svg>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" style={{ padding: "96px 5vw", background: "#F9FAFB" }}>
        <div className="reveal" style={{ maxWidth: 1160, margin: "0 auto 52px", textAlign: "center" }}>
          <div style={{ display: "inline-block", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>{t("landing.rolesTag")}</div>
          <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
            {t("landing.rolesTitle1")} <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>{t("landing.rolesTitle2")}</em>
          </h2>
          <p style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.72, maxWidth: 500, margin: "0 auto" }}>{t("landing.rolesDesc")}</p>
        </div>
        <div className="roles-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, maxWidth: 1160, margin: "0 auto" }}>
          {roleCards.map((role) => (
            <div key={role.title} className="rc-hover reveal" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "26px 22px", boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, background: role.iconBg }}>
                <role.Icon size={22} color="#fff" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <h3 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>{role.title}</h3>
              <p style={{ fontSize: ".875rem", color: "#4B5563", lineHeight: 1.55, marginBottom: 16 }}>{role.desc}</p>
              <ul style={{ listStyle: "none" }}>
                {role.items.map((item) => (
                  <li key={item} style={{ fontSize: ".875rem", color: "#4B5563", padding: "5px 0", borderBottom: "1px solid #F3F4F6", display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <Check size={13} color="#4F46E5" strokeWidth={2.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SKATING SYSTEM */}
      <section id="scoring" style={{ padding: "96px 5vw", background: "#fff" }}>
        <div className="sk-two-col" style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div className="reveal">
            <div style={{ display: "inline-block", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>{t("landing.scoringTag")}</div>
            <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
              {t("landing.scoringTitle1")}<br />
              <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>{t("landing.scoringTitle2")}</em>
            </h2>
            <p style={{ fontSize: ".97rem", color: "#4B5563", lineHeight: 1.72, marginBottom: 24 }}>
              Automatický výpočet podle mezinárodního Skating systému. Matice hodnocení je průhledná a auditovatelná.
            </p>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 26 }}>
              {[
                { Icon: Scale, label: "Rules 5–11", active: true },
                { Icon: Music, label: "Single & multi-dance" },
                { Icon: Shuffle, label: "Dance-off kola" },
                { Icon: Search, label: "Auditní stopa" },
              ].map(({ Icon, label, active }) => (
                <div key={label} className={`pill-style${active ? " active" : ""}`}>
                  <Icon size={13} aria-hidden="true" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="reveal">
            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, padding: 30, boxShadow: "0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.06)" }}>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".95rem", fontWeight: 700, color: "#111827", marginBottom: 22 }}>Co systém řeší za vás</div>
              {scoringFeatures.map((f, i) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 0", borderBottom: i < scoringFeatures.length - 1 ? "1px solid #E5E7EB" : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Check size={12} color="#4F46E5" strokeWidth={2.5} aria-hidden="true" />
                  </div>
                  <span style={{ fontSize: ".9rem", color: "#374151", lineHeight: 1.55 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GDPR / SECURITY */}
      <section id="security" style={{ padding: "96px 5vw", background: "#F9FAFB" }}>
        <div className="reveal" style={{ maxWidth: 1160, margin: "0 auto 52px", textAlign: "center" }}>
          <div style={{ display: "inline-block", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>{t("landing.securityTag")}</div>
          <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
            {t("landing.securityTitle1")} <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>{t("landing.securityTitle2")}</em>
          </h2>
          <p style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.72, maxWidth: 500, margin: "0 auto" }}>{t("landing.securityDesc")}</p>
        </div>
        <div className="gdpr-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, maxWidth: 1160, margin: "0 auto" }}>
          {securityCards.map((item) => (
            <div key={item.title} className="reveal" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 13, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)", display: "flex", alignItems: "flex-start", gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: item.iconBg }}>
                <item.Icon size={18} color="#fff" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".9rem", fontWeight: 700, marginBottom: 4, color: "#111827" }}>{item.title}</div>
                <div style={{ fontSize: ".875rem", color: "#4B5563", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" style={{ background: "#0A1628", padding: "96px 5vw", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {[
          { w: 650, h: 650, bg: "radial-gradient(circle,rgba(79,70,229,.32) 0%,transparent 65%)", style: { top: -220, right: -80, animationDuration: "9s", animationDelay: "0s" } },
          { w: 500, h: 500, bg: "radial-gradient(circle,rgba(124,58,237,.22) 0%,transparent 65%)", style: { bottom: -180, left: -80, animationDuration: "11s", animationDelay: "-4s" } },
        ].map((orb, i) => (
          <div key={i} style={{ position: "absolute", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none", width: orb.w, height: orb.h, background: orb.bg, animation: `orb ${orb.style.animationDuration} ease-in-out ${orb.style.animationDelay} infinite`, ...orb.style }} />
        ))}
        <div className="reveal" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#67e8f9", marginBottom: 11 }}>{t("landing.ctaTag")}</div>
          <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(2rem,4vw,3.4rem)", fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1.1, color: "#fff", maxWidth: 700, margin: "0 auto 16px" }}>
            {t("landing.ctaTitle1")}<br />
            <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#a5b4fc 0%,#67e8f9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>{t("landing.ctaTitle2")}</em>
          </h2>
          <p style={{ color: "rgba(255,255,255,.55)", fontSize: "1rem", maxWidth: 450, margin: "0 auto 36px", lineHeight: 1.7 }}>
            {t("landing.ctaDesc")}
          </p>
          <div style={{ display: "flex", gap: 13, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/register" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", background: "#fff", color: "#0A1628", fontWeight: 700, textDecoration: "none", transition: "all .2s" }}>{t("landing.ctaStart")}</Link>
            <a href="mailto:info@propodium.cz" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", border: "1px solid rgba(255,255,255,.22)", color: "#fff", fontWeight: 500, textDecoration: "none", background: "rgba(255,255,255,.06)", transition: "all .2s" }}>{t("landing.ctaContact")}</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#fff", padding: "44px 5vw", borderTop: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 18 }}>
          <Link href="/" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.05rem", color: "#111827", display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 900, color: "#fff" }}>PP</div>
            ProPodium
          </Link>
          <ul style={{ display: "flex", gap: 24, listStyle: "none" }}>
            {[
              ["#roles", t("landing.footerFeatures")],
              ["#scoring", t("landing.navScoring")],
              ["mailto:info@propodium.cz", t("landing.footerContact")],
              ["#security", "GDPR"],
            ].map(([href, label], i) => (
              <li key={i}><a href={href} style={{ fontSize: ".875rem", color: "#4B5563", textDecoration: "none", cursor: "pointer" }}>{label}</a></li>
            ))}
          </ul>
          <div style={{ fontSize: ".8rem", color: "#9CA3AF" }}>{t("landing.copyright")}</div>
        </div>
      </footer>
    </>
  );
}
