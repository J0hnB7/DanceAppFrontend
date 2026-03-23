import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white font-semibold shadow-[0_1px_4px_rgba(10,132,255,0.35)] hover:bg-[var(--accent-hover)] hover:-translate-y-px active:scale-[0.98]",
        accent:
          "bg-gradient-to-r from-[#3395ff] to-[#0a84ff] text-white font-semibold shadow-[0_1px_4px_rgba(10,132,255,0.35)] hover:opacity-90 hover:-translate-y-px active:scale-[0.98]",
        destructive:
          "bg-[var(--destructive)] text-white font-semibold hover:opacity-90 hover:-translate-y-px active:scale-[0.98]",
        outline:
          "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] hover:border-[var(--accent)]/40 active:scale-[0.98]",
        secondary:
          "bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] active:scale-[0.98]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-12 rounded-[var(--radius-lg)] px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, asChild = false, ...props }, ref) => {
    const shared = {
      ref,
      className: cn(buttonVariants({ variant, size }), className),
      ...props,
    } as React.ComponentPropsWithRef<"button">;

    if (asChild) {
      return <Slot {...shared}>{children}</Slot>;
    }

    return (
      <button {...shared} disabled={disabled || loading}>
        {loading && (
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
