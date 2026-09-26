"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "./badges";
import { useRouter } from "./router";
import {
  ScrollText,
  Plus,
  RefreshCw,
  Loader2,
  FileText,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { IncidentDoc } from "@/lib/models/incident";

interface ReportItem {
  _id: string;
  reportId: string;
  title: string;
  summary: string;
  fullReport: string;
  recommendations: string[];
  incidentIds: string[];
  riskProfile: string;
  status: string;
  generatedBy?: string;
  createdAt: string;
}

export function Reports() {
  const { go } = useRouter();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterRisk, setFilterRisk] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/sky/reports"),
        fetch(`/api/sky/incidents?${filterRisk !== "all" ? `risk=${filterRisk}` : ""}`),
      ]);
      if (!r1.ok || !r2.ok) throw new Error("Failed to load data");
      const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
      setReports(j1.reports);
      setIncidents(j2.incidents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
     
  }, [filterRisk]);

  async function generate() {
    if (selected.length === 0) {
      toast.error("Select at least one incident");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sky/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentIds: selected,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate report");
      }
      const json = await res.json();
      toast.success("Report generated", {
        description: json.report.reportId,
      });
      setSelected([]);
      setShowAdd(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setSubmitting(false);
    }
  }

  function toggle(id: string) {
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            LLM-composed incident reports. Drafts — finalize after human review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-4 w-4" /> New Report
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Generate new report</CardTitle>
            <CardDescription>
              Select incidents — the LLM will compose a structured incident
              report with background, findings, evidence reviewed, risk
              assessment, and next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="space-y-2 flex-1">
                <Label>Filter by risk</Label>
                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All risk levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground pb-2">
                {selected.length} selected
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-md border p-2">
              {incidents.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  No incidents to select from. Run analyses first.
                </div>
              ) : (
                incidents.map((i) => {
                  const id = String(i._id);
                  const sel = selected.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        sel
                          ? "bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggle(id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono">{i.caseId}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {i.modality}
                          </Badge>
                          <RiskBadge level={i.riskLevel} />
                        </div>
                        <p className="text-xs mt-1 line-clamp-2 opacity-80">
                          {i.explanation}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Composing…
                  </>
                ) : (
                  <>Generate</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">{error}</CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No reports yet</CardTitle>
            <CardDescription>
              Click <b>New Report</b> above to select incidents and generate one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => go("incidents")}>
              Browse incidents
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.reportId}
                      </span>
                      <RiskBadge level={r.riskProfile} />
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {r.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mt-1">{r.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.summary}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                    <div>by {r.generatedBy ?? "—"}</div>
                    <div className="mt-1">
                      {r.incidentIds.length} incident(s)
                    </div>
                  </div>
                </div>

                <div className="rounded-md border bg-slate-50 dark:bg-slate-900 p-3 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      // Treat markdown safely
                      p: ({ children }) => (
                        <p className="text-sm leading-relaxed mb-2">
                          {children}
                        </p>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-sm font-bold mt-3 mb-1">
                          {children}
                        </h2>
                      ),
                      ul: ({ children }) => (
                        <ul className="text-sm list-disc pl-5 mb-2">
                          {children}
                        </ul>
                      ),
                    }}
                  >
                    {r.fullReport}
                  </ReactMarkdown>
                </div>

                {r.recommendations.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Recommendations
                    </div>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {r.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-1.5 flex-wrap">
                  {r.incidentIds.map((id) => (
                    <Badge
                      key={id}
                      variant="outline"
                      className="font-mono text-[10px]"
                    >
                      {id}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
