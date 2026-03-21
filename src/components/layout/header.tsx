"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { getInitials, getAvatarColor } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { NotificationCenter } from "@/components/shared/notification-center";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useLocale } from "@/contexts/locale-context";

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { t } = useLocale();
  const fullName = user?.name ?? "";
  const avatarColor = getAvatarColor(fullName || "?");

  return (
    <header className="glass flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-6 shadow-[0_1px_8px_rgba(91,141,238,0.06)]">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-base font-semibold text-[var(--text-primary)]">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}

        <LanguageSwitcher />
        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label={t("nav.accountMenu")} className="rounded-full ring-2 ring-[var(--border)] ring-offset-2 ring-offset-transparent transition-all hover:ring-[var(--accent)]/40 focus:outline-none">
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
          <DropdownMenuContent align="end" className="w-48 rounded-[var(--radius-xl)] border-[var(--border)] bg-[var(--surface)] backdrop-blur-lg shadow-[0_8px_32px_rgba(91,141,238,0.12)]">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium text-[var(--text-primary)]">{user?.name}</p>
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
      </div>
    </header>
  );
}
