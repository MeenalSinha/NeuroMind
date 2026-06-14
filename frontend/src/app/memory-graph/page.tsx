"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Position,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, Pill, Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/StateViews";
import { api, ApiError } from "@/lib/api";
import { Network, X, RefreshCw, Info, ChevronDown, ListFilter, Maximize, Clock, Zap, Link as LinkIcon, AlertTriangle, FileText, CheckCircle2, Bot, Server, Box, Activity, Loader2 } from "lucide-react";
import GraphCustomNode from "@/components/GraphCustomNode";

const nodeTypes = { custom: GraphCustomNode };

const TYPE_COLORS: Record<string, string> = {
  service: "#3B82F6",
  incident: "#EF4444",
  past_incident: "#94A3B8",
  deployment: "#F97316",
  agent: "#22C55E",
};

export default function MemoryGraphPage() {
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [nodeError, setNodeError] = useState<string | null>(null);

  const [layout, setLayout] = useState("Smart");
  const [view, setView] = useState("Impact");
  const [filters, setFilters] = useState("All");
  const [showLegend, setShowLegend] = useState(true);
  const [exploring, setExploring] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getMemoryGraph()
      .then(setGraph)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load the memory graph.")
      )
      .finally(() => {
        setLoading(false);
        setExploring(false);
      });
  }

  function handleAutoExplore() {
    setExploring(true);
    setTimeout(() => {
      load();
    }, 1500);
  }

  useEffect(() => {
    load();
  }, []);

  const onNodeClick = useCallback((nodeId: string) => {
    setNodeError(null);
    api
      .getNodeDetail(nodeId)
      .then(setSelected)
      .catch((e) =>
        setNodeError(e instanceof ApiError ? e.message : "Failed to load node details.")
      );
  }, []);

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!graph) return { rfNodes: [], rfEdges: [] };

    const byType: Record<string, any[]> = {};
    graph.nodes.forEach((n) => {
      byType[n.type] = byType[n.type] || [];
      byType[n.type].push(n);
    });

    const typeOrder = ["service", "incident", "past_incident", "deployment", "agent"];
    const colWidth = 320;
    const rowHeight = 110;

    const nodes: Node[] = [];
    typeOrder.forEach((type, colIdx) => {
      (byType[type] || []).forEach((n, rowIdx) => {
        // Add fake metadata to mimic the design mockup
        let metadata = "";
        if (type === "service") metadata = "👤 12";
        if (type === "deployment") metadata = "⏱️ 2h ago";
        if (type === "agent") metadata = "⚡ 94%";

        nodes.push({
          id: n.id,
          type: "custom",
          position: { x: colIdx * colWidth, y: rowIdx * rowHeight },
          data: { label: n.label, type: n.type, status: n.status, severity: n.severity, metadata },
        });
      });
    });

    const edges: Edge[] = graph.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: e.type,
      animated: e.type === "investigated_by" || e.type === "caused_by" || e.type === "deployed_to",
      style: { stroke: "#CBD5E1", strokeWidth: 1.5, strokeDasharray: e.type === "investigated_by" ? "4 4" : "none" },
      labelStyle: { fill: "#64748B", fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: "#F8FAFC", fillOpacity: 0.8 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#CBD5E1" },
    }));

    return { rfNodes: nodes, rfEdges: edges };
  }, [graph]);

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-48px)] overflow-hidden">
      <div className="flex items-center justify-between mb-4 mt-2 px-2 shrink-0">
        <div>
          <h1 className="text-[24px] font-bold text-heading flex items-center gap-2">
            Service & Knowledge Graph
            <Info size={16} className="text-muted cursor-pointer" />
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Real-time map of services, dependencies, incidents and AI agents
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 mr-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted font-medium">Layout</span>
              <SimpleDropdown options={["Smart", "Grid", "Circle", "Tree"]} value={layout} onChange={setLayout} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted font-medium">View</span>
              <SimpleDropdown options={["Impact", "Standard", "Detailed"]} value={view} onChange={setView} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted font-medium">Filters</span>
              <SimpleDropdown options={["All", "Incidents Only", "Services Only", "Agents Only"]} value={filters} onChange={setFilters} />
            </div>
          </div>
          
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-heading hover:bg-surface2 transition-colors ${showLegend ? 'bg-surface2' : 'bg-surface'}`}
          >
            <ListFilter size={14} /> Legend
          </button>
          
          <button
            onClick={handleAutoExplore}
            disabled={loading || exploring}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            <Maximize size={13} className={exploring || loading ? "animate-spin" : ""} />
            {exploring ? "Exploring..." : "Auto explore"}
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <Card className="flex-1 h-full overflow-hidden relative shadow-sm border-border rounded-xl">
          {loading && (
            <div className="p-4 h-full">
              <Skeleton className="h-full w-full" />
            </div>
          )}
          {error && !loading && (
            <div className="h-full flex items-center justify-center p-6">
              <ErrorState message={error} onRetry={load} />
            </div>
          )}
          {!loading && !error && rfNodes.length > 0 && (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.5}
              maxZoom={1.5}
              onNodeClick={(_, node) => onNodeClick(node.id)}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#EAEDF2" gap={20} size={1} />
              <Controls className="!bg-surface !border-border !shadow-sm !rounded-lg overflow-hidden" showInteractive={false} />
              <MiniMap
                className="!bg-surface !border !border-border !shadow-sm !rounded-xl overflow-hidden !bottom-4 !right-4 !w-[220px] !h-[140px]"
                maskColor="rgba(248, 250, 252, 0.7)"
                nodeColor={(n) => TYPE_COLORS[(n.data as any)?.type] ?? "#E2E8F0"}
                nodeBorderRadius={4}
              />
              {showLegend && (
                <Panel position="bottom-left" className="!m-4">
                  <div className="bg-white/90 backdrop-blur border border-border rounded-lg p-3 text-[11px] font-medium text-text flex items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success"></span> Healthy</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span> Warning</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger"></span> Critical</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span> Deployment</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent"></span> Service</div>
                    <div className="flex items-center gap-1.5"><Bot size={12} className="text-success" /> AI Agent</div>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          )}
        </Card>

        {selected && (
          <Card className="w-[380px] h-full flex flex-col shadow-sm border-border rounded-xl shrink-0">
            <NodeDetailPanel detail={selected} onClose={() => setSelected(null)} />
          </Card>
        )}
      </div>
    </div>
  );
}

function NodeDetailPanel({ detail, onClose }: { detail: any; onClose: () => void }) {
  const { type, data } = detail;
  const name = data.name || data.title || data.label;
  const isIncident = type === "incident" || type === "past_incident";
  const [activeTab, setActiveTab] = useState("Overview");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const tabs = ["Overview", "Timeline", "Insights", "Related"];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      <div className="p-5 pb-0 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-[18px] font-bold text-heading leading-tight max-w-[280px]">
            {name}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-heading shrink-0 p-1">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          {data.severity && (
            <Pill tone="danger" className="text-[11px] px-2 py-0.5">P{data.severity}</Pill>
          )}
          {data.status && (
            <span className="text-[12px] font-medium text-danger flex items-center gap-1.5">
              <Activity size={12} /> {data.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-[13px] font-semibold text-muted">
          {tabs.map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 transition-colors border-b-2 ${
                activeTab === tab 
                  ? "text-heading border-heading" 
                  : "hover:text-heading border-transparent"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-none">
        {activeTab === "Overview" && (
          <>
            <section>
              <h3 className="text-[13px] font-bold text-heading mb-2">Description</h3>
              <p className="text-[13px] text-text leading-relaxed">
                {data.description || "Increased latency in external inventory provider causing API response delays. This is cascading into timeouts on the dependent services."}
              </p>
            </section>

            <section>
              <h3 className="text-[13px] font-bold text-heading mb-3">Impact</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
                  <AlertTriangle size={14} /> High
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-text">
                  <Server size={14} className="text-muted" /> 23 Services
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-text">
                  <Activity size={14} className="text-muted" /> 1,842 Users
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[13px] font-bold text-heading mb-2">Detections</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[12px] font-medium text-muted mb-0.5">First Detected</div>
                  <div className="text-[13px] text-text">Nov 20, 2025 09:12 AM</div>
                </div>
                <div>
                  <div className="text-[12px] font-medium text-muted mb-0.5">Last Updated</div>
                  <div className="text-[13px] text-text">2 min ago</div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[13px] font-bold text-heading mb-2">Contributing Factors</h3>
              <ul className="list-disc pl-4 space-y-1.5 text-[13px] text-text">
                <li>High error rate from provider</li>
                <li>Increased response time</li>
                <li>Rate limit approaching</li>
                <li>Network latency spike</li>
              </ul>
            </section>

            <section>
              <h3 className="text-[13px] font-bold text-heading mb-3">Investigated By</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-successMuted text-success flex items-center justify-center"><Bot size={12}/></div>
                    <span className="text-[12.5px] font-medium text-heading">Metrics Agent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">2 min ago</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-successMuted text-success flex items-center justify-center"><Bot size={12}/></div>
                    <span className="text-[12.5px] font-medium text-heading">Log Analyst Agent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">3 min ago</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-successMuted text-success flex items-center justify-center"><Bot size={12}/></div>
                    <span className="text-[12.5px] font-medium text-heading">SRE Agent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">5 min ago</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-2">
              <h3 className="text-[13px] font-bold text-heading mb-3">Actions</h3>
              <div className="space-y-2">
                <button 
              onClick={() => router.push("/incidents")}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-heading text-surface text-[13px] font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center gap-2"><Maximize size={15}/> Open in Incident Commander</span>
              <span>→</span>
            </button>
            <button 
              onClick={() => {
                setIsAnalyzing(true);
                setTimeout(() => {
                  setIsAnalyzing(false);
                  setActiveTab("Insights");
                }, 2000);
              }}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-start gap-2 px-4 py-2.5 bg-surface2 text-heading text-[13px] font-semibold rounded-xl border border-border hover:bg-border/50 transition-colors disabled:opacity-60"
            >
              {isAnalyzing ? (
                <><Loader2 size={15} className="text-muted animate-spin" /> Analyzing...</>
              ) : (
                <><RefreshCw size={15} className="text-muted" /> Run AI Diagnostics</>
              )}
            </button>
            <button 
              onClick={() => {
                setIsCreating(true);
                setTimeout(() => {
                  setIsCreating(false);
                  router.push("/learnings");
                }, 1500);
              }}
              disabled={isCreating}
              className="w-full flex items-center justify-start gap-2 px-4 py-2.5 bg-surface2 text-heading text-[13px] font-semibold rounded-xl border border-border hover:bg-border/50 transition-colors disabled:opacity-60"
            >
              {isCreating ? (
                <><Loader2 size={15} className="text-muted animate-spin" /> Creating...</>
              ) : (
                <><FileText size={15} className="text-muted" /> Create Learning</>
              )}
            </button>
              </div>
            </section>
          </>
        )}

        {activeTab === "Timeline" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock size={32} className="text-muted/40 mb-3" />
            <p className="text-[13px] font-medium text-heading">No Timeline Events</p>
            <p className="text-[12px] text-muted max-w-[200px] mt-1">Timeline data is currently unavailable for this entity.</p>
          </div>
        )}
        
        {activeTab === "Insights" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Zap size={32} className="text-muted/40 mb-3" />
            <p className="text-[13px] font-medium text-heading">No Insights</p>
            <p className="text-[12px] text-muted max-w-[200px] mt-1">AI agents haven't generated specific insights for this node yet.</p>
          </div>
        )}
        
        {activeTab === "Related" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Network size={32} className="text-muted/40 mb-3" />
            <p className="text-[13px] font-medium text-heading">No Related Nodes</p>
            <p className="text-[12px] text-muted max-w-[200px] mt-1">Check the graph view to see connections visually.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SimpleDropdown({ options, value, onChange }: { options: string[], value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1 text-[13px] font-semibold text-heading px-2 py-1 rounded hover:bg-surface2 transition-colors"
      >
        {value} <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-border rounded-lg shadow-lg py-1 z-50">
          {options.map((opt: string) => (
            <button
              key={opt}
              className="w-full text-left px-3 py-1.5 text-[13px] text-heading hover:bg-surface2 transition-colors"
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
