"use client";

import { useEffect, useState } from "react";
import { Rocket, Clock, User, AlertTriangle } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState, EmptyState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";

interface Deployment {
  id: string;
  service: string;
  version: string;
  deployed_minutes_ago: number;
  author: string;
  changes: string;
  risk_score: number;
}

function riskTone(score: number) {
  if (score >= 0.6) return "danger";
  if (score >= 0.3) return "warning";
  return "success";
}

function formatAge(mins: number) {
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getDeployments()
      .then((d) => setDeployments(d.deployments || d))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load deployments.")
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
          title="Recent Deployments"
          subtitle="Releases tracked across services with automated risk scoring"
        />
        <div className="p-4 pt-0 space-y-3">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}
          {error && <ErrorState message={error} onRetry={load} />}
          {!loading && !error && deployments.length === 0 && (
            <EmptyState message="No deployments recorded." />
          )}
          {deployments.map((dep) => (
            <div key={dep.id} className="rounded-xl border border-border bg-surface2 p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primaryMuted flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-heading">
                      {dep.service} <span className="text-muted font-normal">{dep.version}</span>
                    </p>
                    <p className="text-[11px] font-mono text-muted">{dep.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={riskTone(dep.risk_score) as any}>
                    {dep.risk_score >= 0.6 && <AlertTriangle className="w-3 h-3" />}
                    Risk {Math.round(dep.risk_score * 100)}%
                  </Pill>
                </div>
              </div>

              <p className="text-[12px] text-muted leading-relaxed mt-3">{dep.changes}</p>

              <div className="flex items-center gap-4 mt-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {dep.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatAge(dep.deployed_minutes_ago)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
