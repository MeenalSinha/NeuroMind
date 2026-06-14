"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Server, Activity, Globe } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";

interface ServiceRow {
  id: string;
  name: string;
  environment: string;
  region: string;
  impact_score: number;
  health: string;
  owner: string;
}

interface TrendData {
  total: number;
  delta_pct_vs_last_week: number;
  trend: number[];
  labels: string[];
}

export default function ObservabilityPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([api.getTopServices(), api.getIncidentTrend()])
      .then(([svc, tr]) => {
        setServices(svc.services);
        setTrend(tr);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load observability data.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const chartData =
    trend?.trend.map((v, i) => ({
      name: trend.labels[i],
      value: v,
    })) || [];

  const healthTone = (h: string) =>
    h === "healthy" ? "success" : h === "degraded" ? "warning" : "danger";

  return (
    <div className="space-y-4">
      <PageToolbar />

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Incident Volume Trend" subtitle="Past 7 days across monitored services" />
          <div className="p-4 pt-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="obsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B8CFF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5B8CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E9EE" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9AA3B2", fontSize: 11 }} axisLine={{ stroke: "#E7E9EE" }} />
                <YAxis tick={{ fill: "#9AA3B2", fontSize: 11 }} axisLine={{ stroke: "#E7E9EE" }} />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E7E9EE",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#1B2330",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#5B8CFF" fill="url(#obsGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Incident Summary" />
          <div className="p-4 pt-0 space-y-3">
            <div className="rounded-xl border border-border bg-surface2 p-3 flex items-center justify-between">
              <span className="text-[12px] text-muted">Total incidents (7d)</span>
              <span className="text-[16px] font-semibold text-heading">{trend?.total ?? "--"}</span>
            </div>
            <div className="rounded-xl border border-border bg-surface2 p-3 flex items-center justify-between">
              <span className="text-[12px] text-muted">vs last week</span>
              <Pill tone={trend && trend.delta_pct_vs_last_week > 0 ? "danger" : "success"}>
                {trend ? `${trend.delta_pct_vs_last_week > 0 ? "+" : ""}${trend.delta_pct_vs_last_week}%` : "--"}
              </Pill>
            </div>
            <div className="rounded-xl border border-border bg-surface2 p-3 flex items-center justify-between">
              <span className="text-[12px] text-muted">Monitored services</span>
              <span className="text-[16px] font-semibold text-heading">{services.length}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Service Health" subtitle="Live health and impact scores across the fleet" />
        <div className="p-4 pt-0 overflow-x-auto">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-4 font-medium">Service</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                  <th className="py-2 pr-4 font-medium">Region</th>
                  <th className="py-2 pr-4 font-medium">Environment</th>
                  <th className="py-2 pr-4 font-medium">Impact Score</th>
                  <th className="py-2 pr-4 font-medium">Health</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-accent" />
                        <span className="text-heading font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{s.owner}</td>
                    <td className="py-2.5 pr-4 text-muted">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {s.region}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{s.environment}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-muted" />
                        <span className="text-heading">{s.impact_score}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Pill tone={healthTone(s.health) as any}>{s.health}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
