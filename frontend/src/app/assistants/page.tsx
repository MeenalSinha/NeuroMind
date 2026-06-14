"use client";

import { useEffect, useState } from "react";
import { Cpu, FileSearch, Activity, Rocket, ShieldCheck, ScrollText, Wallet, TrendingUp, MessageSquare } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";

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
}

export default function AssistantsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function load() {
    setLoading(true);
    setError(null);
    api
      .getAgents()
      .then((d) => setAgents(d.agents))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load assistants.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <PageToolbar />

      <Card>
        <CardHeader
          title="AI Assistants"
          subtitle="Conversational entry points into NeuroMind's specialist agents"
        />
        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 col-span-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          )}
          {error && <ErrorState message={error} onRetry={load} />}
          {agents.map((a) => {
            const Icon = AGENT_ICONS[a.type] || Cpu;
            return (
              <div key={a.id} className="rounded-xl border border-border bg-surface2 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-primaryMuted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <Pill tone={a.status === "running" ? "success" : "default"}>{a.status}</Pill>
                </div>
                <p className="text-[13px] font-semibold text-heading">{a.name}</p>
                <p className="text-[11px] text-muted leading-relaxed flex-1">{a.description}</p>
                <p className="text-[11px] text-muted">
                  Current task: <span className="text-heading">{a.current_task}</span>
                </p>
                <button
                  onClick={() => router.push(`/ops-intelligence?q=${encodeURIComponent("Ask " + a.name)}`)}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] text-heading hover:border-accent/40"
                >
                  <MessageSquare className="w-3 h-3" /> Chat with this assistant
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
