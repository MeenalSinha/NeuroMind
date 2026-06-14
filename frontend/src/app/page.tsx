"use client";

import KpiRow from "@/components/KpiRow";
import PipelineThroughputCard from "@/components/PipelineThroughputCard";
import AiAssistantPanel from "@/components/AiAssistantPanel";
import ActiveIncidentsPanel from "@/components/ActiveIncidentsPanel";
import RecentLearningsPanel from "@/components/RecentLearningsPanel";
import {
  TopServicesPanel,
  AgentActivityPanel,
  IncidentTrendPanel,
} from "@/components/DashboardBottomRow";
import { PageToolbar } from "@/components/Topbar";

export default function OverviewPage() {
  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Good morning, Alex! 🌞</h1>
          <p className="text-[13px] text-muted mt-1">
            NeuroMind is monitoring 247 services across 8 environments
          </p>
        </div>
        <PageToolbar />
      </div>

      <KpiRow />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PipelineThroughputCard />
        </div>
        <AiAssistantPanel />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ActiveIncidentsPanel />
        <RecentLearningsPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopServicesPanel />
        <AgentActivityPanel />
        <IncidentTrendPanel />
      </div>
    </div>
  );
}
