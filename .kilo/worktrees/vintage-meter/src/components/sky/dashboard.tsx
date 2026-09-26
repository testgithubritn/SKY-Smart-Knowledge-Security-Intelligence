"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IncidentCard } from "./incident-card";
import { useRouter } from "./router";
import { Activity, AlertTriangle, Database, ShieldCheck } from "lucide-react";
import type { IncidentDoc } from "@/lib/models/incident";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Stats {
  totals: {
    incidents: number;
    pending: number;
    approved: number;
    rejected: number;
    escalated: number;
    critical: number;
    knowledge: number;
    reports: number;
  };
  modality: Record<string, number>;
  risk: Record<string, number>;
  recentIncidents: unknown[];
}

const RISK_COLORS: Record<string, string> = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const MODALITY_COLORS: Record<string, string> = {
  image: "#06b6d4",
  video: "#d946ef",
  audio: "#14b8a6",
};

export function Dashboard() {
  const { go } = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/sky/stats");
        if (!res.ok) throw new Error("Failed to load stats");
        const json = await res.json();
        if (alive) {
          setStats(json);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-rose-600">
          Failed to load dashboard: {error ?? "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  const t = stats.totals;
  const modalityData = Object.entries(stats.modality).map(([k, v]) => ({
    name: k,
    value: v,
  }));
  const riskData = Object.entries(stats.risk).map(([k, v]) => ({
    name: k,
    value: v,
  }));

  return (
    <div className="space-y-6">
      {/* Gradient hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 md:p-8 text-white shadow-xl shadow-indigo-500/20"
      >
        {/* Floating orbs */}
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-fuchsia-300/20 blur-2xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-widest text-indigo-200 mb-1">
            Security Operations Center · Telangana
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-sm text-indigo-100/80 mt-2 max-w-2xl">
            Real-time view of all SKY multimodal analyses — image, video, and
            voice/audio. All findings are advisory and require human review
            before any enforcement action.
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1">
              <span className="font-bold">{t.incidents}</span> total incidents
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1">
              <span className="font-bold">{t.critical}</span> critical
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1">
              <span className="font-bold">{t.pending}</span> pending review
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1">
              <span className="font-bold">{t.knowledge}</span> knowledge sources
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Incidents"
          value={t.incidents}
          icon={<Activity className="h-4 w-4" />}
          tone="slate"
        />
        <KpiCard
          label="Pending Review"
          value={t.pending}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="amber"
          onClick={() => go("review")}
        />
        <KpiCard
          label="Critical Risk"
          value={t.critical}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="red"
          onClick={() => go("incidents")}
        />
        <KpiCard
          label="Knowledge Sources"
          value={t.knowledge}
          icon={<Database className="h-4 w-4" />}
          tone="cyan"
          onClick={() => go("knowledge")}
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["pending", "approved", "rejected", "escalated"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">{s}</div>
              <div className="text-2xl font-bold mt-1">
                {String(t[s] ?? 0)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Modality</CardTitle>
            <CardDescription>Distribution across input types</CardDescription>
          </CardHeader>
          <CardContent>
            {modalityData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={modalityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" name="Incidents">
                    {modalityData.map((d, i) => (
                      <Cell key={i} fill={MODALITY_COLORS[d.name] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Level Distribution</CardTitle>
            <CardDescription>
              Critical-risk incidents require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {riskData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {riskData.map((d, i) => (
                      <Cell key={i} fill={RISK_COLORS[d.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Incidents</span>
            <button
              onClick={() => go("incidents")}
              className="text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              View all →
            </button>
          </CardTitle>
          <CardDescription>Latest 5 analyzed by SKY</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recentIncidents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No incidents yet. Upload media in the Image / Video / Audio tabs to
              begin.
            </div>
          ) : (
            stats.recentIncidents.map((i) => (
              <IncidentCard
                key={(i as { _id: string })._id}
                incident={i as IncidentDoc}
                compact
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "slate" | "amber" | "red" | "cyan";
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    slate: "border-slate-300 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700",
    amber:
      "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800",
    red: "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800",
    cyan: "border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 dark:border-cyan-800",
  };
  return (
    <Card
      className={
        "cursor-pointer transition-transform hover:-translate-y-0.5 " + tones[tone]
      }
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-muted-foreground">
            {label}
          </span>
          {icon}
        </div>
        <div className="mt-2 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
      No data yet.
    </div>
  );
}
