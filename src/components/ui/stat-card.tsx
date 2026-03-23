import { cn } from "@/lib/utils";

interface StatCardProps {
  value: number | string;
  label: string;
  sub?: string;
  /** Tailwind bg-* class for the badge circle, e.g. "bg-blue-500" */
  color?: string;
  icon?: React.ElementType;
  className?: string;
}

/**
 * Reusable stat badge card used across Dashboard, Analytics, Participants, etc.
 * Shows a coloured circle with a value, a label, and an optional subtitle.
 */
export function StatCard({ value, label, sub, color = "bg-[var(--accent)]", icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md",
      className
    )}>
      <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm", color)}>
        {Icon ? <Icon className="h-4 w-4" /> : value}
      </div>
      <p className="font-semibold text-[var(--text-primary)] leading-tight" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>
        {label}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{sub}</p>}
    </div>
  );
}
