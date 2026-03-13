import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      {icon && <div className="text-[var(--text-tertiary)]">{icon}</div>}
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        {description && <p className="text-sm text-[var(--text-secondary)] max-w-xs">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
