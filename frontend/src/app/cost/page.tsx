"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Wallet, TrendingUp, FileText, AlertCircle } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";

interface CostItem {
  service: string;
  current_cost: number;
  previous_cost: number;
  delta_pct: number;
}

interface CostBreakdown {
  items: CostItem[];
  total_current: number;
  total_previous: number;
  overall_delta_pct: number;
}

interface CostExplain {
  question: string;
  summary: string;
  root_cause: string;
  correlated_incident: string;
  recommended_actions: string[];
}

export default function CostPage() {
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explain, setExplain] = useState<CostExplain | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [showExplain, setShowExplain] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getCostBreakdown()
      .then(setBreakdown)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load cost breakdown.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleExplain() {
    setShowExplain(true);
    setExplainError(null);
    if (explain) return;
    setExplainLoading(true);
    try {
      const d = await api.explainCost();
      setExplain(d);
    } catch (e) {
      setExplainError(
        e instanceof ApiError ? e.message : "Failed to generate cost explanation."
      );
    } finally {
      setExplainLoading(false);
    }
  }

  const chartData =
    breakdown?.items.map((i) => ({
      name: i.service.replace("svc-", ""),
      current: i.current_cost,
      previous: i.previous_cost,
    })) || [];

  return (
    <div className="space-y-4">
      <PageToolbar />

      {error && <ErrorState message={error} onRetry={load} />}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && !error && (
      <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-accent" />
            <p className="text-[12px] text-muted">Current Spend</p>
          </div>
          <p className="text-[24px] font-semibold text-heading">
            ${breakdown ? breakdown.total_current.toLocaleString() : "--"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-muted" />
            <p className="text-[12px] text-muted">Previous Period</p>
          </div>
          <p className="text-[24px] font-semibold text-heading">
            ${breakdown ? breakdown.total_previous.toLocaleString() : "--"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-danger" />
            <p className="text-[12px] text-muted">Overall Change</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[24px] font-semibold text-danger">
              {breakdown ? `+${breakdown.overall_delta_pct}%` : "--"}
            </p>
            <button
              onClick={handleExplain}
              className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface2 px-2.5 py-1 text-[11px] text-heading hover:border-accent/40"
            >
              <FileText className="w-3 h-3" /> Explain
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader title="Cost Breakdown by Service" subtitle="Current vs previous period" />
          <div className="p-4 pt-0 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Bar dataKey="previous" fill="#E7E9EE" radius={[4, 4, 0, 0]} name="Previous" />
                <Bar dataKey="current" fill="#FF5A1F" radius={[4, 4, 0, 0]} name="Current" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Item list */}
        <Card>
          <CardHeader title="Service Costs" subtitle="Week-over-week change" />
          <div className="p-4 pt-0 space-y-2">
            {breakdown?.items.map((item) => (
              <div
                key={item.service}
                className="flex items-center justify-between rounded-lg border border-border bg-surface2 px-3 py-2"
              >
                <div>
                  <p className="text-[12px] text-heading font-medium">{item.service}</p>
                  <p className="text-[11px] text-muted">${item.current_cost.toLocaleString()}</p>
                </div>
                <Pill tone={item.delta_pct > 10 ? "danger" : item.delta_pct > 0 ? "warning" : "success"}>
                  {item.delta_pct > 0 ? "+" : ""}
                  {item.delta_pct}%
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
      </>
      )}

      {/* Explain report */}
      {showExplain && (
        <Card>
          <CardHeader
            title="Executive Cost Report"
            subtitle={explain?.question || "Generating analysis..."}
          />
          <div className="p-4 pt-0">
            {explainError ? (
              <ErrorState message={explainError} onRetry={handleExplain} />
            ) : explainLoading || !explain ? (
              <p className="text-[12px] text-muted">Analyzing cost trends across services...</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-surface2 p-4">
                  <p className="text-[13px] text-heading leading-relaxed">{explain.summary}</p>
                </div>

                <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <h4 className="text-[13px] font-semibold text-heading">Root Cause</h4>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{explain.root_cause}</p>
                  <div className="mt-2">
                    <Pill tone="accent">{explain.correlated_incident}</Pill>
                  </div>
                </div>

                <div>
                  <h4 className="text-[13px] font-semibold text-heading mb-2">Recommended Actions</h4>
                  <div className="space-y-2">
                    {explain.recommended_actions.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-border bg-surface2 px-3 py-2 text-[12px] text-heading"
                      >
                        <span className="text-accent font-semibold">{i + 1}.</span>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
