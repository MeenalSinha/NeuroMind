"use client";

import { useEffect, useState } from "react";
import { FileText, Download, ShieldCheck, Wallet, Activity, Loader2 } from "lucide-react";
import { Card, CardHeader, Pill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { PageToolbar } from "@/components/Topbar";
import { api, ApiError } from "@/lib/api";

export default function ReportsPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getSummary()
      .then((d) => setHealth(d.enterprise_health))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load enterprise health data.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const reports = [
    {
      id: "rpt-health",
      title: "Enterprise Health Report",
      description: "Weekly summary of reliability, security, performance, cost efficiency and compliance scores.",
      icon: Activity,
      tone: "accent" as const,
    },
    {
      id: "rpt-cost",
      title: "Cost & FinOps Executive Summary",
      description: "Explains week-over-week cloud spend changes and recommended optimizations.",
      icon: Wallet,
      tone: "warning" as const,
    },
    {
      id: "rpt-security",
      title: "Security Posture Report",
      description: "Open security events, blast radius assessments and containment status.",
      icon: ShieldCheck,
      tone: "danger" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <PageToolbar />

      {loading && <Skeleton className="h-24 w-full" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {health && (
        <Card>
          <CardHeader title="Enterprise Health Score" subtitle="Overall score across all components" />
          <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl border border-border bg-surface2 p-3 text-center">
              <p className="text-[24px] font-semibold text-heading">{health.overall}</p>
              <p className="text-[11px] text-muted">Overall</p>
            </div>
            {(health.components || []).map((c: { name: string; score: number }) => (
              <div key={c.name} className="rounded-xl border border-border bg-surface2 p-3 text-center">
                <p className="text-[20px] font-semibold text-heading">{c.score}</p>
                <p className="text-[11px] text-muted">{c.name}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Generated Reports" subtitle="On-demand reports compiled from live agent findings" />
        <div className="p-4 pt-0 space-y-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ReportRow({ report }: { report: any }) {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);
    setTimeout(() => {
      // Generate a simple text report
      const content = `Report: ${report.title}\nDescription: ${report.description}\nGenerated at: ${new Date().toISOString()}\n\nThis is a sample generated report from NeuroMind.`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.id}-report.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExporting(false);
    }, 1500);
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface2 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primaryMuted flex items-center justify-center">
          <report.icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-heading">{report.title}</p>
          <p className="text-[11px] text-muted">{report.description}</p>
        </div>
      </div>
      <button 
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] text-heading hover:border-accent/40 disabled:opacity-50"
      >
        {exporting ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
        ) : (
          <><Download className="w-3.5 h-3.5" /> Export</>
        )}
      </button>
    </div>
  );
}
