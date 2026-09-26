"use client";
/** Single incident card — reused across Dashboard, Incidents, Review, Reports.
 *  Now renders the Historical Context panel below the main card when
 *  historicalContext is populated (previous incidents at this location +
 *  named persons of interest from those prior cases). */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, ReviewBadge, ModalityBadge } from "./badges";
import { HistoricalContextPanel } from "./historical-context-panel";
import type { IncidentDoc } from "@/lib/models/incident";

interface Props {
  incident: IncidentDoc & { _id: string };
  compact?: boolean;
}

export function IncidentCard({ incident, compact = false }: Props) {
  const created = new Date(incident.createdAt as unknown as string).toLocaleString();
  // DEFENSIVE: historicalContext may be null/undefined for seeded incidents
  // OR have empty/undefined nested fields after JSON serialization.
  const ctx = incident.historicalContext as
    | {
        locationHistory?: unknown[];
        personsOfInterest?: unknown[];
        locationStats?:
          | {
              totalIncidents?: number;
              byRisk?: Record<string, number> | null;
              byCategory?: Record<string, number> | null;
              lastIncidentDate?: string | null;
            }
          | null
          | undefined;
        repeatOffenders?: unknown[];
      }
    | null
    | undefined;

  const hasContext =
    ctx &&
    typeof ctx === "object" &&
    ((Array.isArray(ctx.locationHistory) && ctx.locationHistory.length > 0) ||
      (Array.isArray(ctx.personsOfInterest) && ctx.personsOfInterest.length > 0) ||
      (Array.isArray(ctx.repeatOffenders) && ctx.repeatOffenders.length > 0) ||
      Number(ctx.locationStats?.totalIncidents ?? 0) > 0);

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">
                {incident.caseId}
              </span>
              <ModalityBadge modality={incident.modality} />
              <RiskBadge level={incident.riskLevel} />
              <ReviewBadge status={incident.reviewStatus} />
            </div>
            <div className="text-xs text-muted-foreground">
              {created} · {incident.location}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold leading-none">
              {Math.round((incident.confidence ?? 0) * 100)}%
            </div>
            <div className="text-[10px] uppercase text-muted-foreground">
              confidence
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {incident.detectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {incident.detectedCategories.map((c) => (
                <Badge key={c} variant="secondary" className="font-mono text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm leading-relaxed">{incident.explanation}</p>

          {/* Preview media */}
          {!compact && incident.previewRef && incident.modality === "image" && (
             
            <img
              src={incident.previewRef}
              alt={incident.caseId}
              className="max-h-64 w-full rounded-md border object-contain bg-slate-50 dark:bg-slate-900"
            />
          )}
          {!compact && incident.previewRef && incident.modality === "video" && (
            <video
              src={incident.previewRef || incident.inputRef}
              controls
              className="max-h-64 w-full rounded-md border bg-black"
            />
          )}
          {!compact && incident.transcript && (
            <div className="rounded-md border bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Transcript
              </div>
              <p className="text-sm italic">{incident.transcript}</p>
            </div>
          )}

          {/* Subjects in THIS incident */}
          {!compact && incident.subjects && incident.subjects.length > 0 && (
            <div className="rounded-md border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-2">
              <div className="text-xs font-semibold uppercase text-violet-700 dark:text-violet-300 mb-1">
                Subjects in this incident
              </div>
              <div className="space-y-1">
                {incident.subjects.map((s, i) => (
                  <div key={i} className="text-xs">
                    <b>{s.claimedName}</b> — role: {s.role || "(unspecified)"}
                    {s.isImpersonated && (
                      <Badge
                        variant="outline"
                        className="ml-1 text-[9px] uppercase bg-violet-100 dark:bg-violet-950 border-violet-400 dark:border-violet-700 text-violet-800 dark:text-violet-200"
                      >
                        impersonator
                      </Badge>
                    )}
                    {s.notes && (
                      <span className="text-muted-foreground"> · {s.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hint when video/image has no subjects extracted — point user to POIs panel */}
          {!compact &&
            (!incident.subjects || incident.subjects.length === 0) &&
            (incident.modality === "video" || incident.modality === "image") && (
              <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 text-xs text-muted-foreground">
                <b>Subjects not extracted from {incident.modality}.</b> Visual
                analysis detects categories & risk, but does not name
                individuals. See <b>Persons of Interest from Prior Cases</b>{" "}
                below for named criminals linked to this location and crime
                category.
              </div>
            )}

          {incident.evidence?.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                RAG Evidence
              </div>
              {incident.evidence.map((e, i) => (
                <div key={i} className="rounded-md border p-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{e.title}</span>
                    <Badge variant="outline" className="shrink-0">
                      {Math.round((e.relevance ?? 0) * 100)}%
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{e.snippet}</p>
                </div>
              ))}
            </div>
          )}

          {incident.reviewerNote && (
            <div className="rounded-md border border-violet-300 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-800 p-2 text-xs">
              <span className="font-semibold">Reviewer note:</span>{" "}
              {incident.reviewerNote}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical context panel — only render when there's actually data */}
      {hasContext && (
        <HistoricalContextPanel context={ctx as never} />
      )}
    </div>
  );
}
