"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, MapPin, Clock, ChevronRight, Lock, ListChecks } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { PageToolbar } from "@/components/Topbar";
import { ErrorState, EmptyState } from "@/components/StateViews";
import { ApiError, api } from "@/lib/api";

interface SecurityEvent {
  id: string;
  title: string;
  severity: string;
  user: string;
  detected_minutes_ago: number;
  source_ip: string;
  location: string;
  mitre_techniques: string[];
  status: string;
}

interface BlastRadius {
  compromised_account: string;
  impacted_assets: { id: string; name: string; exposure: string }[];
  containment_plan: string[];
}

interface PlaybookResult {
  playbook: string;
  result: string;
  source: string;
}

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [selected, setSelected] = useState<SecurityEvent | null>(null);
  const [radius, setRadius] = useState<BlastRadius | null>(null);
  const [radiusError, setRadiusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containing, setContaining] = useState(false);
  const [containError, setContainError] = useState<string | null>(null);
  const [executedSteps, setExecutedSteps] = useState<PlaybookResult[]>([]);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getSecurityEvents()
      .then((d) => {
        setEvents(d.events);
        if (d.events.length > 0) {
          setSelected((prev) => prev ?? d.events[0]);
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load security events."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setRadius(null);
    setRadiusError(null);
    setExecutedSteps([]);
    setContainError(null);
    api
      .getBlastRadius(selected.id)
      .then((d) => setRadius(d))
      .catch((e) =>
        setRadiusError(e instanceof ApiError && e.status === 404 ? null : "Failed to load blast radius analysis.")
      );
  }, [selected]);

  async function handleContain() {
    if (!selected) return;
    setContaining(true);
    setContainError(null);
    try {
      const res = await api.containEvent(selected.id);
      setExecutedSteps(res.executed_steps);
      setEvents((prev) =>
        prev.map((e) => (e.id === selected.id ? { ...e, status: "contained" } : e))
      );
      setSelected((prev) => (prev ? { ...prev, status: "contained" } : prev));
    } catch (e) {
      setContainError(
        e instanceof ApiError
          ? e.status === 401
            ? "Containment requires authentication. The default API key is configured automatically for this demo, but the request was rejected -- check NEUROMIND_API_KEY on the backend."
            : e.message
          : "Failed to execute containment playbook."
      );
    } finally {
      setContaining(false);
    }
  }

  const exposureTone = (exposure: string) =>
    exposure === "high" ? "danger" : exposure === "medium" ? "warning" : "default";

  const severityTone = (sev: string) =>
    sev === "high" ? "danger" : sev === "medium" ? "warning" : "default";

  const contained = selected?.status === "contained";

  return (
    <div className="space-y-4">
      <PageToolbar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events list */}
        <Card className="lg:col-span-1">
          <CardHeader title="Security Events" subtitle={loading ? undefined : `${events.length} events detected`} />
          <div className="p-4 pt-0 space-y-2">
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {error && <ErrorState message={error} onRetry={load} />}
            {!loading && !error && events.length === 0 && (
              <EmptyState message="No security events detected." />
            )}
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelected(ev)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selected?.id === ev.id
                    ? "border-primary bg-primaryMuted/40"
                    : "border-border bg-surface2 hover:border-accent/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-muted">{ev.id}</span>
                  <Pill tone={severityTone(ev.severity) as any}>{ev.severity}</Pill>
                </div>
                <p className="text-[13px] text-heading font-medium leading-snug">{ev.title}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {ev.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {ev.detected_minutes_ago}m ago
                  </span>
                </div>
                <div className="mt-2">
                  <Pill tone={ev.status === "contained" ? "success" : "warning"}>
                    {ev.status}
                  </Pill>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Details / blast radius */}
        <Card className="lg:col-span-2">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !selected ? (
            <div className="p-6 text-[13px] text-muted">Select a security event to investigate.</div>
          ) : (
            <>
              <CardHeader
                title={selected.title}
                subtitle={`${selected.id} • Detected ${selected.detected_minutes_ago} minutes ago`}
                action={
                  <div className="flex items-center gap-2">
                    {contained ? (
                      <Pill tone="success">
                        <ShieldCheck className="w-3 h-3" /> Contained
                      </Pill>
                    ) : (
                      <button
                        onClick={handleContain}
                        disabled={containing || !radius}
                        className="flex items-center gap-1.5 rounded-lg bg-primary text-white text-[12px] font-medium px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {containing ? "Containing..." : "Run Containment Playbook"}
                      </button>
                    )}
                  </div>
                }
              />

              <div className="p-4 pt-0 space-y-4">
                {containError && <ErrorState message={containError} onRetry={handleContain} />}

                {/* Identity / MITRE */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-surface2 p-3">
                    <p className="text-[11px] text-muted mb-1">Account</p>
                    <p className="text-[13px] text-heading font-medium">{selected.user}</p>
                    <p className="text-[11px] text-muted mt-2">Source IP</p>
                    <p className="text-[13px] text-heading font-mono">{selected.source_ip}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface2 p-3">
                    <p className="text-[11px] text-muted mb-2">MITRE ATT&CK Techniques</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.mitre_techniques.map((t) => (
                        <Pill key={t} tone="accent">
                          {t}
                        </Pill>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Blast radius */}
                {radiusError ? (
                  <ErrorState message={radiusError} />
                ) : radius ? (
                  <div className="rounded-xl border border-border bg-surface2 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldAlert className="w-4 h-4 text-danger" />
                      <h4 className="text-[13px] font-semibold text-heading">
                        Blast Radius Analysis
                      </h4>
                    </div>
                    <p className="text-[12px] text-muted mb-3">
                      Compromised account{" "}
                      <span className="text-heading font-medium">{radius.compromised_account}</span>{" "}
                      has potential access to the following assets:
                    </p>
                    <div className="space-y-2 mb-4">
                      {radius.impacted_assets.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
                        >
                          <span className="text-[12px] text-heading">{a.name}</span>
                          <Pill tone={exposureTone(a.exposure) as any}>{a.exposure} exposure</Pill>
                        </div>
                      ))}
                    </div>

                    <h4 className="text-[13px] font-semibold text-heading mb-2">
                      Recommended Containment Plan
                    </h4>
                    <div className="space-y-1.5">
                      {radius.containment_plan.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px]">
                          <ChevronRight
                            className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                              contained ? "text-success" : "text-muted"
                            }`}
                          />
                          <span className={contained ? "text-muted line-through" : "text-heading"}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>

                    {contained && (
                      <div className="mt-3 flex items-center gap-2 text-[12px] text-success">
                        <ShieldCheck className="w-4 h-4" /> Containment playbook executed successfully.
                      </div>
                    )}

                    {executedSteps.length > 0 && (
                      <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <ListChecks className="w-3.5 h-3.5 text-accent" />
                          <h5 className="text-[12px] font-semibold text-heading">
                            SOAR Playbook Execution Log
                          </h5>
                        </div>
                        <div className="space-y-1.5">
                          {executedSteps.map((s, i) => (
                            <div key={i} className="flex items-start justify-between gap-2 text-[11.5px]">
                              <span className="text-muted">{s.result}</span>
                              <Pill tone={s.source === "live" ? "success" : "default"}>
                                {s.source}
                              </Pill>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState message="No blast radius data available for this event." />
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
