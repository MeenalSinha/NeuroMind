"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, RefreshCw, Calendar, User, Settings, Building, LogOut } from "lucide-react";
import { SECONDARY_NAV } from "@/lib/nav";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CommandPalette from "./CommandPalette";
import NotificationsDropdown from "./NotificationsDropdown";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="flex h-16 items-center justify-between px-6 gap-6">
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-heading text-white">
            <span className="text-[13px] font-bold">N</span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {SECONDARY_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-heading text-white"
                    : "text-text hover:text-heading hover:bg-surface2"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-surface2 px-3 py-2 text-[13px] text-muted w-[220px] hover:border-accent/30 transition-colors"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Search anything...</span>
            <kbd className="text-[10px] rounded border border-border bg-surface px-1.5 py-0.5 text-muted">
              ⌘K
            </kbd>
          </button>

          <NotificationsDropdown />

          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              onBlur={() => setTimeout(() => setProfileOpen(false), 150)}
              className="flex items-center gap-2 pl-1 hover:opacity-80 transition-opacity text-left"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-primary" />
              <div className="hidden sm:block leading-tight">
                <div className="text-[12.5px] font-medium text-heading">Alex Smith</div>
                <div className="text-[10.5px] text-muted">SRE Lead</div>
              </div>
              <ChevronDown size={14} className="text-muted hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
                <button 
                  onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-heading hover:bg-surface2 transition-colors"
                >
                  <User size={14} className="text-muted" /> Profile settings
                </button>
                <button 
                  onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-heading hover:bg-surface2 transition-colors"
                >
                  <Building size={14} className="text-muted" /> Organization
                </button>
                <button 
                  onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-heading hover:bg-surface2 transition-colors"
                >
                  <Settings size={14} className="text-muted" /> Preferences
                </button>
                <div className="h-px bg-border my-1" />
                <button 
                  onClick={() => { setProfileOpen(false); router.push("/"); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

export function PageToolbar({
  envLabel = "Production",
  dateRange = "Nov 20 - Nov 26, 2025",
}: {
  envLabel?: string;
  dateRange?: string;
}) {
  const [env, setEnv] = useState(envLabel);
  const [date, setDate] = useState(dateRange);
  const [refresh, setRefresh] = useState("On");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToolbarDropdown
        icon={<span className={`h-2 w-2 rounded-full ${env === "Production" ? "bg-success" : "bg-warning"}`} />}
        options={["Production", "Staging", "Development"]}
        value={env}
        onChange={setEnv}
      />
      <ToolbarDropdown
        icon={<Calendar size={14} className="text-muted" />}
        options={["Today", "Last 7 days", "Last 30 days", "Nov 20 - Nov 26, 2025"]}
        value={date}
        onChange={setDate}
      />
      <ToolbarDropdown
        icon={<RefreshCw size={14} className="text-muted" />}
        label="Auto refresh"
        badge={
          refresh === "On" ? (
            <span className="ml-1 rounded-full bg-successMuted px-2 py-0.5 text-[11px] text-success font-medium">On</span>
          ) : (
            <span className="ml-1 rounded-full bg-surface2 px-2 py-0.5 text-[11px] text-muted font-medium">Off</span>
          )
        }
        options={["On", "Off"]}
        value={refresh}
        onChange={setRefresh}
      />
    </div>
  );
}

function ToolbarDropdown({
  icon,
  label,
  badge,
  options,
  value,
  onChange,
}: {
  icon?: React.ReactNode;
  label?: string;
  badge?: React.ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] text-heading shadow-card hover:bg-surface2 transition-colors"
      >
        {icon}
        {label || value}
        {badge}
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt}
              className="w-full text-left px-4 py-2 text-[13px] text-heading hover:bg-surface2 transition-colors"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
