"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Pill, Skeleton } from "./ui";
import { EmptyState, ErrorState } from "./StateViews";
import { Lightbulb } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface Learning {
  incident_id: string;
  title: string;
  resolved_days_ago: number;
}

export default function RecentLearningsPanel() {
  const router = useRouter();
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getLearnings()
      .then((res) =>
        setLearnings(
          res.learnings.slice(0, 3).map((l: any) => ({
            incident_id: l.incident_id,
            title: l.title,
            resolved_days_ago: l.resolved_days_ago,
          }))
        )
      )
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load recent learnings.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const labels = ["Added to knowledge base", "Root cause identified", "Pattern detected"];

  return (
    <Card>
      <CardHeader
        title="Recent Learnings"
        action={<Pill tone="accent">New</Pill>}
      />
      <div className="px-4 pb-2 space-y-1">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && learnings.length === 0 && (
          <EmptyState message="No learnings recorded yet." />
        )}
        {learnings.map((l, i) => (
          <button
            key={`${l.incident_id}-${i}`}
            onClick={() => router.push("/learnings")}
            className="w-full flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-surface2 transition-colors text-left"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warningMuted text-warning">
              <Lightbulb size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-heading truncate">{l.title}</div>
              <div className="text-[11.5px] text-muted">
                {labels[i % labels.length]} - {formatAgo(l.resolved_days_ago)}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={() => router.push("/learnings")}
          className="w-full rounded-xl border border-border bg-surface2 py-2 text-[12.5px] text-heading"
        >
          View All Learnings
        </button>
      </div>
    </Card>
  );
}

function formatAgo(days: number): string {
  if (days < 1) return "just now";
  if (days === 1) return "1 day ago";
  return `${days}d ago`;
}
