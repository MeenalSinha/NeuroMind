"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Siren,
  Bot,
  Server,
  BookOpen,
  ShieldAlert,
  Wallet,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: any;
  group: string;
}

const STATIC_PAGES: SearchResult[] = [
  { id: "page-dashboard", label: "Dashboard", sublabel: "Overview", href: "/", icon: Server, group: "Pages" },
  { id: "page-ops", label: "Ops Intelligence", sublabel: "NeuroMind Chat", href: "/ops-intelligence", icon: Bot, group: "Pages" },
  { id: "page-graph", label: "Memory Graph", sublabel: "Enterprise memory", href: "/memory-graph", icon: Server, group: "Pages" },
  { id: "page-agents", label: "Agents", sublabel: "Multi-agent command center", href: "/agents", icon: Bot, group: "Pages" },
  { id: "page-incidents", label: "Incidents", sublabel: "Incident commander", href: "/incidents", icon: Siren, group: "Pages" },
  { id: "page-security", label: "Security", sublabel: "Security investigation", href: "/security", icon: ShieldAlert, group: "Pages" },
  { id: "page-cost", label: "Cost & FinOps", sublabel: "Cost breakdown", href: "/cost", icon: Wallet, group: "Pages" },
  { id: "page-learnings", label: "Learnings", sublabel: "Organizational learning engine", href: "/learnings", icon: BookOpen, group: "Pages" },
  { id: "page-marketplace", label: "Marketplace", sublabel: "MCP agent marketplace", href: "/marketplace", icon: Bot, group: "Pages" },
  { id: "page-observability", label: "Observability", sublabel: "Service health", href: "/observability", icon: Server, group: "Pages" },
  { id: "page-deployments", label: "Deployments", sublabel: "Recent releases", href: "/deployments", icon: Server, group: "Pages" },
  { id: "page-settings", label: "Settings", sublabel: "Integration status & audit log", href: "/settings", icon: Server, group: "Pages" },
];

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim().toLowerCase();

    if (q.length === 0) {
      setResults(STATIC_PAGES);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const [incidents, agents, services, learnings] = await Promise.allSettled([
          api.getActiveIncidents(),
          api.getAgents(),
          api.getTopServices(),
          api.getLearnings(),
        ]);

        const out: SearchResult[] = [];

        for (const page of STATIC_PAGES) {
          if (page.label.toLowerCase().includes(q) || page.sublabel?.toLowerCase().includes(q)) {
            out.push(page);
          }
        }

        if (incidents.status === "fulfilled") {
          for (const inc of incidents.value.incidents) {
            if (inc.title.toLowerCase().includes(q) || inc.id.toLowerCase().includes(q)) {
              out.push({
                id: `inc-${inc.id}`,
                label: inc.title,
                sublabel: `${inc.id} - ${inc.severity} - ${inc.status}`,
                href: `/incidents?id=${inc.id}`,
                icon: Siren,
                group: "Incidents",
              });
            }
          }
        }

        if (agents.status === "fulfilled") {
          for (const a of agents.value.agents) {
            if (a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)) {
              out.push({
                id: `agent-${a.id}`,
                label: a.name,
                sublabel: a.current_task || a.description,
                href: "/agents",
                icon: Bot,
                group: "Agents",
              });
            }
          }
        }

        if (services.status === "fulfilled") {
          for (const s of services.value.services) {
            if (s.name.toLowerCase().includes(q)) {
              out.push({
                id: `svc-${s.id}`,
                label: s.name,
                sublabel: `Impact score ${s.impact_score}`,
                href: "/observability",
                icon: Server,
                group: "Services",
              });
            }
          }
        }

        if (learnings.status === "fulfilled") {
          for (const l of learnings.value.learnings) {
            if (l.title.toLowerCase().includes(q) || l.incident_id.toLowerCase().includes(q)) {
              out.push({
                id: `learning-${l.incident_id}-${l.title}`,
                label: l.title,
                sublabel: `${l.incident_id} - Learning`,
                href: "/learnings",
                icon: BookOpen,
                group: "Learnings",
              });
            }
          }
        }

        setResults(out);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, open]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      groups[r.group] = groups[r.group] || [];
      groups[r.group].push(r);
    }
    return groups;
  }, [results]);

  function go(href: string) {
    router.push(href);
    onClose();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const active = results[activeIndex];
        if (active) go(active.href);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, activeIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-heading/30 pt-[12vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents, agents, services, learnings, pages..."
            className="flex-1 bg-transparent text-[13.5px] text-heading placeholder:text-muted outline-none"
          />
          {loading && <Loader2 size={14} className="animate-spin text-muted" />}
          <kbd className="text-[10px] rounded border border-border bg-surface2 px-1.5 py-0.5 text-muted">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {results.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-[12.5px] text-muted">
              No results for &quot;{query}&quot;.
            </div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-1">
              <div className="px-4 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                {group}
              </div>
              {items.map((item) => {
                flatIndex += 1;
                const isActive = flatIndex === activeIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      isActive ? "bg-surface2" : "hover:bg-surface2"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accentMuted text-accent">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-heading truncate">{item.label}</div>
                      {item.sublabel && (
                        <div className="text-[11px] text-muted truncate">{item.sublabel}</div>
                      )}
                    </div>
                    <ArrowRight size={13} className="text-muted shrink-0" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
