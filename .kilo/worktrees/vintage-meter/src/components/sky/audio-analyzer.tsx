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
import { Badge } from "@/components/ui/badge";
import { IncidentCard } from "./incident-card";
import { useRouter } from "./router";
import { LocationInput } from "./location-input";
import { UploadCloud, Loader2, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { IncidentDoc } from "@/lib/models/incident";

const SAMPLE_SCENARIOS = [
  {
    label: "Bank impersonation scam (Telangana)",
    value:
      "Hello, this is Sub-Inspector Krishna Reddy from Cyberabad Cyber Crime Police Station. We have detected that your Aadhaar has been linked to two illegal bank accounts at SBI Hitech City branch. To prevent your account from being frozen, please share the OTP you just received on your phone right now. Do not disconnect this call. This is urgent.",
  },
  {
    label: "Refund scam (Hyderabad Amazon)",
    value:
      "Hello, this is Srinivas from Amazon customer service Hyderabad. We are processing a refund of 5000 rupees for your recent order that was cancelled. To verify your account, please install the AnyDesk app and tell me the 9-digit code on your screen. You will receive an OTP, please read it out to me now.",
  },
  {
    label: "Customs-seizure fraud (Rachakonda)",
    value:
      "This is Sub-Inspector Ganganna from Rachakonda Cyber Crime Police. We have seized a FedEx package addressed to you at Hyderabad airport containing 2 lakh rupees cash and drugs. You need to pay 30,000 rupees verification fee via UPI to clear your name, otherwise we will issue arrest warrant tomorrow.",
  },
  {
    label: "Voice impersonation / ransom",
    value:
      "Nanna, it's me. I am in big trouble. I had an accident near Gachibowli stadium and the police need 50,000 rupees right now or they will arrest me. Please send the money immediately to this UPI id vijay-babu@oksbi. Please don't call my regular number, the police have my phone. Hurry, please.",
  },
  {
    label: "Benign conversation (Telangana)",
    value:
      "Hi amma, I am going to be late coming home today. There is too much traffic near Hitech City metro. I will pick up some groceries from Ratnadeep on the way back. Do you need anything from the store? I will see you in about an hour. Take care.",
  },
];

export function AudioAnalyzer() {
  const { go } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [source, setSource] = useState("voip-call");
  const [location, setLocation] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<IncidentDoc & { _id: string } | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoTranscript, setDemoTranscript] = useState("");

  function handleFile(file: File) {
    setError(null);
    setIncident(null);
    if (!file.type.startsWith("audio/")) {
      setError("Please select an audio file (WAV, MP3, M4A).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function analyze(audioInput: string) {
    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setIncident(null);

    const fakeTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 400);

    try {
      const res = await fetch("/api/sky/analyze/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: audioInput,
          source,
          location,
          transcript: demoMode ? demoTranscript : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }
      const json = await res.json();
      setIncident(json.incident);
      setProgress(100);
      toast.success("Audio analysis complete", {
        description: `Case ${json.incident.caseId} — risk: ${json.incident.riskLevel}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      toast.error("Audio analysis failed");
    } finally {
      clearInterval(fakeTimer);
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mic className="h-6 w-6" /> Voice / Audio Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a call recording, voice note, or paste a sample transcript.
          SKY transcribes with ASR, then classifies for payment-fraud, scams,
          impersonation, threats, misleading-info, and synthetic-voice cues.
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>
              Choose to upload audio OR use a sample text transcript
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={demoMode ? "outline" : "default"}
                onClick={() => setDemoMode(false)}
              >
                Upload Audio
              </Button>
              <Button
                size="sm"
                variant={demoMode ? "default" : "outline"}
                onClick={() => setDemoMode(true)}
              >
                <Sparkles className="h-4 w-4 mr-1" /> Sample Transcript
              </Button>
            </div>

              {!demoMode ? (
                <>
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
                      Drag & drop audio, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      WAV, MP3, M4A — max ~25 MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </div>
                  {preview && (
                    <audio
                      src={preview}
                      controls
                      className="w-full"
                    />
                  )}
                  {fileName && (
                    <p className="text-xs text-muted-foreground">
                      Loaded: {fileName}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Pick a sample scenario</Label>
                    <div className="flex flex-wrap gap-2">
                      {SAMPLE_SCENARIOS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => setDemoTranscript(s.value)}
                          className="text-xs rounded-md border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transcript">Or paste a transcript</Label>
                    <textarea
                      id="transcript"
                      value={demoTranscript}
                      onChange={(e) => setDemoTranscript(e.target.value)}
                      rows={6}
                      placeholder="Paste call transcript here…"
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </>
              )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <LocationInput
                  id="location"
                  value={location}
                  onChange={setLocation}
                  placeholder="Type the location (e.g. Phone Call — Inbound 9000-123-4567)"
                  required
                />
              </div>
            </div>

            <Button
              disabled={
                analyzing ||
                !location.trim() ||
                (!demoMode && !preview) ||
                (demoMode && !demoTranscript.trim())
              }
              onClick={() => analyze(demoMode ? `demo:${demoTranscript}` : preview)}
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
            {!location.trim() && (preview || (demoMode && demoTranscript.trim())) && (
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
                Transcript + LLM classification + RAG evidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!incident ? (
                <div className="text-sm text-muted-foreground py-12 text-center">
                  No analysis yet. {demoMode ? "Pick a sample and" : "Upload audio and"}{" "}
                  click <b>Run Analysis</b>.
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
