"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, AlertTriangle, ShieldAlert, Lightbulb, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { ErrorState, EmptyState } from "./StateViews";

interface Notification {
  id: string;
  title: string;
  detail: string;
  severity: "danger" | "warning" | "accent" | "success";
  href: string;
  icon: any;
}

export default function NotificationsDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.allSettled([api.getActiveIncidents(), api.getSecurityEvents()])
      .then(([incidentsRes, securityRes]) => {
        const out: Notification[] = [];

        if (incidentsRes.status === "fulfilled") {
          for (const inc of incidentsRes.value.incidents) {
            if (inc.status === "resolved") continue;
            out.push({
              id: `inc-${inc.id}`,
              title: inc.title,
              detail: `${inc.severity} - ${inc.status} - started ${inc.started_minutes_ago}m ago`,
              severity: inc.severity === "P1" ? "danger" : inc.severity === "P2" ? "warning" : "accent",
              href: `/incidents?id=${inc.id}`,
              icon: AlertTriangle,
            });
          }
        } else {
          setError(
            incidentsRes.reason instanceof ApiError
              ? incidentsRes.reason.message
              : "Failed to load notifications."
          );
        }

        if (securityRes.status === "fulfilled") {
          for (const ev of securityRes.value.events) {
            if (ev.status === "contained") continue;
            out.push({
              id: `sec-${ev.id}`,
              title: ev.title,
              detail: `${ev.severity} severity - ${ev.location} - ${ev.detected_minutes_ago}m ago`,
              severity: ev.severity === "high" ? "danger" : "warning",
              href: "/security",
              icon: ShieldAlert,
            });
          }
        }

        setNotifications(out);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toneClasses: Record<Notification["severity"], string> = {
    danger: "bg-dangerMuted text-danger",
    warning: "bg-warningMuted text-warning",
    accent: "bg-accentMuted text-accent",
    success: "bg-successMuted text-success",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text hover:text-heading transition-colors"
      >
        <Bell size={16} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger border-2 border-surface" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-surface shadow-card overflow-hidden z-30">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-[13px] font-semibold text-heading">Notifications</span>
            {loading && <Loader2 size={14} className="animate-spin text-muted" />}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {error && (
              <div className="p-3">
                <ErrorState message={error} onRetry={load} />
              </div>
            )}
            {!loading && !error && notifications.length === 0 && (
              <div className="p-3">
                <EmptyState message="No active alerts. All incidents resolved and no open security events." />
              </div>
            )}
            {notifications.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    router.push(n.href);
                    setOpen(false);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface2 transition-colors border-b border-border last:border-0"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClasses[n.severity]}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-heading truncate">{n.title}</div>
                    <div className="text-[11px] text-muted truncate">{n.detail}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
