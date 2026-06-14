"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Users } from "lucide-react";
import { Card } from "./ui";
import Sparkline from "./Sparkline";
import { api } from "@/lib/api";

interface Kpi {
  label: string;
  value: string;
  delta: string;
  direction: "up" | "down";
  good: "up" | "down";
  trend: number[];
}

const FALLBACK: Kpi[] = [
  { label: "Incidents", value: "24", delta: "2 vs last week", direction: "up", good: "down", trend: [3, 5, 4, 6, 5, 7, 6] },
  { label: "MTTR", value: "34m", delta: "18% vs last week", direction: "down", good: "down", trend: [55, 50, 48, 44, 40, 37, 34] },
  { label: "Alerts", value: "1.2K", delta: "12% vs last week", direction: "up", good: "down", trend: [900, 950, 1000, 1050, 1100, 1150, 1200] },
  { label: "AI Resolutions", value: "78%", delta: "16% vs last week", direction: "up", good: "up", trend: [55, 60, 64, 68, 71, 75, 78] },
];

interface AgentConfidence {
  id: string;
  confidence: number;
  status: string;
}

export default function KpiRow() {
  const [kpis, setKpis] = useState<Kpi[]>(FALLBACK);
  const [activeAgents, setActiveAgents] = useState(0);
  const [agentBars, setAgentBars] = useState<AgentConfidence[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getSummary()
      .then((res) => {
        const k = res.kpis;
        setKpis([
          { label: "Incidents", value: String(k.incidents.value), delta: `${k.incidents.delta} vs last week`, direction: k.incidents.direction, good: "down", trend: k.incidents.trend },
          { label: "MTTR", value: `${k.mttr_minutes.value}m`, delta: `${Math.abs(k.mttr_minutes.delta)}% vs last week`, direction: k.mttr_minutes.direction, good: "down", trend: k.mttr_minutes.trend },
          { label: "Alerts", value: `${(k.alerts.value / 1000).toFixed(1)}K`, delta: `${k.alerts.delta}% vs last week`, direction: k.alerts.direction, good: "down", trend: k.alerts.trend },
          { label: "AI Resolutions", value: `${k.ai_resolutions_pct.value}%`, delta: `${k.ai_resolutions_pct.delta}% vs last week`, direction: k.ai_resolutions_pct.direction, good: "up", trend: k.ai_resolutions_pct.trend },
        ]);
        setActiveAgents(k.active_agents.value);
      })
      .catch(() => setError(true));

    api
      .getAgents()
      .then((res) => {
        setAgentBars(
          res.agents.map((a: any) => ({
            id: a.id,
            confidence: a.confidence ?? 0,
            status: a.status,
          }))
        );
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warningMuted px-3 py-2 text-[12px] text-warning">
          Showing cached values - could not reach the NeuroMind API. Check that the
          backend is running.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {kpis.map((kpi) => {
        const isGood =
          (kpi.direction === "up" && kpi.good === "up") ||
          (kpi.direction === "down" && kpi.good === "down");
        const color = isGood ? "#22C55E" : "#EF4444";
        return (
          <Card key={kpi.label} className="p-4">
            <div className="text-[12px] text-text mb-1">{kpi.label}</div>
            <div className="text-2xl font-semibold text-heading mb-1">{kpi.value}</div>
            <div
              className={`flex items-center gap-1 text-[11px] mb-2 ${
                isGood ? "text-success" : "text-danger"
              }`}
            >
              {kpi.direction === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {kpi.delta}
            </div>
            <Sparkline data={kpi.trend} color={color} />
          </Card>
        );
      })}

      <Card className="p-4">
        <div className="text-[12px] text-text mb-1">Active Agents</div>
        <div className="text-2xl font-semibold text-heading mb-1">{activeAgents}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-success mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
          Running
        </div>
        {agentBars.length > 0 ? (
          <div className="flex items-end gap-1 h-10" title="Agent confidence levels">
            {agentBars.map((a) => (
              <div
                key={a.id}
                className={`flex-1 rounded-sm ${
                  a.status === "running" ? "bg-accent" : "bg-accent/25"
                }`}
                style={{ height: `${Math.max(a.confidence * 100, 12)}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-10 text-muted">
            <Users size={20} />
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
