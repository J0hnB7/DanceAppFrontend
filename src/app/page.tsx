"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

/* ─── accordion ──────────────────────────────────────── */
function Accordion({ items }: { items: { icon: string; title: string; sub: string; text: string; stats: [string, string][] }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: open === i ? "0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)" : "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)",
            transition: "box-shadow .2s",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 22px", cursor: "pointer", background: "transparent",
              border: "none", width: "100%", textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0, background: item.icon.startsWith("bg:") ? item.icon.slice(3) : "linear-gradient(135deg,#818CF8,#6366F1)" }}>
                {item.icon.startsWith("bg:") ? item.icon.slice(item.icon.indexOf(")")+1) : item.icon}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".92rem", fontWeight: 700, color: "#111827" }}>{item.title}</div>
                <div style={{ fontSize: ".78rem", color: "#4B5563", marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ flexShrink: 0, transform: open === i ? "rotate(180deg)" : "none", transition: "transform .25s" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div style={{ maxHeight: open === i ? 400 : 0, overflow: "hidden", transition: "max-height .35s cubic-bezier(.4,0,.2,1)" }}>
            <div style={{ padding: "0 22px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 22, alignItems: "start" }}>
              <p style={{ fontSize: ".86rem", color: "#4B5563", lineHeight: 1.72 }}>{item.text}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 170 }}>
                {item.stats.map(([label, val]) => (
                  <div key={label} style={{ background: "#F9FAFB", borderRadius: 9, padding: "9px 13px", border: "1px solid #E5E7EB" }}>
                    <div style={{ fontSize: ".66rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".92rem", fontWeight: 700, color: "#111827" }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── main page ──────────────────────────────────────── */
export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const navLight = useScrollNav(heroRef);
  useReveal();

  return (
    <>
      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-25px)}66%{transform:translate(-12px,18px)}}
        @keyframes pdot{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
        @keyframes heroUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .hero-anim-0{animation:heroUp .7s ease both}
        .hero-anim-1{animation:heroUp .7s ease .1s both}
        .hero-anim-2{animation:heroUp .7s ease .2s both}
        .hero-anim-3{animation:heroUp .7s ease .3s both}
        .hero-anim-4{animation:heroUp .8s ease .45s both}
        .badge-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 0 rgba(74,222,128,.6);animation:pdot 2s infinite;display:inline-block}
        .ldot{width:6px;height:6px;border-radius:50%;background:#34d399;animation:pdot 2s infinite;display:inline-block}
        .tick-track{display:flex;animation:tick 30s linear infinite;white-space:nowrap}
        .tick-track:hover{animation-play-state:paused}
        .reveal{opacity:0;transform:translateY(22px);transition:opacity .65s ease,transform .65s ease}
        .reveal.visible{opacity:1;transform:none}
        .bc-hover{transition:box-shadow .25s,transform .25s;cursor:default}
        .bc-hover:hover{box-shadow:0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)!important;transform:translateY(-3px)}
        .rc-hover{transition:box-shadow .25s,transform .25s}
        .rc-hover:hover{box-shadow:0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)!important;transform:translateY(-4px)}
        .pill-style{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:100px;border:1px solid #E5E7EB;background:#fff;font-size:.78rem;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.07);color:#111827}
        .pill-style.active{border-color:#4F46E5;background:#EEF2FF;color:#4F46E5}
        @media(max-width:900px){.nav-links-hide{display:none!important}.sk-two-col{grid-template-columns:1fr!important;gap:40px!important}.roles-4col{grid-template-columns:1fr 1fr!important}.gdpr-3col{grid-template-columns:1fr 1fr!important}}
        @media(max-width:640px){.bento-c4,.bento-c5,.bento-c6,.bento-c7,.bento-c8{grid-column:span 12!important}.roles-4col{grid-template-columns:1fr!important}.gdpr-3col{grid-template-columns:1fr!important}.pbody-grid{grid-template-columns:1fr 1fr!important}}
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
          <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 900, color: "#fff", letterSpacing: "-.05em" }}>DA</div>
          DanceApp
        </Link>
        <ul className="nav-links-hide" style={{ display: "flex", gap: 28, listStyle: "none" }}>
          {[["#features","Funkce"],["#roles","Role"],["#scoring","Skating systém"],["#security","Bezpečnost"]].map(([href, label]) => (
            <li key={href}>
              <a href={href} style={{ fontSize: ".875rem", textDecoration: "none", fontWeight: 500, color: navLight ? "#4B5563" : "rgba(255,255,255,.65)", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#4F46E5")}
                onMouseLeave={e => (e.currentTarget.style.color = navLight ? "#4B5563" : "rgba(255,255,255,.65)")}
              >{label}</a>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" style={{
            padding: "7px 16px", borderRadius: 8, fontSize: ".85rem", fontWeight: 500, textDecoration: "none", transition: "all .2s",
            background: navLight ? "transparent" : "rgba(255,255,255,.1)",
            color: navLight ? "#4B5563" : "#fff",
            border: navLight ? "1px solid #E5E7EB" : "1px solid rgba(255,255,255,.2)",
          }}>Přihlásit se</Link>
          <a href="#cta" style={{
            padding: "7px 18px", borderRadius: 8, fontSize: ".85rem", fontWeight: 600, textDecoration: "none", transition: "all .2s",
            background: navLight ? "#4F46E5" : "#fff",
            color: navLight ? "#fff" : "#0A1628",
          }}>Začít zdarma</a>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} style={{
        position: "relative", minHeight: "100vh", background: "#0A1628",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "110px 5vw 100px", overflow: "hidden",
      }}>
        {/* orbs */}
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

        <div className="hero-anim-0" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", backdropFilter: "blur(8px)", fontSize: ".76rem", fontWeight: 500, color: "rgba(255,255,255,.75)", marginBottom: 28 }}>
          <span className="badge-dot" /> Připraveno pro reálné soutěže
        </div>

        <h1 className="hero-anim-1" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(2.8rem,6vw,5.2rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.04em", color: "#fff", maxWidth: 860, marginBottom: 22 }}>
          Systém pro organizátory<br />
          <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#a5b4fc 0%,#67e8f9 45%,#6ee7b7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>tanečních soutěží.</em>
        </h1>

        <p className="hero-anim-2" style={{ fontSize: "1.1rem", lineHeight: 1.72, color: "rgba(255,255,255,.55)", maxWidth: 540, marginBottom: 38 }}>
          Přihlášky, platby, rozhodčí, Skating systém, diplomy — vše na jednom místě, bez papírů.
        </p>

        <div className="hero-anim-3" style={{ display: "flex", gap: 13, flexWrap: "wrap", justifyContent: "center", marginBottom: 72 }}>
          <a href="#cta" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", background: "#fff", color: "#0A1628", border: "none", fontWeight: 700, textDecoration: "none", transition: "all .2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 30px rgba(255,255,255,.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
          >Začít zdarma →</a>
          <a href="#features" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", border: "1px solid rgba(255,255,255,.22)", color: "#fff", fontWeight: 500, textDecoration: "none", background: "rgba(255,255,255,.06)", transition: "all .2s" }}>Jak to funguje</a>
        </div>

        {/* Dashboard preview */}
        <div className="hero-anim-4" style={{ width: "100%", maxWidth: 900, position: "relative", zIndex: 1 }}>
          <div style={{ background: "rgba(18,30,50,.7)", border: "1px solid rgba(255,255,255,.11)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(16px)", boxShadow: "0 40px 100px rgba(0,0,0,.45)" }}>
            {/* title bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {["#FF5F57","#FEBC2E","#28C840"].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c, display: "inline-block" }} />)}
              </div>
              <div style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,.06)", borderRadius: 6, padding: "3px 12px", fontSize: ".7rem", color: "rgba(255,255,255,.38)" }}>danceapp.cz · Jarní pohár 2025 — Správa soutěže</div>
            </div>
            {/* body */}
            <div className="pbody-grid" style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Přihlášených párů", val: "184", sub: "↑ 12 nových dnes", subColor: "#34d399" },
                { label: "Aktivní kategorie", val: "23", sub: "6 právě probíhá", subColor: "#a5b4fc" },
                { label: "Rozhodčí online", val: "7/9", sub: "2 čekají", subColor: "#fcd34d" },
              ].map((s) => (
                <div key={s.label} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 9, padding: 13 }}>
                  <div style={{ fontSize: ".67rem", color: "rgba(255,255,255,.42)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{s.label}</div>
                  <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.45rem", fontWeight: 700, color: "#fff" }}>{s.val}</div>
                  <div style={{ fontSize: ".7rem", marginTop: 2, color: s.subColor }}>{s.sub}</div>
                </div>
              ))}
              {/* rounds */}
              <div style={{ gridColumn: "1/-1", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 9, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: ".76rem", fontWeight: 600, color: "#fff" }}>
                  <span>Aktuální kola</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".67rem", color: "#34d399", fontWeight: 600 }}>
                    <span className="ldot" /> Živě
                  </span>
                </div>
                {[
                  { name: "Standard — Junioři I · Semifinále", meta: null, judges: true, chip: "● Probíhá", chipBg: "rgba(52,211,153,.15)", chipColor: "#34d399", chipBorder: "rgba(52,211,153,.3)" },
                  { name: "Latin — Dospělí · Finále", meta: "Skating systém · ke schválení", judges: false, chip: "Ke schválení", chipBg: "rgba(165,180,252,.15)", chipColor: "#a5b4fc", chipBorder: "rgba(165,180,252,.3)" },
                  { name: "Standard — Děti I · Předkolo", meta: "24 párů → 12 postupuje", judges: false, chip: "Hotovo", chipBg: "rgba(255,255,255,.07)", chipColor: "rgba(255,255,255,.4)", chipBorder: "rgba(255,255,255,.1)" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,.05)" : "none", fontSize: ".76rem", color: "#fff" }}>
                    <div>
                      <div>{row.name}</div>
                      {row.judges ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <div style={{ display: "flex", gap: 3 }}>
                            {[1,1,1,1,1,0,0].map((on, j) => <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: on ? "#34d399" : "rgba(255,255,255,.14)", display: "inline-block" }} />)}
                          </div>
                          <span style={{ fontSize: ".64rem", color: "rgba(255,255,255,.35)" }}>5/7 rozhodčích odeslalo</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: ".67rem", color: "rgba(255,255,255,.38)", marginTop: 2 }}>{row.meta}</div>
                      )}
                    </div>
                    <span style={{ padding: "3px 9px", borderRadius: 100, fontSize: ".64rem", fontWeight: 600, background: row.chipBg, color: row.chipColor, border: `1px solid ${row.chipBorder}`, whiteSpace: "nowrap", marginLeft: 12 }}>{row.chip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* wave */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "100%" }}>
            <path d="M0,50 C360,100 720,0 1080,50 C1260,75 1380,30 1440,50 L1440,100 L0,100 Z" fill="#fff" />
          </svg>
        </div>
      </section>

      {/* TICKER */}
      <div style={{ overflow: "hidden", background: "#111827", padding: "16px 0", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div className="tick-track">
          {[
            ["4 role", "Organizátor, Admin, Rozhodčí, Tanečník"],
            ["100%", "Bez papírů — od přihlášek po diplomy"],
            ["≤ 1 s", "Výsledky v reálném čase přes SSE"],
            ["GDPR", "Export dat, 2FA, bezpečné tokeny"],
            ["Skating", "Mezinárodní systém — Rules 5–11"],
            ["Offline", "Hodnocení bez připojení k internetu"],
            ["XLSX", "Import párů a kategorií z Excelu"],
            // duplicate
            ["4 role", "Organizátor, Admin, Rozhodčí, Tanečník"],
            ["100%", "Bez papírů — od přihlášek po diplomy"],
            ["≤ 1 s", "Výsledky v reálném čase přes SSE"],
            ["GDPR", "Export dat, 2FA, bezpečné tokeny"],
            ["Skating", "Mezinárodní systém — Rules 5–11"],
            ["Offline", "Hodnocení bez připojení k internetu"],
            ["XLSX", "Import párů a kategorií z Excelu"],
          ].map(([num, label], i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "0 44px", fontSize: ".83rem", fontWeight: 500, color: "rgba(255,255,255,.6)", borderRight: "1px solid rgba(255,255,255,.09)" }}>
              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".9rem", fontWeight: 700, color: "#fff" }}>{num}</span>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES BENTO */}
      <section id="features" style={{ padding: "96px 5vw", background: "#fff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div className="reveal">
            <div style={{ display: "inline-block", fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>Pro organizátory</div>
            <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
              Vše co potřebujete<br />
              <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>den soutěže</em>
            </h2>
            <p style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.72, maxWidth: 500, marginBottom: 52 }}>Od vytvoření soutěže po tisk diplomů — bez papírů, bez chaosu.</p>
          </div>

          {/* bento grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 16 }}>

            {/* Wide — competition management */}
            <div className="bc-hover bento-c8 reveal" style={{ gridColumn: "span 8", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#818CF8,#6366F1)" }}>🏆</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Správa soutěže od A do Z</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Vytvořte soutěž za minuty — datum, místo, kapacita, vstupné. Definujte kategorie dle stylu, věku a úrovně. Import z Excelu.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#EEF2FF", color: "#4F46E5" }}>Organizátor</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 15 }}>
                {[
                  ["Standard — Junioři I", "24 párů · 7 R", "#4F46E5"],
                  ["Latin — Dospělí", "18 párů · 5 R", "#7C3AED"],
                  ["Standard — Děti II", "32 párů · 5 R", "#F59E0B"],
                ].map(([name, val, color]) => (
                  <div key={name} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 9, fontSize: ".73rem" }}>
                    <div style={{ color: "#4B5563", marginBottom: 2 }}>{name}</div>
                    <div style={{ fontWeight: 600, color }}>{val}</div>
                  </div>
                ))}
                <div style={{ background: "#F5F3FF", border: "1px solid #c4b5fd", borderRadius: 8, padding: 9, fontSize: ".73rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontWeight: 600, color: "#4F46E5" }}>+ Přidat kategorii</div>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="bc-hover bento-c4 reveal" style={{ gridColumn: "span 4", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#4ade80,#10B981)" }}>💳</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Platby a poplatky</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Přehled uhrazených a čekajících poplatků. Hromadné potvrzení, export do CSV.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#EEF2FF", color: "#4F46E5" }}>Organizátor</span>
              <div style={{ marginTop: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".73rem", marginBottom: 5 }}>
                  <span style={{ color: "#4B5563" }}>Uhrazeno</span>
                  <span style={{ color: "#4F46E5", fontWeight: 600 }}>142 / 184</span>
                </div>
                <div style={{ background: "#F3F4F6", borderRadius: 100, height: 5 }}>
                  <div style={{ height: 5, borderRadius: 100, background: "linear-gradient(90deg,#4F46E5,#7C3AED)", width: "77%" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: ".67rem", color: "#9CA3AF" }}>
                  <span>Čeká: 31</span><span>Prominuto: 11</span>
                </div>
              </div>
            </div>

            {/* QR Judges */}
            <div className="bc-hover bento-c4 reveal" style={{ gridColumn: "span 4", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#FCD34D,#F59E0B)" }}>📲</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Rozhodčí přes QR kód</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Vygenerujte QR kód — rozhodčí se připojí bez instalace, přímo v prohlížeči mobilu nebo tabletu.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#FFFBEB", color: "#D97706" }}>Rozhodčí</span>
            </div>

            {/* Diplomas */}
            <div className="bc-hover bento-c4 reveal" style={{ gridColumn: "span 4", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }}>🎖️</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Diplomy na klik</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Po finále tiskněte diplomy jedním kliknutím. Jméno, umístění a kategorie se doplní automaticky.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#EEF2FF", color: "#4F46E5" }}>Organizátor</span>
            </div>

            {/* Crisis — dark */}
            <div className="bc-hover bento-c4 reveal" style={{ gridColumn: "span 4", background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "rgba(255,255,255,.1)" }}>⚠️</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#fff" }}>Řešení nečekaných situací</div>
              <div style={{ fontSize: ".83rem", color: "rgba(255,255,255,.58)", lineHeight: 1.65 }}>Odhlaste pár, udělte napomenutí nebo srážku bodů — vše zdokumentováno s auditní stopou.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.9)" }}>Admin soutěže</span>
            </div>

            {/* Offline — indigo gradient */}
            <div className="bc-hover bento-c8 reveal" style={{ gridColumn: "span 8", background: "linear-gradient(135deg,#4338CA 0%,#6D28D9 100%)", border: "none", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "rgba(255,255,255,.1)" }}>🔌</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#fff" }}>Offline podpora pro rozhodčí</div>
              <div style={{ fontSize: ".83rem", color: "rgba(255,255,255,.58)", lineHeight: 1.65 }}>Hodnocení se ukládá lokálně. Po obnovení Wi-Fi se automaticky synchronizuje — spolehlivé i ve špatně pokrytých sálech.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.9)" }}>Rozhodčí</span>
              <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  ["#4ade80", "Hodnocení uloženo lokálně (offline)", "12:43:01"],
                  ["#4ade80", "Síť obnovena — synchronizuji 3 hodnocení", "12:49:15"],
                  ["#a5b4fc", "Synchronizace dokončena ✓", "12:49:16"],
                ].map(([color, text, time]) => (
                  <div key={time} style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "9px 11px", fontSize: ".75rem", color: "rgba(255,255,255,.85)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                    {text}
                    <span style={{ fontSize: ".63rem", color: "rgba(255,255,255,.3)", marginLeft: "auto" }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Realtime — teal gradient */}
            <div className="bc-hover bento-c6 reveal" style={{ gridColumn: "span 6", background: "linear-gradient(135deg,#0891B2 0%,#0D9488 100%)", border: "none", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "rgba(255,255,255,.1)" }}>⚡</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#fff" }}>Výsledky v reálném čase</div>
              <div style={{ fontSize: ".83rem", color: "rgba(255,255,255,.58)", lineHeight: 1.65 }}>Výsledky, průběh hodnocení i stavy kol se aktualizují okamžitě — bez obnovení stránky.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.9)" }}>Všechny role</span>
              <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  ["#67e8f9", "Latin — Dospělí: Finále uzavřeno", "LIVE"],
                  ["#6ee7b7", "Skating systém: výsledky vypočítány", "LIVE"],
                ].map(([color, text, time]) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "9px 11px", fontSize: ".75rem", color: "rgba(255,255,255,.85)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                    {text}
                    <span style={{ fontSize: ".63rem", color: "rgba(255,255,255,.3)", marginLeft: "auto" }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Presentation mode */}
            <div className="bc-hover bento-c6 reveal" style={{ gridColumn: "span 6", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#F9A8D4,#EC4899)" }}>🎬</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Prezentační režim</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Výsledky na projektor — tmavé pozadí, postupné odhalování klávesnicí. Moderátor se připojí bez přihlášení přes jednorázový odkaz.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#ECFDF5", color: "#059669" }}>Admin / Moderátor</span>
            </div>

            {/* Import */}
            <div className="bc-hover bento-c4 reveal" style={{ gridColumn: "span 4", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#22D3EE,#06B6D4)" }}>📥</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Import a export</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Importujte páry a kategorie z Excelu. Exportujte platby do CSV — propojení s vaším stávajícím workflow.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#EEF2FF", color: "#4F46E5" }}>Organizátor</span>
            </div>

            {/* Check-in */}
            <div className="bc-hover bento-c4 reveal" style={{ gridColumn: "span 4", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#4ade80,#10B981)" }}>✅</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Check-in na soutěžní den</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Zaznamenávejte příchod párů v reálném čase. Vždy víte, koho čekáte.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#EEF2FF", color: "#4F46E5" }}>Organizátor</span>
            </div>

            {/* Analytics */}
            <div className="bc-hover bento-c4 reveal" style={{ gridColumn: "span 4", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 26, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", marginBottom: 16, background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }}>📊</div>
              <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>Analytika a přehledy</div>
              <div style={{ fontSize: ".83rem", color: "#4B5563", lineHeight: 1.65 }}>Srovnání ročníků a počtu párů na jedné stránce. Přehled trendů bez tabulek v Excelu.</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: ".67rem", fontWeight: 600, marginTop: 13, background: "#EEF2FF", color: "#4F46E5" }}>Organizátor</span>
            </div>

          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" style={{ padding: "96px 5vw", background: "#F9FAFB" }}>
        <div className="reveal" style={{ maxWidth: 1160, margin: "0 auto 52px", textAlign: "center" }}>
          <div style={{ display: "inline-block", fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>Role v systému</div>
          <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
            Jeden systém, <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>čtyři perspektivy</em>
          </h2>
          <p style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.72, maxWidth: 500, margin: "0 auto" }}>Každá role dostane přesně to, co potřebuje.</p>
        </div>
        <div className="roles-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, maxWidth: 1160, margin: "0 auto" }}>
          {[
            { icon: "🗂️", iconBg: "linear-gradient(135deg,#818CF8,#6366F1)", title: "Organizátor", desc: "Správa soutěže před i po soutěžním dni.", items: ["Tvorba soutěží a kategorií","Import párů z Excelu","Správa plateb a diplomů","Analytika ročníků"] },
            { icon: "🖥️", iconBg: "linear-gradient(135deg,#4ade80,#059669)", title: "Admin soutěže", desc: "Operativní řízení průběhu v reálném čase.", items: ["Živý dashboard","Otevírání a uzavírání kol","Skating systém + řešení kolizí","Prezentační režim"] },
            { icon: "📱", iconBg: "linear-gradient(135deg,#FCD34D,#F59E0B)", title: "Rozhodčí", desc: "Bodování v prohlížeči, bez instalace.", items: ["Připojení přes QR kód","Offline s auto-synchronizací","Předkola i finálová kola"] },
            { icon: "💃", iconBg: "linear-gradient(135deg,#F9A8D4,#EC4899)", title: "Tanečník", desc: "Přihlášení, živé výsledky, bez nutnosti účtu.", items: ["Registrace bez vytváření účtu","Živý výsledkový servis","Veřejné výsledky bez přihlášení"] },
          ].map((role) => (
            <div key={role.title} className="rc-hover reveal" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "26px 22px", boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)" }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", marginBottom: 16, background: role.iconBg }}>{role.icon}</div>
              <h3 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".97rem", fontWeight: 700, marginBottom: 7, color: "#111827" }}>{role.title}</h3>
              <p style={{ fontSize: ".81rem", color: "#4B5563", lineHeight: 1.55, marginBottom: 16 }}>{role.desc}</p>
              <ul style={{ listStyle: "none" }}>
                {role.items.map((item) => (
                  <li key={item} style={{ fontSize: ".78rem", color: "#4B5563", padding: "5px 0", borderBottom: "1px solid #F3F4F6", display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ color: "#4F46E5", fontWeight: 700, flexShrink: 0 }}>✓</span>{item}
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
            <div style={{ display: "inline-block", fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>Scoring engine</div>
            <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
              Mezinárodní<br />
              <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Skating systém</em>
            </h2>
            <p style={{ fontSize: ".97rem", color: "#4B5563", lineHeight: 1.72, marginBottom: 24 }}>Automatický výpočet podle mezinárodního Skating systému (Rules 5–11). Matice hodnocení je průhledná a auditovatelná. Kolize jsou detekovány automaticky včetně návrhu Dance-off kol.</p>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 26 }}>
              {[
                { label: "⚖️ Rules 5–11", active: true },
                { label: "🕺 Single & multi-dance" },
                { label: "🔀 Dance-off kola" },
                { label: "🔍 Auditní stopa" },
              ].map(({ label, active }) => (
                <div key={label} className={`pill-style${active ? " active" : ""}`}>{label}</div>
              ))}
            </div>
          </div>
          <div className="reveal">
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 26, boxShadow: "0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".85rem", fontWeight: 700, color: "#111827" }}>Latin Dospělí · Finále — Skating matice</div>
                <span style={{ fontSize: ".67rem", fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "#ECFDF5", color: "#059669" }}>✓ Bez kolizí</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".75rem" }}>
                <thead>
                  <tr>
                    {["Pár","R1","R2","R3","R4","R5","Σ","Pořadí"].map(h => (
                      <th key={h} style={{ padding: "7px 9px", color: "#9CA3AF", fontWeight: 600, borderBottom: "1px solid #E5E7EB", textAlign: "center", fontSize: ".66rem", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    [114,1,1,2,1,1,6,"1."],
                    [87,2,3,1,2,2,10,"2."],
                    [23,3,2,3,3,4,15,"3."],
                    [56,4,4,4,5,3,20,"4."],
                    [101,5,5,5,4,5,24,"5."],
                    [42,6,6,6,6,6,30,"6."],
                  ].map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: "7px 9px", textAlign: "center", borderBottom: i < 5 ? "1px solid #F3F4F6" : "none", fontWeight: 700 }}>{row[0]}</td>
                      {[1,2,3,4,5].map(j => <td key={j} style={{ padding: "7px 9px", textAlign: "center", borderBottom: i < 5 ? "1px solid #F3F4F6" : "none" }}>{row[j]}</td>)}
                      <td style={{ padding: "7px 9px", textAlign: "center", borderBottom: i < 5 ? "1px solid #F3F4F6" : "none", fontWeight: 600 }}>{row[6]}</td>
                      <td style={{ padding: "7px 9px", textAlign: "center", borderBottom: i < 5 ? "1px solid #F3F4F6" : "none" }}>
                        <span style={{ background: "#EEF2FF", color: "#4F46E5", borderRadius: 5, fontWeight: 700, padding: "2px 7px" }}>{row[7]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: ".7rem", color: "#9CA3AF" }}>5 rozhodčích · 6 párů · Výsledek potvrzen adminem</div>
            </div>
          </div>
        </div>
      </section>

      {/* ACCORDION */}
      <section style={{ padding: "96px 5vw", background: "#F9FAFB" }}>
        <div className="inner cx reveal" style={{ maxWidth: 1160, margin: "0 auto 52px", textAlign: "center" }}>
          <div style={{ display: "inline-block", fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>Scénáře použití</div>
          <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
            Od malé přehlídky<br />po <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>federační turnaj</em>
          </h2>
          <p style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.72, maxWidth: 500, margin: "0 auto" }}>Systém se přizpůsobí rozsahu vaší soutěže.</p>
        </div>
        <Accordion items={[
          { icon: "🏙️", title: "Regionální přehlídka", sub: "10–30 kategorií · 50–150 párů", text: "Import párů z Excelu, rozhodčí přes QR kód, Skating systém počítá výsledky automaticky. Diplomy k tisku hned po finále. Celý soutěžní den bez papírů.", stats: [["Kategorie","10–30"],["Páry","50–150"],["Rozhodčí","3–7"]] },
          { icon: "🏆", title: "Federační turnaj", sub: "30+ kategorií · 200+ párů", text: "Multi-dance finále, moderátorský pohled na projektor, živé výsledky veřejně přes QR kód v programu. Auditovatelná Skating matice pro každé kolo. Krizový management pro zranění, diskvalifikace nebo odvolání.", stats: [["Kategorie","30+"],["Páry","200+"],["Rozhodčí","7–9"]] },
          { icon: "🎓", title: "Školní přehlídka", sub: "5–10 kategorií · 20–60 párů", text: "Nastavení za minuty, veřejná registrace párů bez přihlašování. Rodiče a diváci sledují výsledky živě. Diplomy k tisku na místě.", stats: [["Kategorie","5–10"],["Páry","20–60"],["Rozhodčí","3–5"]] },
        ]} />
      </section>

      {/* GDPR / SECURITY */}
      <section id="security" style={{ padding: "96px 5vw", background: "#fff" }}>
        <div className="reveal" style={{ maxWidth: 1160, margin: "0 auto 52px", textAlign: "center" }}>
          <div style={{ display: "inline-block", fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4F46E5", marginBottom: 11 }}>Bezpečnost &amp; GDPR</div>
          <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.85rem,3.5vw,2.85rem)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-.03em", color: "#111827", marginBottom: 14 }}>
            Spolehlivé a <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#4F46E5 0%,#7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>bezpečné</em>
          </h2>
          <p style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.72, maxWidth: 500, margin: "0 auto" }}>Systém splňuje požadavky GDPR a zajišťuje transparentnost pro organizátory i účastníky.</p>
        </div>
        <div className="gdpr-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, maxWidth: 1160, margin: "0 auto" }}>
          {[
            { iconBg: "linear-gradient(135deg,#818CF8,#6366F1)", icon: "🔐", title: "Dvoufaktorové ověřování", desc: "TOTP přes autentikátorovou aplikaci. Rozhodčí a moderátoři se připojují přes jednorázové tokeny bez trvalých hesel." },
            { iconBg: "linear-gradient(135deg,#FCD34D,#F59E0B)", icon: "📋", title: "Auditní stopa", desc: "Každá akce admina a rozhodčího je logována s časovým razítkem — plná transparentnost výsledků." },
            { iconBg: "linear-gradient(135deg,#A78BFA,#7C3AED)", icon: "🛡️", title: "GDPR compliant", desc: "Data zpracována pouze v EU. Účastníci mohou exportovat nebo smazat svá data přímo z profilu." },
          ].map((item) => (
            <div key={item.title} className="reveal" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 13, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.07),0 8px 24px rgba(0,0,0,.05)", display: "flex", alignItems: "flex-start", gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", background: item.iconBg }}>{item.icon}</div>
              <div>
                <div style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: ".87rem", fontWeight: 700, marginBottom: 3, color: "#111827" }}>{item.title}</div>
                <div style={{ fontSize: ".78rem", color: "#4B5563", lineHeight: 1.55 }}>{item.desc}</div>
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
          <div style={{ display: "inline-block", fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#67e8f9", marginBottom: 11 }}>Začít dnes</div>
          <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(2rem,4vw,3.4rem)", fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1.1, color: "#fff", maxWidth: 700, margin: "0 auto 16px" }}>
            Uspořádejte první soutěž<br />
            <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#a5b4fc 0%,#67e8f9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>bez papírů.</em>
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: "1rem", maxWidth: 450, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Zaregistrujte se zdarma a zkuste to nanečisto — nebo nás kontaktujte a vše vám ukážeme.
          </p>
          <div style={{ display: "flex", gap: 13, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/login" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", background: "#fff", color: "#0A1628", fontWeight: 700, textDecoration: "none", transition: "all .2s" }}>Začít zdarma →</Link>
            <a href="mailto:info@danceapp.cz" style={{ padding: "13px 30px", borderRadius: 10, fontSize: ".97rem", border: "1px solid rgba(255,255,255,.22)", color: "#fff", fontWeight: 500, textDecoration: "none", background: "rgba(255,255,255,.06)", transition: "all .2s" }}>Kontaktovat nás</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#fff", padding: "44px 5vw", borderTop: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 18 }}>
          <Link href="/" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.05rem", color: "#111827", display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 900, color: "#fff" }}>DA</div>
            DanceApp
          </Link>
          <ul style={{ display: "flex", gap: 24, listStyle: "none" }}>
            {[["#features","Funkce"],["#","Dokumentace"],["mailto:info@danceapp.cz","Kontakt"],["#security","GDPR"]].map(([href, label]) => (
              <li key={label}><a href={href} style={{ fontSize: ".8rem", color: "#4B5563", textDecoration: "none" }}>{label}</a></li>
            ))}
          </ul>
          <div style={{ fontSize: ".73rem", color: "#9CA3AF" }}>© 2025 DanceApp. Navrženo pro tanec.</div>
        </div>
      </footer>
    </>
  );
}
