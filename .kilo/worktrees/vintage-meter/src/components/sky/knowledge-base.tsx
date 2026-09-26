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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, RefreshCw, Plus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeItem {
  _id: string;
  title: string;
  category: string;
  modality: string;
  content: string;
  keywords?: string[];
  severityHint?: string;
  source?: string;
  createdAt?: string;
}

const CATEGORIES = [
  "fraud",
  "scam",
  "violence",
  "theft",
  "unauthorized-entry",
  "fire",
  "accident",
  "impersonation",
  "manipulated-media",
  "regulation",
  "other",
];

const MODALITIES = ["image", "video", "audio", "any"];
const SEVERITIES = ["low", "moderate", "high", "critical"];

export function KnowledgeBase() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [modal, setModal] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New entry form state
  const [nTitle, setNTitle] = useState("");
  const [nContent, setNContent] = useState("");
  const [nCat, setNCat] = useState("other");
  const [nMod, setNMod] = useState("any");
  const [nKw, setNKw] = useState("");
  const [nSev, setNSev] = useState("moderate");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cat !== "all") params.set("category", cat);
      if (modal !== "all") params.set("modality", modal);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/sky/knowledge?${params}`);
      if (!res.ok) throw new Error("Failed to load knowledge");
      const json = await res.json();
      setItems(json.knowledge);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
     
  }, [cat, modal]);

  async function addEntry() {
    if (!nTitle.trim() || !nContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sky/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nTitle,
          content: nContent,
          category: nCat,
          modality: nMod,
          keywords: nKw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          severityHint: nSev,
          source: "custom",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add entry");
      }
      toast.success("Knowledge entry added");
      setNTitle("");
      setNContent("");
      setNKw("");
      setShowAdd(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trusted-source documents used for RAG retrieval during analysis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-4 w-4" /> Add Source
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add new knowledge source</CardTitle>
            <CardDescription>
              Will be available for retrieval in the next analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="n-title">Title</Label>
              <Input
                id="n-title"
                value={nTitle}
                onChange={(e) => setNTitle(e.target.value)}
                placeholder="e.g. Online Romance Scam Indicators"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-content">Content</Label>
              <Textarea
                id="n-content"
                value={nContent}
                onChange={(e) => setNContent(e.target.value)}
                rows={5}
                placeholder="Describe the threat, indicators, and recommended action…"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={nCat} onValueChange={setNCat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modality</Label>
                <Select value={nMod} onValueChange={setNMod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={nSev} onValueChange={setNSev}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n-kw">Keywords (comma-sep)</Label>
                <Input
                  id="n-kw"
                  value={nKw}
                  onChange={(e) => setNKw(e.target.value)}
                  placeholder="otp, urgent, transfer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={addEntry} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Entry"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title / content…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") load();
                }}
                className="pl-8"
              />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modal} onValueChange={setModal}>
              <SelectTrigger><SelectValue placeholder="Modality" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modalities</SelectItem>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((k) => (
            <Card key={k._id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight">
                    {k.title}
                  </h3>
                  <Badge variant="outline" className="shrink-0">
                    {k.severityHint ?? "moderate"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {k.category}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {k.modality}
                  </Badge>
                  {(k.keywords ?? []).slice(0, 4).map((kw) => (
                    <Badge
                      key={kw}
                      variant="outline"
                      className="text-[10px] font-mono"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {k.content.length > 240
                    ? k.content.slice(0, 240) + "…"
                    : k.content}
                </p>
                <div className="text-[10px] text-muted-foreground">
                  {k.source ?? "trusted"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
