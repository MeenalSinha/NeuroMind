"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, Pill, SeverityPill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { api, getWsUrl, ApiError } from "@/lib/api";
import HypothesisTree from "@/components/HypothesisTree";
import { Siren, Play, Loader2, Network, CheckCircle2, BrainCircuit, Cpu } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  started_minutes_ago: number;
  affected_services: string[];
  description: string;
}

interface JudgeStep {
  t: number;
  type: string;
  agent?: string;
  message: string;
}

const AGENT_NAMES: Record<string, string> = {
  "agent-sre": "SRE Agent",
  "agent-log": "Log Analyst Agent",
  "agent-metrics": "Metrics Agent",
  "agent-deployment": "Deployment Agent",
  "agent-business": "Business Impact Agent",
  "agent-search_telemetry": "Telemetry Search",
  "agent-get_service_metrics": "Metrics Tool",
  "agent-get_deployment_history": "Deployment History Tool",
  "agent-search_memory_graph": "Memory Graph Search",
  "agent-get_past_incidents": "Past Incidents Lookup",
};

function IncidentsInner() {
  const searchParams = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [investigation, setInvestigation] = useState<any | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [investigateError, setInvestigateError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const [judgeRunning, setJudgeRunning] = useState(false);
  const [judgeSteps, setJudgeSteps] = useState<JudgeStep[]>([]);
  const [judgeDone, setJudgeDone] = useState(false);
  const [judgeError, setJudgeError] = useState<string | null>(null);

  function loadIncidents() {
    setIncidentsLoading(true);
    setIncidentsError(null);
    api
      .getActiveIncidents()
      .then((res) => {
        setIncidents(res.incidents);
        const id = searchParams.get("id");
        const found = res.incidents.find((i: Incident) => i.id === id) || res.incidents[0];
        setSelected(found || null);
      })
      .catch((err) => {
        setIncidentsError(
          err instanceof ApiError ? err.message : "Failed to load incidents."
        );
      })
      .finally(() => setIncidentsLoading(false));
  }

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function investigate(incident: Incident) {
    setSelected(incident);
    setInvestigation(null);
    setInvestigateError(null);
    setInvestigating(true);
    try {
      const res = await api.investigateIncident(incident.id);
      setInvestigation(res.investigation);
      setIncidents((prev) =>
        prev.map((i) => (i.id === incident.id ? { ...i, status: res.incident.status } : i))
      );
      setSelected((prev) => (prev ? { ...prev, status: res.incident.status } : prev));
    } catch (err) {
      setInvestigateError(
        err instanceof ApiError ? err.message : "Investigation failed."
      );
    } finally {
      setInvestigating(false);
    }
  }

  async function resolve(incident: Incident) {
    setResolving(true);
    try {
      const res = await api.resolveIncident(incident.id);
      setIncidents((prev) =>
        prev.map((i) => (i.id === incident.id ? { ...i, status: res.incident.status } : i))
      );
      setSelected((prev) => (prev ? { ...prev, status: res.incident.status } : prev));
    } catch (err) {
      setInvestigateError(
        err instanceof ApiError ? err.message : "Failed to resolve incident."
      );
    } finally {
      setResolving(false);
    }
  }

  function runJudgeMode() {
    setJudgeSteps([]);
    setJudgeDone(false);
    setJudgeError(null);
    setJudgeRunning(true);

    let ws: WebSocket;
    try {
      ws = new WebSocket(getWsUrl("/api/judge-mode/run"));
    } catch {
      setJudgeError("Could not open a connection to the Judge Mode stream.");
      setJudgeRunning(false);
      return;
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "done") {
        setJudgeDone(true);
        setJudgeRunning(false);
        ws.close();
        return;
      }
      setJudgeSteps((prev) => [...prev, data]);
    };
    ws.onerror = () => {
      setJudgeError("Judge Mode stream disconnected unexpectedly.");
      setJudgeRunning(false);
    };
    ws.onclose = () => setJudgeRunning(false);
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-heading flex items-center gap-2">
            <Siren size={20} className="text-danger" />
            Autonomous Incident Commander
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Active incidents are investigated automatically by the agent swarm.
          </p>
        </div>
        <button
          onClick={runJudgeMode}
          disabled={judgeRunning}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {judgeRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {judgeRunning ? "Running Demo Incident..." : "Run Demo Incident"}
        </button>
      </div>

      {judgeError && (
        <Card>
          <ErrorState message={judgeError} onRetry={runJudgeMode} />
        </Card>
      )}

      {(judgeRunning || judgeSteps.length > 0) && (
        <Card className="p-5">
          <CardHeader title="Judge Mode: Synthetic Incident INC-301" />
          <div className="px-4 pb-4 space-y-2.5 max-h-[360px] overflow-y-auto">
            {judgeSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    step.type === "root_cause" || step.type === "summary"
                      ? "bg-success"
                      : step.type === "alert"
                      ? "bg-danger"
                      : "bg-accent"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    {step.agent && <Pill tone="accent">{AGENT_NAMES[step.agent] ?? step.agent}</Pill>}
                    <Pill>{step.type.replace("_", " ")}</Pill>
                  </div>
                  <p className="text-[12.5px] text-muted mt-1">{step.message}</p>
                </div>
              </div>
            ))}
            {judgeDone && (
              <div className="rounded-xl border border-success/30 bg-successMuted p-3 text-[12.5px] text-success">
                Demo incident investigation complete. A new learning for INC-301 has been
                written to the Organizational Learning Engine and is now visible on the{" "}
                <a href="/learnings" className="underline font-medium">Learnings</a> and{" "}
                <a href="/memory-graph" className="underline font-medium">Memory Graph</a> pages
                — including after a page refresh.
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader title="Active Incidents" />
          <div className="px-4 pb-4 space-y-1">
            {incidentsLoading && (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {incidentsError && (
              <ErrorState message={incidentsError} onRetry={loadIncidents} />
            )}
            {!incidentsLoading && !incidentsError && incidents.length === 0 && (
              <p className="text-[12px] text-muted px-1 py-4">No active incidents.</p>
            )}
            {incidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => investigate(inc)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selected?.id === inc.id
                    ? "border-primary/40 bg-primaryMuted/30"
                    : "border-border bg-surface2 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <SeverityPill severity={inc.severity} />
                  <span className="text-[13px] font-medium text-heading">{inc.title}</span>
                </div>
                <p className="text-[11.5px] text-muted">{inc.description}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted">
                    Started {inc.started_minutes_ago}m ago
                  </span>
                  <Pill tone={inc.status === "resolved" ? "success" : inc.status === "investigating" ? "accent" : "default"}>
                    {inc.status}
                  </Pill>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {investigating && (
            <Card className="p-6 flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-[13px] text-muted">
                Agent swarm investigating {selected?.title}...
              </span>
            </Card>
          )}

          {investigateError && (
            <Card>
              <ErrorState
                message={investigateError}
                onRetry={() => selected && investigate(selected)}
              />
            </Card>
          )}

          {!investigating && investigation && (
            <>
              <Card className="p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-[14px] font-semibold text-heading">Root Cause</h3>
                  <div className="flex items-center gap-2">
                    <Pill tone={investigation.mode === "agentic" ? "success" : "default"}>
                      {investigation.mode === "agentic" ? (
                        <>
                          <BrainCircuit size={11} /> Agentic
                        </>
                      ) : (
                        <>
                          <Cpu size={11} /> Deterministic
                        </>
                      )}
                    </Pill>
                    {selected && selected.status !== "resolved" && (
                      <button
                        onClick={() => resolve(selected)}
                        disabled={resolving}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-[11.5px] font-medium text-heading hover:border-success/40 disabled:opacity-60"
                      >
                        {resolving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} className="text-success" />
                        )}
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[13px] text-heading leading-relaxed">
                  {investigation.root_cause_summary}
                </p>
              </Card>

              {investigation.business_impact && (
                <Card className="p-5">
                  <h3 className="text-[14px] font-semibold text-heading mb-2">Business Impact</h3>
                  <p className="text-[13px] text-muted leading-relaxed">
                    {investigation.business_impact}
                  </p>
                </Card>
              )}

              {investigation.related_incidents?.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Network size={14} className="text-accent" />
                    <h3 className="text-[14px] font-semibold text-heading">Related Incidents</h3>
                  </div>
                  <div className="flex gap-2">
                    {investigation.related_incidents.map((id: string) => (
                      <Pill key={id} tone="accent">{id}</Pill>
                    ))}
                  </div>
                </Card>
              )}

              {investigation.hypothesis_tree && (
                <Card className="p-5">
                  <h3 className="text-[14px] font-semibold text-heading mb-3">Root Cause Tree</h3>
                  <HypothesisTree node={investigation.hypothesis_tree} />
                </Card>
              )}

              {investigation.recommended_actions?.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-[14px] font-semibold text-heading mb-3">Remediation</h3>
                  <div className="space-y-2">
                    {investigation.recommended_actions.map((a: any, i: number) => (
                      <div key={i} className="rounded-xl border border-border bg-surface2 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill tone={a.type === "rollback" ? "danger" : a.type === "scale" ? "warning" : "success"}>
                            {a.type.replace("_", " ")}
                          </Pill>
                          <span className="text-[13px] font-medium text-heading">{a.action}</span>
                        </div>
                        <p className="text-[12px] text-muted">{a.estimated_impact}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {!investigating && !investigation && selected && (
            <Card className="p-6 text-center">
              <p className="text-[13px] text-muted mb-3">
                No investigation has been run for this incident yet.
              </p>
              <button
                onClick={() => investigate(selected)}
                className="rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-white"
              >
                Launch Agent Swarm
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={null}>
      <IncidentsInner />
    </Suspense>
  );
}
