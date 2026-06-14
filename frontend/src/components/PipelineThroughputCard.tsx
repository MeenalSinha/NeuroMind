"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, Skeleton } from "./ui";
import { ErrorState } from "./StateViews";
import { ChevronDown, FileBarChart, TrendingUp, Zap, MoreHorizontal } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface Point {
  date: string;
  value: number;
  highlight: boolean;
}

const MAX_VALUE = 150000;
const SEGMENT_COUNT = 7;

export default function PipelineThroughputCard() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeRange, setTimeRange] = useState("7 Days");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [running, setRunning] = useState(false);

  function runDiagnostics() {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
    }, 2000);
  }

  function load() {
    setLoading(true);
    setError(null);
    api
      .getPipelineThroughput()
      .then((res) => setData(res.data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load pipeline throughput.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader
        title="Pipeline Throughput"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setRangeOpen(!rangeOpen)}
                onBlur={() => setTimeout(() => setRangeOpen(false), 150)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-[12px] text-heading hover:bg-border/50 transition-colors"
              >
                {timeRange} <ChevronDown size={13} className="text-muted" />
              </button>
              {rangeOpen && (
                <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
                  {["7 Days", "14 Days", "30 Days"].map(opt => (
                    <button key={opt} onClick={() => { setTimeRange(opt); setRangeOpen(false); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface2 transition-colors">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface2 text-muted hover:bg-border/50 transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
                  <button className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface2 transition-colors" onClick={() => setMenuOpen(false)}>Export CSV</button>
                  <button className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface2 transition-colors" onClick={() => setMenuOpen(false)}>View Details</button>
                </div>
              )}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3 px-4 pb-3">
        <Stat icon={<FileBarChart size={14} />} label="Processing Cost" value="$12,582.20" />
        <Stat icon={<TrendingUp size={14} />} label="Output Value" value="$33,846.09" />
        <Stat icon={<Zap size={14} />} label="Efficiency Gain" value="$8,582.13" />
      </div>

      <div className="px-4 pb-2">
        {loading && <Skeleton className="h-[200px] w-full" />}
        {error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && (
        <div className="flex items-end justify-between h-[200px] gap-3">
          <div className="flex flex-col justify-between h-full text-[11px] text-muted pb-5 pr-1">
            <span>$150k</span>
            <span>$100k</span>
            <span>$50k</span>
            <span>$10k</span>
            <span>0</span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-3 h-full">
            {data.map((point, i) => {
              const pct = Math.min(point.value / MAX_VALUE, 1);
              const barHeightPct = pct * 100;
              const filledSegments = Math.round(pct * SEGMENT_COUNT);

              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full">
                  {point.highlight && (
                    <span className="text-[10px] font-medium text-primary mb-1">{point.date}</span>
                  )}
                  <div className="flex-1 w-full flex items-end justify-center">
                    <div
                      className="w-full max-w-[26px] flex flex-col-reverse gap-[3px]"
                      style={{ height: `${barHeightPct}%` }}
                    >
                      {Array.from({ length: SEGMENT_COUNT }).map((_, segIdx) => {
                        const filled = segIdx < filledSegments;
                        return (
                          <div
                            key={segIdx}
                            className="flex-1 rounded-full"
                            style={{
                              backgroundColor: point.highlight
                                ? filled
                                  ? "#0F172A"
                                  : "#94A3B8"
                                : filled
                                ? "#E2E8F0"
                                : "transparent",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted mt-2">{point.date}</span>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {!loading && !error && (
      <div className="mx-4 mb-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface2 p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primaryMuted text-primary">
            <Zap size={15} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-heading">
              Pipeline Performance Highlight
            </div>
            <div className="text-[12px] text-muted mt-0.5 max-w-md">
              The overall execution of workflows reached its highest point on{" "}
              {data.find((d) => d.highlight)?.date || "this period"}, leading to a notable boost
              in the output.
            </div>
          </div>
        </div>
        <button 
          onClick={runDiagnostics}
          disabled={running}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-[12px] font-medium text-heading border border-border hover:bg-surface2 transition-colors disabled:opacity-60"
        >
          {running && <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
          {running ? "Analyzing..." : "Run AI Diagnostics"}
        </button>
      </div>
      )}
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface2 px-3 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted">
        {icon}
      </div>
      <div>
        <div className="text-[11px] text-muted">{label}</div>
        <div className="text-[13px] font-semibold text-heading">{value}</div>
      </div>
    </div>
  );
}
