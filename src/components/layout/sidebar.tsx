"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Trophy,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  FlaskConical,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { UserDto } from "@/lib/api/auth";
import { useLocale } from "@/contexts/locale-context";
import { NotificationCenter } from "@/components/shared/notification-center";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, getAvatarColor } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Role = UserDto["role"];

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
  testModeOnly?: boolean;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { label: "nav.competitions", href: "/dashboard", icon: Trophy, roles: ["ORGANIZER", "ADMIN"], exact: true },
  { label: "nav.myRegistrations", href: "/dashboard/my-registrations", icon: ClipboardList },
  { label: "nav.participants", href: "/dashboard/participants", icon: Users, roles: ["ORGANIZER", "ADMIN"] },
  { label: "nav.analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["ORGANIZER", "ADMIN"] },
  { label: "nav.admin", href: "/admin", icon: Shield, roles: ["ADMIN"] },
  { label: "nav.settings", href: "/dashboard/settings", icon: Settings },
  { label: "nav.seeder", href: "/dashboard/seed", icon: FlaskConical, testModeOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t, locale, setLocale } = useLocale();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const avatarColor = getAvatarColor(fullName || "?");

  const visibleItems = navItems.filter(
    (item) =>
      (!item.roles || (user?.role && item.roles.includes(user.role))) &&
      (!item.testModeOnly || isTestMode)
  );

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href || pathname.startsWith("/dashboard/competitions");
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <aside className="glass flex h-screen w-[72px] flex-col items-center border-r py-5">
      {/* Nav */}
      <nav className="flex flex-1 flex-col items-center gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] transition-all duration-200",
                active
                  ? "bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(59,95,232,0.3)]"
                  : "text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--accent)]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                {t(item.label)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-1">
        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === "en" ? "cs" : "en")}
          title={locale === "en" ? "Switch to Czech" : "Přepnout do angličtiny"}
          className="group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] text-[var(--text-tertiary)] transition-all duration-200 hover:bg-[var(--surface-secondary)] hover:text-[var(--accent)]"
        >
          <span className="text-base leading-none">{locale === "en" ? "🇨🇿" : "🇬🇧"}</span>
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
            {locale === "en" ? "CZ" : "EN"}
          </span>
        </button>

        {/* Notifications */}
        <div className="flex h-11 w-11 items-center justify-center">
          <NotificationCenter />
        </div>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] transition-all duration-200 hover:bg-white/80 hover:shadow-[0_2px_8px_rgba(91,141,238,0.15)] focus:outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {user ? getInitials(fullName) : "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48 rounded-[var(--radius-xl)] border-white/60 bg-white/90 backdrop-blur-lg shadow-[0_8px_32px_rgba(91,141,238,0.12)]">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium text-[var(--text-primary)]">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">{t("settings.title")}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => logout()}>
              {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout */}
        <button
          onClick={() => logout()}
          title={t("nav.logout")}
          className="group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] text-[var(--text-tertiary)] transition-all duration-200 hover:bg-red-50 hover:text-[var(--destructive)]"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
            {t("nav.logout")}
          </span>
        </button>
      </div>
    </aside>
  );
}
