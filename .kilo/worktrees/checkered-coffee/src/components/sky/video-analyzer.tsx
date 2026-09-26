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
import { UploadCloud, Loader2, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import type { IncidentDoc } from "@/lib/models/incident";

export function VideoAnalyzer() {
  const { go } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [source, setSource] = useState("cctv-feed");
  const [location, setLocation] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<IncidentDoc & { _id: string } | null>(null);

  function handleFile(file: File) {
    setError(null);
    setIncident(null);
    // Accept ANY video format that ffmpeg can decode — mp4, webm, mov, avi, mkv, flv, wmv, 3gp, mpg, mpeg
    // We use the file name extension rather than the (often missing) MIME type
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const knownVideoExtensions = [
      "mp4", "webm", "mov", "avi", "mkv", "flv", "wmv", "3gp", "mpg", "mpeg", "m4v", "ts",
    ];
    const isVideoByExt = knownVideoExtensions.includes(ext);
    const isVideoByMime = file.type.startsWith("video/");
    if (!isVideoByExt && !isVideoByMime) {
      setError(
        `Please select a video file. Supported formats: ${knownVideoExtensions.join(", ")} (any format ffmpeg can decode).`
      );
      return;
    }
    // Cap at 50 MB — Gemini + OpenAI accept up to ~20MB inline, ffmpeg can decode any size
    if (file.size > 50 * 1024 * 1024) {
      setError(
        `Video file is ${Math.round(file.size / 1024 / 1024)}MB — too large. Please keep under 50 MB. (Tip: trim the clip to the relevant 5-15 seconds before uploading.)`
      );
      return;
    }
    // Warn for moderately large files (still allow)
    if (file.size > 15 * 1024 * 1024) {
      setError(
        `Note: Video is ${Math.round(file.size / 1024 / 1024)}MB — analysis may take 60-180 seconds. SKY will automatically extract key frames if inline video analysis fails.`
      );
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.onerror = () => {
      setError("Failed to read the video file. Try a different format or smaller clip.");
    };
    reader.readAsDataURL(file);
  }

  async function analyze(dataUrl: string) {
    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setIncident(null);

    const fakeTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 500);

    try {
      const res = await fetch("/api/sky/analyze/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video: dataUrl,
          preview: dataUrl, // use the video itself as the poster
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
      toast.success("Video analysis complete", {
        description: `Case ${json.incident.caseId} — risk: ${json.incident.riskLevel}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      toast.error("Video analysis failed");
    } finally {
      clearInterval(fakeTimer);
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <VideoIcon className="h-6 w-6" /> Video Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CCTV clip or video recording. SKY&apos;s VLM analyzes motion
          trajectories and scene cues to detect violence, snatch-theft,
          unauthorized entry, fire, accidents, and deepfake artifacts.
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Upload any video format — MP4, WebM, MOV, AVI, MKV, FLV, WMV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                Drag & drop a video, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Any format — MP4, WebM, MOV, AVI, MKV, FLV, WMV (max 50 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.3gp,.mpg,.mpeg,.m4v,.ts"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="cctv-feed / phone-upload"
                />
              </div>
              <div className="space-y-2">
                <LocationInput
                  id="location"
                  value={location}
                  onChange={setLocation}
                  placeholder="Type the location (e.g. Patancheru Junction, Sangareddy)"
                  required
                />
              </div>
            </div>

            {preview && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <video
                  src={preview}
                  controls
                  className="max-h-72 w-full rounded-md border bg-black"
                />
              </div>
            )}

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

            {analyzing && <Progress value={progress} className="h-2" />}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Analysis error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Incident record with timeline explanation, evidence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!incident ? (
                <div className="text-sm text-muted-foreground py-12 text-center">
                  No analysis yet. Upload a video and click <b>Run Analysis</b>.
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
