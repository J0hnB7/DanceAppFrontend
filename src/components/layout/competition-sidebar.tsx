"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useTheme } from "@/contexts/theme-context";
import { useLocale } from "@/contexts/locale-context";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { useSections } from "@/hooks/queries/use-sections";
import { usePairs } from "@/hooks/queries/use-pairs";

/* ── SVG Icons (inline, 24x24 viewBox) ────────────────── */
const icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
  ),
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
  ),
  pairs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  judges: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
  ),
  checkin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  schedule: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
  ),
  results: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
  ),
  diplomas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="6" /><path d="m15.477 12.89 3.171 3.17a4 4 0 0 1-.126 5.714L18 22l-3-3" /><path d="m6.523 12.89-3.171 3.17a4 4 0 0 0 .126 5.714L6 22l3-3" /></svg>
  ),
  content: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
  ),
  budget: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
  ),
  hamburger: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
};

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  badgeType?: "count" | "live";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface CompetitionSidebarProps {
  competitionId: string;
  competitionName?: string;
}

export function CompetitionSidebar({
  competitionId,
  competitionName,
}: CompetitionSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Self-fetch counts */
  const { data: sections } = useSections(competitionId);
  const { data: pairs } = usePairs(competitionId);

  const sectionCount = sections?.length ?? 0;
  const pairsCount = pairs?.length ?? 0;

  const base = `/dashboard/competitions/${competitionId}`;

  const navGroups: NavGroup[] = [
    {
      label: "Příprava",
      items: [
        { id: "overview", label: "Přehled", icon: icons.overview, href: base },
        { id: "categories", label: "Kategorie", icon: icons.categories, href: `${base}/sections`, badge: sectionCount || undefined, badgeType: "count" },
        { id: "pairs", label: "Páry", icon: icons.pairs, href: `${base}/pairs`, badge: pairsCount || undefined, badgeType: "count" },
        { id: "judges", label: "Porota", icon: icons.judges, href: `${base}/judges`, badgeType: "count" },
        { id: "checkin", label: "Check-in", icon: icons.checkin, href: `${base}/presence` },
        { id: "schedule", label: "Harmonogram", icon: icons.schedule, href: `${base}/schedule` },
      ],
    },
    {
      label: "Průběh",
      items: [
        { id: "live", label: "Live řízení", icon: icons.live, href: `${base}/live`, badge: "LIVE", badgeType: "live" },
        { id: "results", label: "Vyhodnocení", icon: icons.results, href: `${base}/scoring` },
        { id: "diplomas", label: "Diplomy", icon: icons.diplomas, href: `${base}/diplomas` },
      ],
    },
    {
      label: "Správa",
      items: [
        { id: "content", label: "Obsah", icon: icons.content },
        { id: "email", label: "E-maily & šablony", icon: icons.email, href: `${base}/notifications` },
        { id: "payments", label: "Platby", icon: icons.payments, href: `${base}/payments` },
        { id: "budget", label: "Rozpočet", icon: icons.budget, href: `${base}/budget` },
        { id: "settings", label: "Nastavení", icon: icons.settings, href: `${base}/settings` },
      ],
    },
  ];

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.id === "overview") return pathname === base;
    return pathname.startsWith(item.href);
  };

  const fullName = user?.name ?? "";
  const avatarColor = getAvatarColor(fullName || "?");

  const sidebarContent = (
    <>
      {/* Header — logo + back */}
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] text-[13px] font-bold text-white"
            style={{ fontFamily: "var(--font-sora)", boxShadow: "0 2px 10px rgba(59,130,246,0.4)" }}
          >
            DA
          </div>
          <span
            className="text-[15px] font-bold text-white"
            style={{ fontFamily: "var(--font-sora)" }}
          >
            DanceApp
          </span>
        </div>
        <div className="mb-1 h-px bg-[rgba(255,255,255,0.07)]" />
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-1.5 py-2 text-[13px] font-medium text-[#64748B] transition-colors duration-150 hover:text-[#94A3B8]"
        >
          <span className="h-3.5 w-3.5 shrink-0">{icons.back}</span>
          Zpět na dashboard
        </Link>
      </div>

      {/* Nav — scrollable */}
      <nav
        className="sidebar-nav flex-1 overflow-y-auto overflow-x-hidden px-3 py-1"
        aria-label="Navigace soutěže"
        style={{ scrollbarWidth: "none" }}
      >
        {navGroups.map((group) => (
          <div key={group.label} role="group" aria-label={group.label} className="mb-1">
            <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#374151]" aria-hidden="true">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isActive(item);
              const sharedClass = cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13.5px] font-medium transition-all duration-150",
                active
                  ? "bg-[rgba(255,255,255,0.07)] font-semibold text-white"
                  : "text-[#8896A8] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C4CDD8]"
              );
              const inner = (
                <>
                  <span className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-[#4E5F72]")}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left leading-tight">{item.label}</span>
                  {item.badge !== undefined && (
                    item.badgeType === "live" ? (
                      <span className="ml-auto rounded-md bg-[rgba(59,130,246,0.18)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#93C5FD]">
                        LIVE
                      </span>
                    ) : (
                      <span className="ml-auto rounded-[8px] bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
                        {item.badge}
                      </span>
                    )
                  )}
                </>
              );
              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={sharedClass}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={sharedClass}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="shrink-0 border-t border-[rgba(255,255,255,0.07)] px-3 py-3 flex flex-col gap-0.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13px] font-medium text-[#8896A8] transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C4CDD8]"
        >
          <span className="h-[18px] w-[18px] shrink-0 text-[#4E5F72]">
            {theme === "dark" ? icons.moon : icons.sun}
          </span>
          {theme === "dark" ? "Dark mode" : "Light mode"}
        </button>

        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === "en" ? "cs" : "en")}
          aria-label={locale === "en" ? "Přepnout na češtinu" : "Switch to English"}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13px] font-medium text-[#8896A8] transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C4CDD8]"
        >
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[11px] font-bold text-[#4E5F72]">
            {locale === "en" ? "EN" : "CZ"}
          </span>
          {locale === "en" ? "English" : "Čeština"}
        </button>

        {/* Notifications */}
        <button
          className="flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13px] font-medium text-[#8896A8] transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C4CDD8]"
          aria-label="Upozornění"
        >
          <span className="h-[18px] w-[18px] shrink-0 text-[#4E5F72]">{icons.bell}</span>
          <span className="flex-1 text-left">Upozornění</span>
          <span
            className="flex min-w-[20px] items-center justify-center rounded-[10px] bg-[#EF4444] px-1.5 text-[10px] font-bold text-white"
            style={{ height: 20 }}
          >
            3
          </span>
        </button>

        {/* Profile */}
        <div className="flex w-full items-center gap-3 rounded-xl px-3 py-[9px] text-[13px] font-medium text-[#8896A8] transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C4CDD8] cursor-default">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {user ? getInitials(fullName) : "?"}
          </div>
          <span className="truncate text-[#94A3B8]">{user?.name ?? "Uživatel"}</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-[200] hidden items-center gap-3 border-b border-[rgba(255,255,255,0.07)] bg-[#0B0F1A] px-4 py-2.5 max-lg:flex">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] text-[10px] font-bold text-white"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          DA
        </div>
        <span className="flex-1 truncate text-sm font-bold text-[#F1F5F9]" style={{ fontFamily: "var(--font-sora)" }}>
          {competitionName ?? "Soutěž"}
        </span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Otevřít menu"
          aria-expanded={mobileOpen}
          aria-controls="comp-sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F1F5F9]"
        >
          <span className="h-5 w-5">
            {mobileOpen ? icons.close : icons.hamburger}
          </span>
        </button>
      </header>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[150] bg-black/60 backdrop-blur-[4px] transition-opacity duration-250 max-lg:block lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        id="comp-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-[100] flex w-60 flex-col overflow-hidden bg-[#0B0F1A] transition-transform duration-250 lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
