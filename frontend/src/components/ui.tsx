import clsx from "clsx";
import { ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between p-4 pb-2">
      <div>
        <h3 className="text-[14px] font-semibold text-heading">{title}</h3>
        {subtitle && <p className="text-[12px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}) {
  const tones: Record<string, string> = {
    default: "bg-surface2 text-text border-border",
    success: "bg-successMuted text-success border-successMuted",
    warning: "bg-warningMuted text-warning border-warningMuted",
    danger: "bg-dangerMuted text-danger border-dangerMuted",
    accent: "bg-accentMuted text-accent border-accentMuted",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function SeverityPill({ severity }: { severity: string }) {
  const tone =
    severity === "P1"
      ? "danger"
      : severity === "P2"
      ? "warning"
      : "accent";
  return <Pill tone={tone as any}>{severity}</Pill>;
}




export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-surface2", className)} />;
}
