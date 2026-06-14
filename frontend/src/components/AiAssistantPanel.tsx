"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mic, Send, FolderSearch, BarChart3, ShieldCheck, Wallet } from "lucide-react";
import { Card } from "./ui";

const SUGGESTIONS = [
  { label: "Investigate an issue", icon: FolderSearch, prompt: "Why is checkout latency increasing in Singapore?" },
  { label: "Performance insights", icon: BarChart3, prompt: "Why was API latency high yesterday?" },
  { label: "Security analysis", icon: ShieldCheck, prompt: "Investigate the suspicious login alert" },
  { label: "Cost optimization", icon: Wallet, prompt: "Why did cloud costs rise 35 percent?" },
];

export default function AiAssistantPanel() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(prompt: string) {
    router.push(`/ops-intelligence?q=${encodeURIComponent(prompt)}`);
  }

  return (
    <Card className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] border-none p-5 flex flex-col text-white shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-[15px] font-semibold text-white flex items-center gap-1.5">
          NeuroMind AI Assistant <Sparkles size={15} className="text-primary" />
        </h3>
      </div>
      <p className="text-[13px] text-white/70 mb-4">Hi, Alex! How can I help you today?</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => go(s.prompt)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-[12.5px] text-white hover:bg-white/10 transition-colors"
          >
            <s.icon size={15} className="text-white/70" />
            {s.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) go(value.trim());
        }}
        className="mt-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/50 outline-none"
        />
        <Mic size={16} className="text-white/60" />
        <button
          type="submit"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </Card>
  );
}
