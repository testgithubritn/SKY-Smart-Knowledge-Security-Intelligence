"use client";
/** Historical context panel — shows prior crimes at the same location
 *  and named persons of interest from those prior incidents.
 *
 *  Rendered inside the IncidentCard whenever historicalContext is present.
 *  DEFENSIVE NULL-GUARDS: every nested field is null-checked before access,
 *  because Mongoose Schema.Types.Mixed defaults ({}) don't always survive
 *  JSON serialization when the parent object is set on the server.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "./badges";
import { MapPin, Users, Repeat, AlertTriangle, History } from "lucide-react";

interface HistoricalContext {
  locationHistory?: Array<{
    caseId?: string;
    modality?: string;
    riskLevel?: string;
    detectedCategories?: string[];
    createdAt?: string;
    subjects?: Array<{
      claimedName?: string;
      role?: string;
      isImpersonated?: boolean;
    }>;
    explanation?: string;
  }>;
  personsOfInterest?: Array<{
    subjectId?: string;
    claimedName?: string;
    rolesClaimed?: string[];
    isImpersonated?: boolean;
    isRepeatOffender?: boolean;
    totalIncidents?: number;
    firstSeenAt?: string;
    lastSeenAt?: string;
    locations?: string[];
    categories?: string[];
    riskProfile?: string;
  }>;
  locationStats?: {
    totalIncidents?: number;
    byRisk?: Record<string, number> | null;
    byCategory?: Record<string, number> | null;
    lastIncidentDate?: string | null;
  };
  repeatOffenders?: Array<{
    subjectId?: string;
    claimedName?: string;
    totalIncidents?: number;
    locations?: string[];
    lastSeenAt?: string;
  }>;
}

function safeEntries(obj: Record<string, number> | null | undefined): Array<[string, number]> {
  if (!obj || typeof obj !== "object") return [];
  try {
    return Object.entries(obj) as Array<[string, number]>;
  } catch {
    return [];
  }
}

function safeArray<T>(arr: T[] | null | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function HistoricalContextPanel({
  context,
}: {
  context: HistoricalContext | null | undefined;
}) {
  if (!context || typeof context !== "object") return null;

  const locationHistory = safeArray(context.locationHistory);
  const personsOfInterest = safeArray(context.personsOfInterest);
  const repeatOffenders = safeArray(context.repeatOffenders);
  const stats = context.locationStats ?? {};

  const totalPrior = Number(stats.totalIncidents ?? 0);
  const byRiskEntries = safeEntries(stats.byRisk ?? null);
  const byCategoryEntries = safeEntries(stats.byCategory ?? null);
  const lastDate = stats.lastIncidentDate ?? null;

  const hasData =
    locationHistory.length > 0 ||
    personsOfInterest.length > 0 ||
    repeatOffenders.length > 0 ||
    totalPrior > 0 ||
    byRiskEntries.length > 0;

  if (!hasData) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          Historical Context at this Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Location stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md border bg-background p-2">
            <div className="text-muted-foreground uppercase">Total Prior</div>
            <div className="text-lg font-bold">{totalPrior}</div>
          </div>
          {byRiskEntries.map(([r, c]) => (
            <div
              key={r ?? "unknown"}
              className="rounded-md border bg-background p-2"
            >
              <div className="text-muted-foreground uppercase">{safeStr(r) || "unknown"}</div>
              <div className="text-lg font-bold">{Number(c) || 0}</div>
            </div>
          ))}
          {lastDate && (
            <div className="rounded-md border bg-background p-2">
              <div className="text-muted-foreground uppercase">Last</div>
              <div className="text-xs font-medium leading-tight mt-1">
                {(() => {
                  try {
                    const d = new Date(lastDate);
                    if (isNaN(d.getTime())) return "—";
                    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`;
                  } catch {
                    return "—";
                  }
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Repeat offenders (high-signal) */}
        {repeatOffenders.length > 0 && (
          <div className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 p-2">
            <div className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1">
              <Repeat className="h-3 w-3" /> Repeat Offenders at this Location
            </div>
            <div className="flex flex-wrap gap-1.5">
              {repeatOffenders.map((s, i) => (
                <Badge
                  key={safeStr(s.subjectId) || `ro-${i}`}
                  variant="outline"
                  className="bg-rose-100 dark:bg-rose-950 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200"
                >
                  {safeStr(s.claimedName) || "Unknown"} · {Number(s.totalIncidents) || 0}×
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Persons of Interest */}
        {personsOfInterest.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="h-3 w-3" /> Persons of Interest from Prior Cases
            </div>
            <div className="space-y-1.5">
              {personsOfInterest.map((s, i) => {
                const claimedName = safeStr(s.claimedName);
                if (!claimedName) return null;
                return (
                  <div
                    key={safeStr(s.subjectId) || `poi-${i}`}
                    className="rounded-md border bg-background p-2 text-xs space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <span className="font-semibold">{claimedName}</span>{" "}
                        {s.isImpersonated && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-[9px] uppercase bg-violet-100 dark:bg-violet-950 border-violet-400 dark:border-violet-700 text-violet-800 dark:text-violet-200"
                          >
                            impersonator
                          </Badge>
                        )}
                        {s.isRepeatOffender && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-[9px] uppercase bg-rose-100 dark:bg-rose-950 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200"
                          >
                            repeat ×{Number(s.totalIncidents) || 0}
                          </Badge>
                        )}
                      </div>
                      <RiskBadge level={safeStr(s.riskProfile) || "moderate"} className="text-[10px]" />
                    </div>
                    <div className="text-muted-foreground leading-tight">
                      {safeArray(s.rolesClaimed).length > 0 && (
                        <div>
                          <b>Roles:</b> {safeArray(s.rolesClaimed).join(", ")}
                        </div>
                      )}
                      <div>
                        <b>First seen:</b>{" "}
                        {(() => {
                          try {
                            return s.firstSeenAt
                              ? new Date(s.firstSeenAt).toLocaleDateString()
                              : "—";
                          } catch {
                            return "—";
                          }
                        })()}{" "}
                        <b>Last seen:</b>{" "}
                        {(() => {
                          try {
                            return s.lastSeenAt
                              ? new Date(s.lastSeenAt).toLocaleDateString()
                              : "—";
                          } catch {
                            return "—";
                          }
                        })()}
                      </div>
                      {safeArray(s.locations).length > 0 && (
                        <div>
                          <b>Locations:</b> {safeArray(s.locations).join(" · ")}
                        </div>
                      )}
                      {safeArray(s.categories).length > 0 && (
                        <div>
                          <b>Categories:</b>{" "}
                          {safeArray(s.categories).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Location history */}
        {locationHistory.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Previous Incidents Here
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {locationHistory.map((h, i) => {
                const caseId = safeStr(h.caseId);
                if (!caseId) return null;
                return (
                  <div
                    key={caseId || `lh-${i}`}
                    className="rounded-md border bg-background p-2 text-xs space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {caseId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase"
                        >
                          {safeStr(h.modality) || "—"}
                        </Badge>
                        <RiskBadge level={safeStr(h.riskLevel) || "low"} className="text-[10px]" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {(() => {
                          try {
                            return h.createdAt
                              ? new Date(h.createdAt).toLocaleString()
                              : "—";
                          } catch {
                            return "—";
                          }
                        })()}
                      </span>
                    </div>
                    {safeArray(h.detectedCategories).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {safeArray(h.detectedCategories).map((c, ci) => (
                          <Badge
                            key={ci}
                            variant="secondary"
                            className="text-[9px] font-mono"
                          >
                            {safeStr(c)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {safeArray(h.subjects).length > 0 && (
                      <div className="text-[10px]">
                        <b className="text-muted-foreground">Subjects:</b>{" "}
                        {safeArray(h.subjects).map((s, idx) => (
                          <span key={idx}>
                            {idx > 0 && ", "}
                            <b>{safeStr(s.claimedName) || "Unknown"}</b> ({safeStr(s.role) || "—"}
                            {s.isImpersonated ? " — impersonated" : ""})
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                      {safeStr(h.explanation)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalPrior > 0 && (
          <div className="flex items-start gap-1 text-[10px] text-muted-foreground border-t pt-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              SKY is an AI-assisted decision-support platform. Historical
              context is investigative leads, not proof of identity or guilt.
              Verify before any enforcement action.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
