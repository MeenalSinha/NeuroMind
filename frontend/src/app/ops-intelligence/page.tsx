"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Sparkles, Bot, Network, Lightbulb, ListChecks, TrendingUp, Cpu, BrainCircuit } from "lucide-react";
import { Card, Pill } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { api, ApiError } from "@/lib/api";
import HypothesisTree from "@/components/HypothesisTree";

interface InvestigationStep {
  timestamp: string;
  type: string;
  agent: string | null;
  message: string;
}

interface InvestigationResult {
  id: string;
  question: string;
  mode: "agentic" | "mock";
  steps: InvestigationStep[];
  hypothesis_tree: any;
  root_cause_summary: string | null;
  business_impact: string | null;
  recommended_actions: { action: string; type: string; confidence: number; estimated_impact: string }[];
  related_incidents: string[];
}

const AGENT_NAMES: Record<string, string> = {
  "agent-sre": "SRE Agent",
  "agent-log": "Log Analyst Agent",
  "agent-metrics": "Metrics Agent",
  "agent-deployment": "Deployment Agent",
  "agent-security": "Security Agent",
  "agent-business": "Business Impact Agent",
  "agent-search_telemetry": "Telemetry Search",
  "agent-get_service_metrics": "Metrics Tool",
  "agent-get_deployment_history": "Deployment History Tool",
  "agent-search_memory_graph": "Memory Graph Search",
  "agent-get_past_incidents": "Past Incidents Lookup",
};

function OpsIntelligenceInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ranInitial = useRef(false);

  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.ask(question);
      setResult(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong while running the investigation."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !ranInitial.current) {
      ranInitial.current = true;
      setQuery(q);
      ask(q);
    }
  }, [searchParams]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-heading">Ops Intelligence</h1>
        <p className="text-[13px] text-muted mt-1">
          Ask NeuroMind any operational, security, or business question. The agent
          swarm will investigate and reason over the enterprise memory graph.
        </p>
      </div>

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(query);
          }}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface2 px-4 py-3"
        >
          <Sparkles size={16} className="text-primary shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Why is checkout latency increasing in Singapore?"
            className="flex-1 bg-transparent text-[14px] text-heading placeholder:text-muted outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            <Send size={14} />
            {loading ? "Investigating..." : "Ask"}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "Why is checkout latency increasing in Singapore?",
            "Why was API latency high yesterday?",
            "Why did cloud costs rise 35 percent?",
          ].map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                ask(s);
              }}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-muted hover:text-heading hover:border-primary/40"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <Card className="p-6 flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-[13px] text-muted">
            Agent swarm is investigating: searching telemetry, reviewing incidents, and
            building a hypothesis tree...
          </span>
        </Card>
      )}

      {error && (
        <Card>
          <ErrorState message={error} onRetry={() => ask(query)} />
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-primary" />
                <h3 className="text-[14px] font-semibold text-heading">NeuroMind Response</h3>
              </div>
              <Pill tone={result.mode === "agentic" ? "success" : "default"}>
                {result.mode === "agentic" ? (
                  <>
                    <BrainCircuit size={11} /> Agentic (live LLM reasoning)
                  </>
                ) : (
                  <>
                    <Cpu size={11} /> Deterministic trace (mock AI)
                  </>
                )}
              </Pill>
            </div>
            <p className="text-[13.5px] leading-relaxed text-heading whitespace-pre-line">
              {result.root_cause_summary}
            </p>

            {result.business_impact && (
              <div className="mt-4 rounded-xl border border-border bg-surface2 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp size={14} className="text-warning" />
                  <span className="text-[12.5px] font-medium text-heading">Business Impact</span>
                </div>
                <p className="text-[12.5px] text-muted leading-relaxed">{result.business_impact}</p>
              </div>
            )}

            {result.related_incidents.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <Network size={14} className="text-accent" />
                <span className="text-[12.5px] text-muted">Related incidents:</span>
                {result.related_incidents.map((id) => (
                  <Pill key={id} tone="accent">{id}</Pill>
                ))}
              </div>
            )}
          </Card>

          {result.recommended_actions.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks size={16} className="text-success" />
                <h3 className="text-[14px] font-semibold text-heading">Suggested Actions</h3>
              </div>
              <div className="space-y-2">
                {result.recommended_actions.map((a, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface2 p-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Pill tone={a.type === "rollback" ? "danger" : a.type === "scale" ? "warning" : "success"}>
                          {a.type.replace("_", " ")}
                        </Pill>
                        <span className="text-[13px] font-medium text-heading">{a.action}</span>
                      </div>
                      <p className="text-[12px] text-muted">{a.estimated_impact}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[12px] font-semibold text-heading">
                        {Math.round(a.confidence * 100)}%
                      </div>
                      <div className="text-[10px] text-muted">confidence</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.hypothesis_tree && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Network size={16} className="text-accent" />
                <h3 className="text-[14px] font-semibold text-heading">Causal Reasoning Chain</h3>
              </div>
              <HypothesisTree node={result.hypothesis_tree} />
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-primary" />
              <h3 className="text-[14px] font-semibold text-heading">Investigation Timeline</h3>
            </div>
            <div className="space-y-3">
              {result.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div>
                    <div className="flex items-center gap-2">
                      {step.agent && (
                        <Pill tone="accent">{AGENT_NAMES[step.agent] ?? step.agent}</Pill>
                      )}
                      <Pill>{step.type.replace("_", " ")}</Pill>
                    </div>
                    <p className="text-[12.5px] text-muted mt-1">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function OpsIntelligencePage() {
  return (
    <Suspense fallback={null}>
      <OpsIntelligenceInner />
    </Suspense>
  );
}
