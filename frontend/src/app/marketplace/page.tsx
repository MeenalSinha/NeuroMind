"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import {
  Cpu,
  FileSearch,
  Activity,
  Rocket,
  ShieldCheck,
  ScrollText,
  Wallet,
  TrendingUp,
  Workflow,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";

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

interface MarketAgent {
  id: string;
  name: string;
  type: string;
  description: string;
  deployed: boolean;
  category: string;
}

interface Workflow_ {
  id: string;
  name: string;
  description: string;
  agents: string[];
}

export default function MarketplacePage() {
  const [agents, setAgents] = useState<MarketAgent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow_[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const [deploying, setDeploying] = useState<string[]>([]);
  const [runningWf, setRunningWf] = useState<string[]>([]);

  function handleDeploy(agentId: string) {
    setDeploying((prev) => [...prev, agentId]);
    setTimeout(() => {
      setDeploying((prev) => prev.filter((id) => id !== agentId));
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, deployed: true } : a))
      );
    }, 1500);
  }

  function handleRun(wfId: string) {
    setRunningWf((prev) => [...prev, wfId]);
    setTimeout(() => {
      setRunningWf((prev) => prev.filter((id) => id !== wfId));
      router.push("/memory-graph");
    }, 2000);
  }

  function load() {
    setLoading(true);
    setError(null);
    api
      .getMarketplace()
      .then((d) => {
        setAgents(d.agents);
        setWorkflows(d.workflows);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load the agent marketplace.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const categories = Array.from(new Set(agents.map((a) => a.category)));

  return (
    <div className="space-y-4">
      <PageToolbar />

      {/* Agents grid */}
      <Card>
        <CardHeader
          title="MCP Agent Marketplace"
          subtitle="Discover and deploy specialized agents via the Model Context Protocol"
        />
        <div className="p-4 pt-0 space-y-5">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}
          {error && <ErrorState message={error} onRetry={load} />}
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                {cat}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {agents
                  .filter((a) => a.category === cat)
                  .map((a) => {
                    const Icon = AGENT_ICONS[a.type] || Cpu;
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl border border-border bg-surface2 p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-primaryMuted flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          {a.deployed ? (
                            <Pill tone="success">
                              <CheckCircle2 className="w-3 h-3" /> Deployed
                            </Pill>
                          ) : (
                            <Pill tone="default">Available</Pill>
                          )}
                        </div>
                        <p className="text-[13px] font-semibold text-heading">{a.name}</p>
                        <p className="text-[11px] text-muted leading-relaxed flex-1">
                          {a.description}
                        </p>
                        {!a.deployed && (
                          <button 
                            onClick={() => handleDeploy(a.id)}
                            disabled={deploying.includes(a.id)}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] text-heading hover:border-accent/40 disabled:opacity-50"
                          >
                            {deploying.includes(a.id) ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Deploying...</>
                            ) : (
                              <><Download className="w-3 h-3" /> Deploy</>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Workflows */}
      <Card>
        <CardHeader
          title="Pre-built Workflows"
          subtitle="Multi-agent workflows that can be launched with a single click"
        />
        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-3">
          {workflows.map((wf) => (
            <div key={wf.id} className="rounded-xl border border-border bg-surface2 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-accent" />
                <p className="text-[13px] font-semibold text-heading">{wf.name}</p>
              </div>
              <p className="text-[12px] text-muted leading-relaxed flex-1">{wf.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {wf.agents.map((agentId) => {
                  const a = agents.find((x) => x.id === agentId);
                  const Icon = a ? AGENT_ICONS[a.type] || Cpu : Cpu;
                  return (
                    <span
                      key={agentId}
                      className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted"
                    >
                      <Icon className="w-3 h-3" /> {a?.name || agentId}
                    </span>
                  );
                })}
              </div>
              <button 
                onClick={() => handleRun(wf.id)}
                disabled={runningWf.includes(wf.id)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-heading text-surface text-[12px] font-medium px-3 py-2 hover:bg-heading/90 disabled:opacity-60"
              >
                {runningWf.includes(wf.id) ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
                ) : (
                  "Run Workflow"
                )}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
