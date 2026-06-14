"use client";

import { useEffect, useState } from "react";
import { Database, Cpu, ShieldAlert, Bell, ScrollText, Key, RefreshCw } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState, EmptyState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";

interface HealthStatus {
  status: string;
  mock_ai: boolean;
  mock_splunk: boolean;
  splunk_configured: boolean;
  anthropic_configured: boolean;
}

interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: number;
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setHealthError(null);
    setAuditError(null);
    Promise.allSettled([api.getHealth(), api.getAuditLog()]).then(([h, a]) => {
      if (h.status === "fulfilled") setHealth(h.value);
      else
        setHealthError(
          h.reason instanceof ApiError ? h.reason.message : "Failed to load system status."
        );

      if (a.status === "fulfilled") setAudit(a.value.entries);
      else
        setAuditError(
          a.reason instanceof ApiError ? a.reason.message : "Failed to load audit log."
        );

      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  const aiTone = health && !health.mock_ai && health.anthropic_configured ? "success" : "warning";
  const aiLabel =
    health && !health.mock_ai && health.anthropic_configured
      ? "Live (Claude tool-use agentic loop)"
      : "Mock mode (deterministic trace, real tool calls)";

  const splunkTone = health && !health.mock_splunk && health.splunk_configured ? "success" : "warning";
  const splunkLabel =
    health && !health.mock_splunk && health.splunk_configured
      ? "Live Splunk REST API"
      : "Mock mode (realistic synthetic telemetry, same response shape)";

  const sections = [
    {
      title: "AI Layer",
      icon: Cpu,
      items: [
        { label: "Agentic investigation loop", value: aiLabel, tone: aiTone as any },
        {
          label: "Anthropic API key",
          value: health?.anthropic_configured ? "Configured" : "Not configured",
          tone: health?.anthropic_configured ? "success" : "default",
        },
      ],
    },
    {
      title: "Persistence",
      icon: Database,
      items: [
        { label: "Investigations, learnings, agent memory, audit log", value: "SQLite (neuromind.db)", tone: "success" as const },
      ],
    },
    {
      title: "Splunk Integration",
      icon: ShieldAlert,
      items: [
        { label: "Search / Observability / SOAR", value: splunkLabel, tone: splunkTone as any },
        {
          label: "Splunk host configured",
          value: health?.splunk_configured ? "Yes" : "No",
          tone: health?.splunk_configured ? "success" : "default",
        },
      ],
    },
    {
      title: "Authentication",
      icon: Key,
      items: [
        { label: "Write endpoints (investigate, resolve, contain)", value: "Bearer token required", tone: "success" as const },
        { label: "Read endpoints", value: "Open (no auth)", tone: "default" as const },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        { label: "Incident alerts", value: "Enabled", tone: "success" as const },
        { label: "Weekly cost digest", value: "Enabled", tone: "success" as const },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <PageToolbar />

      <Card>
        <CardHeader
          title="Settings"
          subtitle="Live integration status, read directly from the backend. Configure real credentials in backend/.env to switch any of these from mock to live."
          action={
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-[12px] text-heading hover:bg-border/40 disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          }
        />
        <div className="p-4 pt-0 space-y-4">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {healthError && <ErrorState message={healthError} onRetry={load} />}
          {!loading && !healthError && sections.map((s) => (
            <div key={s.title}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-4 h-4 text-accent" />
                <h4 className="text-[13px] font-semibold text-heading">{s.title}</h4>
              </div>
              <div className="space-y-2">
                {s.items.map((it) => (
                  <div
                    key={it.label}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface2 px-3 py-2"
                  >
                    <span className="text-[12px] text-heading">{it.label}</span>
                    <Pill tone={it.tone}>{it.value}</Pill>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Audit Log"
          subtitle="Every state-changing action (investigate, resolve, contain) is recorded with the acting principal and timestamp."
        />
        <div className="p-4 pt-0">
          {loading && <Skeleton className="h-40 w-full" />}
          {auditError && <ErrorState message={auditError} onRetry={load} />}
          {!loading && !auditError && audit.length === 0 && (
            <EmptyState message="No audit entries yet. Actions like investigating an incident or running a containment playbook will appear here." />
          )}
          {!loading && !auditError && audit.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 pr-4 font-medium">Time</th>
                    <th className="py-2 pr-4 font-medium">Actor</th>
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Target</th>
                    <th className="py-2 pr-4 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 text-muted whitespace-nowrap">
                        {new Date(entry.created_at * 1000).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-heading">{entry.actor}</td>
                      <td className="py-2.5 pr-4">
                        <Pill tone={entry.action === "auth_failed" ? "danger" : "accent"}>
                          <ScrollText size={10} /> {entry.action}
                        </Pill>
                      </td>
                      <td className="py-2.5 pr-4 text-heading font-mono">{entry.target || "-"}</td>
                      <td className="py-2.5 pr-4 text-muted">{entry.detail || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
