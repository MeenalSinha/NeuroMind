"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  BrainCircuit,
  Siren,
  Bot,
  Activity,
  ShieldAlert,
  Rocket,
  PiggyBank,
  FileText,
  Settings,
  BrainCog,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import HealthScoreCard from "./HealthScoreCard";

const ICONS: Record<string, any> = {
  LayoutGrid,
  BrainCircuit,
  Siren,
  Bot,
  Activity,
  ShieldAlert,
  Rocket,
  PiggyBank,
  FileText,
  Settings,
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-[232px] shrink-0 border-r border-border bg-surface h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-[64px] border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-heading text-white">
          <BrainCog size={20} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-heading">NeuroMind</div>
          <div className="text-[11px] text-muted">Enterprise Brain for Ops</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutGrid;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-text hover:text-heading hover:bg-surface2"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <HealthScoreCard />
      </div>
    </aside>
  );
}
