import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Server, AlertCircle, Box, Bot, ShieldAlert, CheckCircle2, Activity, PlayCircle, Info } from "lucide-react";

const NODE_THEMES: Record<string, { bg: string; border: string; iconBg: string; iconColor: string; icon: any }> = {
  service: {
    bg: "#FFFFFF",
    border: "#3B82F6",
    iconBg: "#EFF6FF",
    iconColor: "#3B82F6",
    icon: Server,
  },
  incident: {
    bg: "#FFFFFF",
    border: "#EF4444",
    iconBg: "#FEF2F2",
    iconColor: "#EF4444",
    icon: ShieldAlert,
  },
  past_incident: {
    bg: "#FFFFFF",
    border: "#94A3B8",
    iconBg: "#F1F5F9",
    iconColor: "#64748B",
    icon: AlertCircle,
  },
  deployment: {
    bg: "#FFFFFF",
    border: "#F97316",
    iconBg: "#FFF7ED",
    iconColor: "#F97316",
    icon: Box,
  },
  agent: {
    bg: "#FFFFFF",
    border: "#22C55E",
    iconBg: "#F0FDF4",
    iconColor: "#22C55E",
    icon: Bot,
  },
};

function getStatusIndicator(status?: string) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes("health") || s.includes("active") || s.includes("success")) {
    return { color: "#22C55E", label: status };
  }
  if (s.includes("incident") || s.includes("error") || s.includes("investigating") || s.includes("critical")) {
    return { color: "#EF4444", label: status };
  }
  if (s.includes("deploy") || s.includes("progress")) {
    return { color: "#F97316", label: status };
  }
  return { color: "#64748B", label: status };
}

export default memo(function GraphCustomNode({ data }: any) {
  const { type, label, severity, status, metadata } = data;
  const theme = NODE_THEMES[type] || NODE_THEMES.service;
  const Icon = theme.icon;

  const indicator = getStatusIndicator(status);

  return (
    <div
      className="flex flex-col justify-center rounded-[12px] bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{
        border: `1.5px solid ${theme.border}`,
        width: 240,
        minHeight: 72,
      }}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-4 rounded-sm bg-border border-none !left-[-4px]" />

      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: theme.iconBg, color: theme.iconColor }}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-heading truncate leading-tight mb-1" title={label}>
            {label}
          </div>
          
          <div className="flex items-center justify-between mt-1 text-[11px] text-muted">
            {indicator ? (
              <div className="flex items-center gap-1.5 font-medium" style={{ color: indicator.color }}>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: indicator.color }}
                />
                {indicator.label}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                Unknown
              </div>
            )}
            
            {severity && (
              <div className="flex items-center gap-1 text-danger font-medium">
                P{severity}
              </div>
            )}
            {!severity && metadata && (
              <div className="flex items-center gap-1 truncate max-w-[60px]">
                {metadata}
              </div>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-4 rounded-sm bg-border border-none !right-[-4px]" />
    </div>
  );
});
