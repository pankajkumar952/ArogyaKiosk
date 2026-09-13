import { cn } from "@/lib/utils";
import { forwardRef } from "react";

// ─── Button ─────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      icon,
      iconPosition = "left",
      fullWidth,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2.5 font-semibold rounded-xl transition-all duration-200 active:scale-95 select-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2";

    const variants = {
      primary:
        "bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md disabled:bg-neutral-300 disabled:text-neutral-500",
      secondary:
        "bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 disabled:opacity-50",
      ghost:
        "bg-transparent text-neutral-700 hover:bg-neutral-100 disabled:opacity-40",
      outline:
        "bg-transparent text-neutral-700 border-2 border-neutral-300 hover:border-brand-400 hover:bg-brand-50 disabled:opacity-40",
      danger:
        "bg-error-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50",
      success:
        "bg-success-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-50",
    };

    const sizes = {
      sm:  "px-4 py-2 text-sm min-h-[40px]",
      md:  "px-6 py-3 text-base min-h-[48px]",
      lg:  "px-8 py-4 text-lg min-h-[56px]",
      xl:  "px-10 py-5 text-xl min-h-[64px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon && iconPosition === "left" && icon
        )}
        {children}
        {!loading && icon && iconPosition === "right" && icon}
      </button>
    );
  }
);
Button.displayName = "Button";

// ─── Card ────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
  selected?: boolean;
}

export function Card({
  elevated,
  interactive,
  selected,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white border border-neutral-200 transition-all duration-200",
        elevated && "shadow-elevated",
        interactive &&
          "cursor-pointer hover:border-brand-300 hover:shadow-md active:scale-[0.98]",
        selected &&
          "border-brand-500 bg-brand-50 ring-2 ring-brand-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-neutral-100 text-neutral-700",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    error:   "bg-error-50 text-error-600",
    info:    "bg-brand-50 text-brand-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────
interface ProgressBarProps {
  value: number;  // 0-100
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showPercent,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full", className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-neutral-700">{label}</span>
          )}
          {showPercent && (
            <span className="text-sm text-neutral-500">{pct}%</span>
          )}
        </div>
      )}
      <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Icon wrapper ─────────────────────────────────────────────────
interface IconBoxProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "success" | "warning" | "error" | "neutral";
  className?: string;
}

export function IconBox({
  children,
  size = "md",
  variant = "brand",
  className,
}: IconBoxProps) {
  const sizes = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-20 w-20" };
  const variants = {
    brand:   "bg-brand-50 text-brand-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    error:   "bg-error-50 text-error-600",
    neutral: "bg-neutral-100 text-neutral-600",
  };
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl text-2xl",
        sizes[size],
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  if (!label)
    return <hr className="border-neutral-200 my-4" />;
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 border-t border-neutral-200" />
      <span className="text-sm text-neutral-400 font-medium">{label}</span>
      <div className="flex-1 border-t border-neutral-200" />
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600",
        className
      )}
    />
  );
}
