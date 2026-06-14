"use client";

import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TreeNode {
  id: string;
  label: string;
  confidence: number;
  evidence: string;
  children: TreeNode[];
  is_root_cause?: boolean;
  ruled_out?: boolean;
}

export default function HypothesisTree({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 3);

  const confColor =
    node.confidence >= 0.8 ? "text-success" : node.confidence >= 0.5 ? "text-warning" : "text-muted";

  return (
    <div className={depth > 0 ? "ml-5 border-l border-border pl-4 mt-2" : ""}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 rounded-xl border border-border bg-surface2 p-3 text-left hover:border-accent/40 transition-colors"
      >
        {node.children.length > 0 && (
          <ChevronRight
            size={14}
            className={`mt-0.5 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {node.is_root_cause && <CheckCircle2 size={14} className="text-success shrink-0" />}
            {node.ruled_out && <XCircle size={14} className="text-muted shrink-0" />}
            <span
              className={`text-[13px] font-medium ${
                node.is_root_cause ? "text-success" : node.ruled_out ? "text-muted line-through" : "text-heading"
              }`}
            >
              {node.label}
            </span>
            <span className={`text-[11px] font-semibold ${confColor}`}>
              {Math.round(node.confidence * 100)}%
            </span>
          </div>
          <p className="text-[12px] text-muted mt-1">{node.evidence}</p>
        </div>
      </button>

      {open &&
        node.children.map((child) => (
          <HypothesisTree key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
