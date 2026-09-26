"use client";
import { useState, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IncidentCard } from "./incident-card";
import { useRouter } from "./router";
import { LocationInput } from "./location-input";
import { UploadCloud, Link as LinkIcon, Loader2, Scan } from "lucide-react";
import { toast } from "sonner";
import type { IncidentDoc } from "@/lib/models/incident";

export function ImageAnalyzer() {
  const { go } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [source, setSource] = useState("manual-upload");
  const [location, setLocation] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<IncidentDoc & { _id: string } | null>(null);

  function handleFile(file: File) {
    setError(null);
    setIncident(null);
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPEG, WebP, GIF).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function analyze(dataUrl: string) {
    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setIncident(null);

    // Fake progress while waiting for VLM
    const fakeTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 92));
    }, 350);

    try {
      const res = await fetch("/api/sky/analyze/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          source,
          location,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }
      const json = await res.json();
      setIncident(json.incident);
      setProgress(100);
      toast.success("Image analysis complete", {
        description: `Case ${json.incident.caseId} — risk: ${json.incident.riskLevel}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      toast.error("Image analysis failed");
    } finally {
      clearInterval(fakeTimer);
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Scan className="h-6 w-6" /> Image Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a surveillance photo, screenshot, or scene image. SKY uses VLM
          to detect violence, theft, unauthorized entry, fire, accidents, fraud
          cues, and manipulated-media artifacts.
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload panel */}
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Upload an image or paste an image URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center cursor-pointer rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
            >
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop an image, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPEG, WebP, GIF — max ~10 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            {/* URL input */}
            <div className="space-y-2">
              <Label htmlFor="url">Or paste image URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="url"
                    placeholder="https://example.com/scene.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!imageUrl.trim()) return;
                    setPreview(imageUrl.trim());
                    setIncident(null);
                  }}
                >
                  Load
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="cctv-feed / phone-upload / etc"
                />
              </div>
              <div className="space-y-2">
                <LocationInput
                  id="location"
                  value={location}
                  onChange={setLocation}
                  placeholder="Type the location (e.g. Banjara Hills, Hyderabad)"
                  required
                />
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="space-y-2">
                <Label>Preview</Label>
                { }
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-72 w-full rounded-md border object-contain bg-slate-50 dark:bg-slate-900"
                />
              </div>
            )}

            {/* Action */}
            <Button
              disabled={!preview || analyzing || !location.trim()}
              onClick={() => analyze(preview)}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                </>
              ) : (
                "Run Analysis"
              )}
            </Button>
            {!location.trim() && preview && (
              <p className="text-xs text-rose-500 text-center">
                Type a location to enable Run Analysis
              </p>
            )}

            {analyzing && (
              <Progress value={progress} className="h-2" />
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Analysis error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Result panel */}
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Incident record with detected categories, risk, RAG evidence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!incident ? (
                <div className="text-sm text-muted-foreground py-12 text-center">
                  No analysis yet. Upload an image and click{" "}
                  <b>Run Analysis</b>.
                </div>
              ) : (
                <IncidentCard incident={incident} />
              )}
            </CardContent>
          </Card>
          {incident && (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => go("incidents")}>
                View in incident log
              </Button>
              <Button variant="outline" onClick={() => go("review")}>
                Send to review queue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
