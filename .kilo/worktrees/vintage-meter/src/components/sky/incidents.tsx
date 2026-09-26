"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { IncidentCard } from "./incident-card";
import { useRouter } from "./router";
import { ListFilter, RefreshCw, Search } from "lucide-react";
import type { IncidentDoc } from "@/lib/models/incident";

interface Props {
  presetRisk?: string;
  presetModality?: string;
  presetReview?: string;
  presetQuery?: string;
}

export function Incidents({
  presetRisk,
  presetModality,
  presetReview,
  presetQuery,
}: Props) {
  const { go } = useRouter();
  const [items, setItems] = useState<IncidentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(presetQuery ?? "");
  const [modality, setModality] = useState(presetModality ?? "all");
  const [risk, setRisk] = useState(presetRisk ?? "all");
  const [review, setReview] = useState(presetReview ?? "all");
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (modality !== "all") params.set("modality", modality);
      if (risk !== "all") params.set("risk", risk);
      if (review !== "all") params.set("reviewStatus", review);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/sky/incidents?${params}`);
      if (!res.ok) throw new Error("Failed to load incidents");
      const json = await res.json();
      setItems(json.incidents);
      setTotal(json.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
     
  }, [modality, risk, review]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListFilter className="h-6 w-6" /> Incident Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} total · full history across image, video, and audio
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative md:col-span-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search case / explanation / transcript…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") load();
                }}
                className="pl-8"
              />
            </div>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger><SelectValue placeholder="Modality" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modalities</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk levels</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={review} onValueChange={setReview}>
              <SelectTrigger><SelectValue placeholder="Review" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">{error}</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No incidents match</CardTitle>
            <CardDescription>
              Try adjusting filters, or analyze some media in the Image /
              Video / Audio tabs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => go("analyze-image")}>
              Go to Image Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((i) => (
            <IncidentCard
              key={String(i._id)}
              incident={{ ...(i as IncidentDoc), _id: String(i._id) }}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
