"use client";
import { useEffect, useState, useReducer } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IncidentCard } from "./incident-card";
import { useRouter } from "./router";
import {
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { IncidentDoc } from "@/lib/models/incident";

type State = { items: IncidentDoc[]; loading: boolean; error: string | null; tick: number };
type Action =
  | { type: "loading" }
  | { type: "loaded"; items: IncidentDoc[] }
  | { type: "error"; error: string }
  | { type: "tick" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { ...state, items: action.items, loading: false };
    case "error":
      return { ...state, error: action.error, loading: false };
    case "tick":
      return { ...state, tick: state.tick + 1 };
  }
}

export function ReviewQueue({ presetStatus = "pending" }: { presetStatus?: string }) {
  const { go, setPendingCount } = useRouter();
  const [status, setStatus] = useState(presetStatus);
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: true,
    error: null,
    tick: 0,
  });
  const [reviewer, setReviewer] = useState("operator-1");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  async function load() {
    dispatch({ type: "loading" });
    try {
      const res = await fetch(`/api/sky/review?status=${status}`);
      if (!res.ok) throw new Error("Failed to load review queue");
      const json = await res.json();
      dispatch({ type: "loaded", items: json.incidents });
      if (status === "pending") setPendingCount(json.total);
    } catch (e) {
      dispatch({
        type: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  useEffect(() => {
    load();
     
  }, [status, state.tick]);

  async function submitDecision(
    id: string,
    decision: "approved" | "rejected" | "escalated"
  ) {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/sky/incidents/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus: decision,
          reviewer,
          reviewerNote: notes[id] ?? "",
        }),
      });
      if (!res.ok) throw new Error("Failed to update review");
      toast.success(`Incident ${decision}`, {
        description: `Marked as ${decision} by ${reviewer}`,
      });
      // Trigger reload
      dispatch({ type: "tick" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit decision");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Review Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Human-in-the-loop adjudication. Every SKY finding must be reviewed
            before any enforcement or external action.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={status === "pending" ? "default" : "outline"}
            onClick={() => setStatus("pending")}
          >
            Pending
          </Button>
          <Button
            size="sm"
            variant={status === "escalated" ? "default" : "outline"}
            onClick={() => setStatus("escalated")}
          >
            Escalated
          </Button>
          <Button
            size="sm"
            variant={status === "approved" ? "default" : "outline"}
            onClick={() => setStatus("approved")}
          >
            Approved
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="reviewer" className="text-xs">
          Reviewer
        </Label>
        <Input
          id="reviewer"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          className="max-w-xs h-8"
        />
      </div>

      {/* List */}
      {state.loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : state.error ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">
            {state.error}
          </CardContent>
        </Card>
      ) : state.items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Queue empty</CardTitle>
            <CardDescription>
              No incidents with status <b>{status}</b>. Run more analyses or
              check other statuses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => go("analyze-image")}>
              Analyze media
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {state.items.map((i) => {
            const id = String(i._id);
            return (
              <div key={id} className="space-y-2">
                <IncidentCard incident={{ ...(i as IncidentDoc), _id: id }} />
                {status === "pending" || status === "escalated" ? (
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <div className="space-y-2">
                        <Label htmlFor={`note-${id}`} className="text-xs">
                          Reviewer note (will be saved with the decision)
                        </Label>
                        <Textarea
                          id={`note-${id}`}
                          value={notes[id] ?? ""}
                          onChange={(e) =>
                            setNotes((p) => ({ ...p, [id]: e.target.value }))
                          }
                          rows={2}
                          placeholder="e.g. Confirmed payment-fraud pattern based on transcript — quote verified against Knowledge Base entry. / False positive — game footage, not actual violence."
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingId === id}
                          onClick={() => submitDecision(id, "escalated")}
                        >
                          {submittingId === id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          Escalate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingId === id}
                          onClick={() => submitDecision(id, "rejected")}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          <X className="h-4 w-4" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={submittingId === id}
                          onClick={() => submitDecision(id, "approved")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {submittingId === id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-3 text-xs text-muted-foreground">
                      Reviewed by <b>{i.reviewer || "—"}</b> — note:{" "}
                      {i.reviewerNote || "(no note)"}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => go("reports")}>
          <Send className="h-4 w-4" /> Generate incident report
        </Button>
      </div>
    </div>
  );
}
