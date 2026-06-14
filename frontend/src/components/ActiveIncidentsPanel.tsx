"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, SeverityPill, Skeleton } from "./ui";
import { EmptyState, ErrorState } from "./StateViews";
import { AlertTriangle, Database, MemoryStick, Clock3 } from "lucide-react";
import Sparkline from "./Sparkline";
import { api, ApiError } from "@/lib/api";

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  started_minutes_ago: number;
  affected_services: string[];
}

const ICONS: Record<string, any> = {
  "Checkout Service Latency": AlertTriangle,
  "Database Connection Errors": Database,
  "High Memory Usage": MemoryStick,
  "API Timeouts": Clock3,
};

const TREND_RED = [4, 6, 5, 9, 8, 12, 14];
const TREND_ORANGE = [3, 4, 4, 6, 5, 7, 6];

export default function ActiveIncidentsPanel() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getActiveIncidents()
      .then((res) => setIncidents(res.incidents))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load active incidents.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader
        title="Active Incidents"
        action={
          <button
            onClick={() => router.push("/incidents")}
            className="text-[12px] text-muted hover:text-heading"
          >
            View all
          </button>
        }
      />
      <div className="px-4 pb-4 space-y-1">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && incidents.length === 0 && (
          <EmptyState message="No active incidents." />
        )}
        {incidents.map((inc, i) => {
          const Icon = ICONS[inc.title] ?? AlertTriangle;
          const iconTone =
            inc.severity === "P1"
              ? "bg-dangerMuted text-danger"
              : inc.severity === "P2"
              ? "bg-warningMuted text-warning"
              : "bg-accentMuted text-accent";
          return (
            <button
              key={inc.id}
              onClick={() => router.push(`/incidents?id=${inc.id}`)}
              className="w-full flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-surface2 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-heading truncate">
                      {inc.title}
                    </span>
                    <SeverityPill severity={inc.severity} />
                  </div>
                  <div className="text-[11.5px] text-muted truncate">
                    Started {inc.started_minutes_ago}m ago - Affects {inc.affected_services.length}{" "}
                    {inc.affected_services.length === 1 ? "service" : "services"}
                  </div>
                </div>
              </div>
              <div className="w-20 shrink-0">
                <Sparkline data={i % 2 === 0 ? TREND_RED : TREND_ORANGE} color={i % 2 === 0 ? "#F2545B" : "#F0A93E"} />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
