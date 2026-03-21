import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("sk-SK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

export function getRoundStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "CALCULATED": return "success";
    case "IN_PROGRESS":
    case "OPEN": return "warning";
    default: return "secondary";
  }
}

export function getCompetitionStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "PUBLISHED":
    case "ONGOING": return "success";
    case "DRAFT": return "secondary";
    case "COMPLETED": return "outline";
    default: return "secondary";
  }
}

export function getSectionStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "COMPLETED": return "success";
    case "IN_PROGRESS": return "warning";
    default: return "secondary";
  }
}

/** Safe window.location.origin — returns empty string during SSR. */
export function getOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/** Extract a human-readable error message from any thrown value. */
export function getErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    // Axios error: extract backend response body message
    const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
    const backendMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.error;
    if (backendMsg) return backendMsg;
    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      return (err as { message: string }).message || fallback;
    }
  }
  return fallback;
}
