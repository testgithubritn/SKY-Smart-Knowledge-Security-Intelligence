"use client";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  Mic,
  ListFilter,
  ShieldCheck,
  BookOpen,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type SectionKey =
  | "dashboard"
  | "analyze-image"
  | "analyze-video"
  | "analyze-audio"
  | "incidents"
  | "review"
  | "knowledge"
  | "reports";

interface NavItem {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    key: "analyze-image",
    label: "Image Analysis",
    icon: ImageIcon,
    description: "VLM-based scene detection",
  },
  {
    key: "analyze-video",
    label: "Video Analysis",
    icon: Video,
    description: "CCTV / clip forensics",
  },
  {
    key: "analyze-audio",
    label: "Voice / Audio",
    icon: Mic,
    description: "ASR + scam classification",
  },
  {
    key: "incidents",
    label: "Incident Log",
    icon: ListFilter,
    description: "All recorded incidents",
  },
  {
    key: "review",
    label: "Review Queue",
    icon: ShieldCheck,
    description: "Human-in-the-loop",
  },
  {
    key: "knowledge",
    label: "Knowledge Base",
    icon: BookOpen,
    description: "RAG trusted sources",
  },
  {
    key: "reports",
    label: "Reports",
    icon: ScrollText,
    description: "Generated incident reports",
  },
];

export function Sidebar({
  active,
  onSelect,
  pendingCount,
}: {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  pendingCount?: number;
}) {
  return (
    <aside className="flex w-full flex-col gap-2 p-3 md:w-72 text-slate-50">
      {/* Gradient logo header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 px-3 py-4"
      >
        <motion.div
          whileHover={{ rotate: -8, scale: 1.05 }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30"
        >
          <ShieldCheck className="h-6 w-6 text-white" />
        </motion.div>
        <div>
          <div className="font-bold tracking-tight text-lg bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
            SKY
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            Security Intelligence
          </div>
        </div>
      </motion.div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item, idx) => {
          const isActive = active === item.key;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.key}
              onClick={() => onSelect(item.key)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                isActive
                  ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-md ring-1 ring-white/10 backdrop-blur-sm"
                  : "hover:bg-white/5 text-slate-300"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-indigo-300"
                    : "text-slate-400 group-hover:text-indigo-300"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.key === "review" && pendingCount ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      key={pendingCount}
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        isActive
                          ? "bg-white text-rose-600"
                          : "bg-amber-500 text-white shadow-sm"
                      )}
                    >
                      {pendingCount}
                    </motion.span>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "text-[11px] leading-tight",
                    isActive ? "text-slate-300" : "text-slate-500"
                  )}
                >
                  {item.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
}

export { NAV };
