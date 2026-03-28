"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Trophy, Users, BarChart3, Settings,
  FlaskConical, ClipboardList, Archive,
  Bell, CheckCheck, X, AlertCircle, CheckCircle2, Info, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { UserDto } from "@/lib/api/auth";
import { useLocale } from "@/contexts/locale-context";
import { useTheme } from "@/contexts/theme-context";
import { useAlertsStore } from "@/store/alerts-store";
import { getInitials, getAvatarColor, formatTime } from "@/lib/utils";

type Role = UserDto["role"];

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
  testModeOnly?: boolean;
  exact?: boolean;
  group: "main" | "competitions" | "admin";
}

const navItems: NavItem[] = [
  { label: "nav.competitions",    href: "/dashboard",                   icon: Trophy,        roles: ["ORGANIZER", "ADMIN"], exact: true, group: "main" },
  { label: "nav.analytics",       href: "/dashboard/analytics",         icon: BarChart3,     roles: ["ORGANIZER", "ADMIN"],              group: "main" },
  { label: "nav.archive",         href: "/dashboard/archive",           icon: Archive,       roles: ["ORGANIZER", "ADMIN"],              group: "main" },
  { label: "nav.myRegistrations", href: "/dashboard/my-registrations",  icon: ClipboardList,                                            group: "competitions" },
  { label: "nav.participants",    href: "/dashboard/participants",      icon: Users,         roles: ["ORGANIZER", "ADMIN"],              group: "competitions" },
  { label: "nav.settings",        href: "/dashboard/settings",          icon: Settings,                                                  group: "admin" },
  { label: "nav.seeder",          href: "/dashboard/seed",              icon: FlaskConical,  testModeOnly: true,                         group: "admin" },
];

const GROUP_LABEL_KEYS: Record<string, string> = {
  main: "nav.groupMain",
  competitions: "nav.groupCompetitions",
  admin: "nav.groupAdmin",
};

const icons = {
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  sun:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { alerts, markRead, markAllRead, removeAlert } = useAlertsStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const fullName = user?.name ?? "";
  const avatarColor = getAvatarColor(fullName || "?");
  const notifCount = alerts.filter((a) => !a.read).length;

  const visibleItems = navItems.filter(
    (item) =>
      (!item.roles || (user?.role && item.roles.includes(user.role))) &&
      (!item.testModeOnly || isTestMode)
  );

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href || pathname.startsWith("/dashboard/competitions");
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const groups = ["main", "competitions", "admin"] as const;

  return (
    <aside
      className="flex h-full w-[240px] shrink-0 flex-col overflow-hidden"
      style={{
        background: "var(--sidebar-bg, #0B0F1A)",
        borderRight: "1px solid var(--sidebar-border, rgba(255,255,255,0.07))",
      }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-3 pt-4">
        {/* Logo row */}
        <div className="mb-3 flex items-center gap-2.5">
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

        <div className="mb-2 h-px bg-[rgba(255,255,255,0.07)]" />

        {/* Utility icons row */}
        <div className="flex items-center gap-0.5 px-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5F72] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#94A3B8]"
          >
            {theme === "dark" ? icons.moon : icons.sun}
          </button>

          {/* Language */}
          <button
            onClick={() => setLocale(locale === "en" ? "cs" : "en")}
            aria-label={locale === "en" ? "Přepnout na češtinu" : "Switch to English"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5F72] text-[10px] font-bold transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#94A3B8]"
          >
            {locale === "en" ? "EN" : "CZ"}
          </button>

          {/* Bell */}
          <button
            aria-label={t("nav.notifications")}
            onClick={() => { setNotifOpen((v) => !v); setUserMenuOpen(false); }}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#4E5F72] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#94A3B8]"
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <button
            aria-label={t("nav.accountMenu")}
            onClick={() => { setUserMenuOpen((v) => !v); setNotifOpen(false); }}
            className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: avatarColor }}
          >
            {user ? getInitials(fullName) : "?"}
          </button>
        </div>

        {/* Notifications panel */}
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-[110]" onClick={() => setNotifOpen(false)} />
            <div className="relative z-[120] mx-1 mt-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0F1624] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.07)]">
                <span className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                  {t("nav.notifications")}
                  {notifCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{notifCount}</span>
                  )}
                </span>
                {notifCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-[#4E5F72] hover:text-[#94A3B8] transition-colors">
                    <CheckCheck className="h-3 w-3" /> {t("nav.markAllRead")}
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Bell className="h-6 w-6 text-[#374151]" />
                    <p className="text-[12px] text-[#4E5F72]">{t("nav.noNotifications")}</p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const levelIcon = {
                      info:    <Info className="h-3.5 w-3.5 text-blue-400" />,
                      success: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
                      warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
                      error:   <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
                    }[alert.level];
                    return (
                      <div
                        key={alert.id}
                        onClick={() => markRead(alert.id)}
                        className="group relative flex gap-2.5 border-b border-[rgba(255,255,255,0.05)] p-3 last:border-0 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      >
                        <div className="mt-0.5 shrink-0">{levelIcon}</div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] leading-snug ${alert.read ? "text-[#64748B]" : "font-medium text-[#C4CDD8]"}`}>
                            {alert.title}
                          </p>
                          {alert.description && (
                            <p className="mt-0.5 text-[11px] text-[#4E5F72]">{alert.description}</p>
                          )}
                          <p className="mt-1 text-[10px] text-[#374151]">{formatTime(alert.createdAt.toISOString())}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }}
                          className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-[#374151] hover:text-[#94A3B8] transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {!alert.read && (
                          <div className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-blue-400" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* User menu panel */}
        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-[110]" onClick={() => setUserMenuOpen(false)} />
            <div className="relative z-[120] mx-1 mt-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0F1624] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.07)]">
                <p className="text-[13px] font-semibold text-[#F1F5F9] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#64748B] truncate">{user?.email}</p>
              </div>
              <Link
                href="/dashboard/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center px-3 py-2 text-[13px] text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)] hover:text-white transition-colors"
              >
                {t("settings.title")}
              </Link>
              <div className="h-px bg-[rgba(255,255,255,0.07)]" />
              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="flex w-full items-center px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                {t("nav.logout")}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mx-4 h-px bg-[rgba(255,255,255,0.07)]" />

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-1" style={{ scrollbarWidth: "none" }}>
        {groups.map((group) => {
          const items = visibleItems.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-1" role="group" aria-label={t(GROUP_LABEL_KEYS[group])}>
              <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#374151]">
                {t(GROUP_LABEL_KEYS[group])}
              </p>
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-[9px] text-[13.5px] font-medium transition-all duration-150",
                      active
                        ? "bg-[rgba(255,255,255,0.07)] font-semibold text-white"
                        : "text-[#8896A8] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C4CDD8]"
                    )}
                  >
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      style={{ color: active ? "#fff" : "#4E5F72" }}
                    />
                    {t(item.label)}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
