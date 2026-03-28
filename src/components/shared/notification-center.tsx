"use client";

import Link from "next/link";
import { Bell, CheckCheck, X, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAlertsStore, type AlertLevel } from "@/store/alerts-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTime } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

const levelIcon: Record<AlertLevel, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-[var(--accent)]" />,
  success: <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />,
  warning: <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />,
  error: <AlertCircle className="h-4 w-4 text-[var(--destructive)]" />,
};

const levelBg: Record<AlertLevel, string> = {
  info: "bg-blue-50 border-blue-100",
  success: "bg-green-50 border-green-100",
  warning: "bg-amber-50 border-amber-100",
  error: "bg-red-50 border-red-100",
};

interface NotificationCenterProps {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function NotificationCenter({ side, align = "end", sideOffset = 8 }: NotificationCenterProps) {
  const { alerts, markRead, markAllRead, removeAlert, unreadCount } = useAlertsStore();
  const { t } = useLocale();
  const count = unreadCount();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label={`${t("notificationCenter.title")}${count > 0 ? ` (${count} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--destructive)] text-[10px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side={side} align={align} className="w-96 p-0 shadow-xl" sideOffset={sideOffset}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            {t("notificationCenter.title")}
            {count > 0 && (
              <span className="ml-2 rounded-full bg-[var(--destructive)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </h3>
          {count > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notificationCenter.markAllRead")}
            </button>
          )}
        </div>

        {/* Alert list */}
        <div className="max-h-[420px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Bell className="h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-secondary)]">{t("notificationCenter.noNotifications")}</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "group relative flex gap-3 border-b border-[var(--border)] p-4 transition-colors last:border-0",
                  alert.read ? "bg-transparent" : "bg-[var(--accent)]/3"
                )}
                onClick={() => markRead(alert.id)}
              >
                <div className="mt-0.5 shrink-0">{levelIcon[alert.level]}</div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-snug", alert.read ? "text-[var(--text-secondary)]" : "font-medium text-[var(--text-primary)]")}>
                    {alert.title}
                  </p>
                  {alert.description && (
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{alert.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {formatTime(alert.createdAt.toISOString())}
                    </span>
                    {alert.actionLabel && alert.actionHref && (
                      <Link
                        href={alert.actionHref}
                        className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {alert.actionLabel} →
                      </Link>
                    )}
                  </div>
                </div>
                {/* Dismiss button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }}
                  className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] group-hover:flex"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {/* Unread dot */}
                {!alert.read && (
                  <div className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--accent)]" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
