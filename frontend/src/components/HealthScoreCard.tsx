"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronRight } from "lucide-react";

import { useRouter } from "next/navigation";

interface HealthData {
  overall: number;
  trend_vs_last_week: number;
  components: { name: string; score: number }[];
}

export default function HealthScoreCard() {
  const router = useRouter();
  const [data, setData] = useState<HealthData | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    api
      .getSummary()
      .then((res) => setData(res.enterprise_health))
      .catch(() => {
        setUsingFallback(true);
        setData({
          overall: 92,
          trend_vs_last_week: 8,
          components: [
            { name: "Reliability", score: 94 },
            { name: "Security", score: 91 },
            { name: "Performance", score: 90 },
            { name: "Cost Efficiency", score: 89 },
            { name: "Compliance", score: 93 },
          ],
        });
      });
  }, []);

  if (!data) {
    return (
      <div className="rounded-2xl border border-border bg-surface2 p-4 h-[260px] animate-pulse" />
    );
  }

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (data.overall / 100) * circumference;

  return (
    <div className="rounded-2xl border border-border bg-surface2 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-text flex items-center gap-1">
          Enterprise Health Score
        </span>
        {usingFallback && (
          <span className="text-[10px] text-warning" title="Showing cached values - could not reach NeuroMind API">
            Offline
          </span>
        )}
      </div>

      <div className="flex flex-col items-center py-2">
        <div className="relative h-[110px] w-[110px]">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E7E9EE" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#1DAA61"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-heading">{data.overall}</span>
            <span className="text-[10px] text-success">Excellent</span>
          </div>
        </div>
        <div className="text-[11px] text-success mt-1">
          +{data.trend_vs_last_week} vs last week
        </div>
      </div>

      <div className="space-y-2.5 mt-2">
        {data.components.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between text-[11.5px] mb-1">
              <span className="text-text">{c.name}</span>
              <span className="text-heading font-medium">{c.score}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${c.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => router.push("/reports")}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-surface border border-border px-3 py-2 text-[12px] font-medium text-heading hover:bg-border/40 transition-colors"
      >
        View Full Report <ChevronRight size={14} />
      </button>
    </div>
  );
}
