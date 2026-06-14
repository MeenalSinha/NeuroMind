"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis } from "recharts";
import { Card, CardHeader, Skeleton } from "./ui";
import { EmptyState, ErrorState } from "./StateViews";
import { ChevronDown, Cpu, FileSearch, Rocket, ShieldCheck, Activity, ScrollText, Wallet, TrendingUp } from "lucide-react";
import { api, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------
// Top Affected Services
// ---------------------------------------------------------------------
interface ServiceRow {
  id: string;
  name: string;
  impact_score: number;
}

export function TopServicesPanel() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getTopServices()
      .then((res) => setServices(res.services.slice(0, 5)))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load top services.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const max = Math.max(...services.map((s) => s.impact_score), 1);

  return (
    <Card>
      <CardHeader title="Top Affected Services" subtitle="by Impact Score" />
      <div className="px-4 pb-3 space-y-3">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && services.length === 0 && (
          <EmptyState message="No service data available." />
        )}
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => router.push("/observability")}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between text-[12.5px] mb-1">
              <span className="text-heading">{s.name}</span>
              <span className="text-muted">{s.impact_score}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(s.impact_score / max) * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => router.push("/observability")}
          className="w-full rounded-xl border border-border bg-surface2 py-2 text-[12.5px] text-heading"
        >
          View All Services
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Agent Activity
// ---------------------------------------------------------------------
interface AgentRow {
  id: string;
  name: string;
  status: string;
  current_task: string;
  last_active_minutes_ago: number;
}

const AGENT_ICONS: Record<string, any> = {
  sre: Cpu,
  log_analyst: FileSearch,
  metrics: Activity,
  deployment: Rocket,
  security: ShieldCheck,
  compliance: ScrollText,
  cost: Wallet,
  business_impact: TrendingUp,
};

const AGENT_COLORS: Record<string, string> = {
  sre: "bg-accentMuted text-accent",
  log_analyst: "bg-warningMuted text-warning",
  metrics: "bg-accentMuted text-accent",
  deployment: "bg-dangerMuted text-danger",
  security: "bg-successMuted text-success",
  compliance: "bg-accentMuted text-accent",
  cost: "bg-warningMuted text-warning",
  business_impact: "bg-successMuted text-success",
};

export function AgentActivityPanel() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [activeCount, setActiveCount] = useState(18);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getAgents()
      .then((res) => {
        setAgents(res.agents.slice(0, 4));
        setActiveCount(res.active_count || 18);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load agent activity.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader title="Agent Activity" subtitle={`${activeCount} Active`} />
      <div className="px-4 pb-3 space-y-1">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && agents.length === 0 && (
          <EmptyState message="No agent activity available." />
        )}
        {agents.map((a) => {
          const Icon = AGENT_ICONS[(a as any).type] ?? Cpu;
          const tone = AGENT_COLORS[(a as any).type] ?? "bg-surface2 text-muted";
          return (
            <button
              key={a.id}
              onClick={() => router.push("/agents")}
              className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface2 transition-colors text-left"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-heading truncate">{a.name}</div>
                <div className="text-[11px] text-muted truncate">{a.current_task}</div>
              </div>
              <div className="text-[10.5px] text-muted shrink-0">
                {a.last_active_minutes_ago}m ago
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => router.push("/agents")}
          className="w-full rounded-xl border border-border bg-surface2 py-2 text-[12.5px] text-heading"
        >
          View All Agents
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Incident Trend
// ---------------------------------------------------------------------
export function IncidentTrendPanel() {
  const [trend, setTrend] = useState<{ label: string; value: number }[]>([]);
  const [total, setTotal] = useState(24);
  const [delta, setDelta] = useState(14);
  const [timeRange, setTimeRange] = useState("7 Days");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getIncidentTrend()
      .then((res) => {
        setTotal(res.total);
        setDelta(res.delta_pct_vs_last_week);
        setTrend(res.labels.map((l: string, i: number) => ({ label: l, value: res.trend[i] })));
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load incident trend.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader
        title="Incident Trend"
        action={
          <div className="relative">
            <button 
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              onBlur={() => setTimeout(() => setShowTimeDropdown(false), 150)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-[12px] text-heading hover:bg-surface3 transition-colors"
            >
              {timeRange} <ChevronDown size={13} className="text-muted" />
            </button>

            {showTimeDropdown && (
              <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border bg-surface shadow-lg z-10 overflow-hidden py-1">
                {["7 Days", "14 Days", "30 Days"].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setTimeRange(option);
                      setShowTimeDropdown(false);
                      // In a real app we would reload data here
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface2 transition-colors ${
                      timeRange === option ? "text-primary font-medium bg-primary/5" : "text-heading"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />
      <div className="px-4">
        <div className="text-2xl font-semibold text-heading">{total}</div>
        <div className="text-[12px] text-muted mb-2">Total Incidents</div>
        <div className="text-[11px] text-danger mb-2">
          {delta >= 0 ? "+" : ""}
          {delta}% vs last week
        </div>
      </div>
      <div className="h-[160px] px-2 pb-3">
        {loading && <Skeleton className="h-full w-full" />}
        {error && (
          <div className="h-full flex items-center justify-center">
            <ErrorState message={error} onRetry={load} />
          </div>
        )}
        {!loading && !error && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="incidentTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                fontSize: 12,
                color: "#0F172A",
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} fill="url(#incidentTrendFill)" />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
