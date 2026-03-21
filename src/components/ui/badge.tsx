import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white",
        secondary: "bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)]",
        outline: "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]",
        success: "bg-[var(--success-subtle)] text-[var(--success-text)]",
        warning: "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
        destructive: "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]",
        info: "bg-[var(--accent-subtle)] text-[var(--accent)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
