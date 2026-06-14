"use client";

import { useEffect, useState } from "react";
import { BookOpen, Lightbulb, Wrench, Clock, RefreshCw } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState, EmptyState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";

interface Learning {
  incident_id: string;
  title: string;
  root_cause: string;
  resolution: string;
  lessons_learned: string;
  resolved_days_ago: number;
  source: string;
}

const SOURCE_LABELS: Record<string, string> = {
  seed: "Historical",
  judge_mode: "Judge Mode",
  "investigation:mock": "Live Investigation",
  "investigation:agentic": "Agentic Investigation",
};

export default function LearningsPage() {
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getLearnings()
      .then((d) => setLearnings(d.learnings))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load learnings.")
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
          title="Organizational Learning Engine"
          subtitle="Knowledge distilled from past incidents, automatically surfaced during new investigations. Persisted in SQLite -- new entries appear here after Judge Mode or live investigations, including after a restart."
          action={
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-[12px] text-heading hover:bg-border/40 disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          }
        />
        <div className="p-4 pt-0 space-y-3">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {error && <ErrorState message={error} onRetry={load} />}
          {!loading && !error && learnings.length === 0 && (
            <EmptyState message="No learnings recorded yet." />
          )}
          {learnings.map((l) => (
            <div key={`${l.incident_id}-${l.title}`} className="rounded-xl border border-border bg-surface2 p-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Pill tone="accent">{l.incident_id}</Pill>
                  <h4 className="text-[14px] font-semibold text-heading">{l.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {SOURCE_LABELS[l.source] && (
                    <Pill tone={l.source === "seed" ? "default" : "success"}>
                      {SOURCE_LABELS[l.source]}
                    </Pill>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <Clock className="w-3 h-3" />{" "}
                    {l.resolved_days_ago === 0 ? "Today" : `${l.resolved_days_ago} days ago`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-danger" />
                    <p className="text-[11px] font-semibold text-heading">Root Cause</p>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{l.root_cause}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Wrench className="w-3.5 h-3.5 text-accent" />
                    <p className="text-[11px] font-semibold text-heading">Resolution</p>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{l.resolution}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-warning" />
                    <p className="text-[11px] font-semibold text-heading">Lesson Learned</p>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{l.lessons_learned}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
