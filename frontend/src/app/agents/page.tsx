"use client";

import { useEffect, useState } from "react";
import { Card, Pill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { api, ApiError } from "@/lib/api";
import { Bot, Cpu, FileSearch, Activity, Rocket, ShieldCheck, ScrollText, Wallet, TrendingUp, History } from "lucide-react";

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

interface AgentRow {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  current_task: string;
  confidence: number;
  last_active_minutes_ago: number;
  total_investigations: number;
  last_finding?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getAgents()
      .then((res) => {
        setAgents(res.agents);
        setActiveCount(res.active_count);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load agent roster.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-heading flex items-center gap-2">
            <Bot size={20} className="text-success" />
            Multi-Agent Command Center
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {activeCount} of {agents.length} agents currently running
          </p>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const Icon = AGENT_ICONS[agent.type] ?? Bot;
          const running = agent.status === "running";
          return (
            <Card key={agent.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-accent">
                  <Icon size={18} />
                </div>
                <Pill tone={running ? "success" : "default"}>
                  {running && <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot mr-1" />}
                  {agent.status}
                </Pill>
              </div>
              <h3 className="text-[14px] font-semibold text-heading mb-1">{agent.name}</h3>
              <p className="text-[12px] text-muted mb-3 leading-relaxed">{agent.description}</p>

              <div className="rounded-xl border border-border bg-surface2 p-3 mb-3">
                <div className="text-[11px] text-muted mb-0.5">Current task</div>
                <div className="text-[12.5px] text-heading">{agent.current_task}</div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                <span>Confidence</span>
                <span className="text-heading font-medium">
                  {Math.round(agent.confidence * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${agent.confidence * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Last active {agent.last_active_minutes_ago}m ago</span>
                {agent.total_investigations > 0 && (
                  <span className="flex items-center gap-1 text-accent">
                    <History size={11} /> {agent.total_investigations} run
                    {agent.total_investigations === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {agent.last_finding && (
                <div className="mt-2 rounded-lg border border-border bg-surface2 p-2">
                  <div className="text-[10px] text-muted mb-0.5">Last finding</div>
                  <div className="text-[11.5px] text-heading leading-relaxed line-clamp-2">
                    {agent.last_finding}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      )}

      <Card className="p-5">
        <h3 className="text-[14px] font-semibold text-heading mb-3">Agent Collaboration</h3>
        <p className="text-[12.5px] text-muted leading-relaxed">
          When an investigation is launched, agents work together: the Log Analyst Agent
          and Metrics Agent gather raw evidence in parallel, the Deployment Agent
          correlates recent releases, the SRE Agent synthesizes findings into a
          hypothesis tree, and the Business Impact Agent translates the result into
          revenue and customer impact. All findings and actions are written back to the
          enterprise memory graph so future investigations can reference them.
        </p>
      </Card>
    </div>
  );
}
