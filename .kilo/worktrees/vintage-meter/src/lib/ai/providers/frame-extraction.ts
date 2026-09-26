/**
 * Frame extraction + multi-frame analysis fallback.
 *
 * When Gemini's inline-video analysis fails (or the video format isn't
 * supported by Gemini — e.g., AVI, MKV, WMV), we extract N key frames
 * spread evenly across the video using ffmpeg, send each frame to the
 * best available image-analysis provider (Gemini image → OpenAI image),
 * and combine the per-frame results into a single video analysis.
 *
 * This makes SKY video analysis work for ANY video format that ffmpeg
 * can decode.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { analyzeImageWithProviders } from "./index";

const execFileAsync = promisify(execFile);

export interface FrameAnalysis {
  frameIndex: number;
  timestampSec: number;
  response: string;
  provider: string;
}

export interface CombinedVideoAnalysis {
  rawResponse: string;
  provider: string;
  frameCount: number;
  frameAnalyses: FrameAnalysis[];
}

/**
 * Extract N key frames from a video using ffmpeg.
 * Frames are spread evenly across the video duration.
 * Returns paths to extracted JPEG files (each ~50-150KB).
 */
export async function extractKeyFrames(
  videoPath: string,
  frameCount = 5
): Promise<Array<{ path: string; timestampSec: number }>> {
  // First, probe the video duration
  let durationSec = 0;
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);
    durationSec = parseFloat(stdout.trim()) || 0;
  } catch {
    // If ffprobe fails, assume 5 seconds
    durationSec = 5;
  }

  if (durationSec <= 0) durationSec = 5;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sky-frames-"));
  const frames: Array<{ path: string; timestampSec: number }> = [];

  // Spread timestamps evenly — skip the very first/last second
  const startOffset = Math.min(1, durationSec * 0.1);
  const endOffset = Math.min(1, durationSec * 0.1);
  const usableDuration = durationSec - startOffset - endOffset;
  const step = usableDuration / Math.max(frameCount - 1, 1);

  for (let i = 0; i < frameCount; i++) {
    const t = startOffset + step * i;
    const framePath = path.join(tmpDir, `frame-${String(i).padStart(3, "0")}.jpg`);
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-ss", String(t.toFixed(2)),
        "-i", videoPath,
        "-frames:v", "1",
        "-vf", "scale=640:-2", // resize to 640px wide for faster analysis
        "-q:v", "3",
        framePath,
      ]);
      // Verify the frame was created
      const stat = await fs.stat(framePath);
      if (stat.size > 0) {
        frames.push({ path: framePath, timestampSec: t });
      }
    } catch (e) {
      console.warn(`[ffmpeg] frame ${i} at ${t}s failed:`, e);
    }
  }

  if (frames.length === 0) {
    throw new Error(
      "Frame extraction failed. The video format may not be supported by ffmpeg, or the file is corrupted."
    );
  }

  return frames;
}

/**
 * Save a base64-encoded video (or data URL) to a temporary file.
 * Returns the file path.
 */
export async function saveVideoToFile(
  base64OrDataUrl: string
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  let base64 = base64OrDataUrl;
  let ext = "mp4";

  const match = base64OrDataUrl.match(/^data:video\/([^;]+);base64,(.+)$/i);
  if (match) {
    const fmt = match[1].toLowerCase();
    base64 = match[2];
    // Map MIME subtypes to file extensions
    const extMap: Record<string, string> = {
      mp4: "mp4",
      "x-matroska": "mkv",
      matroska: "mkv",
      webm: "webm",
      "x-msvideo": "avi",
      mpeg: "mpg",
      "x-flv": "flv",
      "x-ms-wmv": "wmv",
      quicktime: "mov",
      "3gpp": "3gp",
    };
    ext = extMap[fmt] || "mp4";
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sky-video-"));
  const filePath = path.join(tmpDir, `input.${ext}`);
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));

  return {
    path: filePath,
    cleanup: async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Convert a frame file (JPEG on disk) to a data URL for the vision API.
 */
async function frameToDataUrl(framePath: string): Promise<string> {
  const buf = await fs.readFile(framePath);
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

/**
 * Extract frames from a video and analyze each one, then combine.
 * Used as a fallback when Gemini inline video analysis fails.
 */
export async function analyzeVideoByFrames(
  videoDataUrl: string,
  prompt: string,
  frameCount = 5
): Promise<CombinedVideoAnalysis> {
  // Save the video to a temp file
  const { path: videoPath, cleanup: cleanupVideo } = await saveVideoToFile(
    videoDataUrl
  );

  let frames: Array<{ path: string; timestampSec: number }> = [];
  let frameCleanup: (() => Promise<void>) | null = null;

  try {
    // Extract key frames
    frames = await extractKeyFrames(videoPath, frameCount);
    const frameDir = path.dirname(frames[0].path);
    frameCleanup = async () => {
      try {
        await fs.rm(frameDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    };

    // Analyze each frame
    const frameAnalyses: FrameAnalysis[] = [];
    const lastProvider = "Frame-extraction + image analysis fallback";

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      try {
        const dataUrl = await frameToDataUrl(f.path);
        const { response, provider } = await analyzeImageWithProviders(
          dataUrl,
          `${prompt}\n\n[Context: This is frame ${i + 1} of ${frames.length}, captured at timestamp ${f.timestampSec.toFixed(2)}s of the video.]`
        );
        frameAnalyses.push({
          frameIndex: i,
          timestampSec: f.timestampSec,
          response,
          provider,
        });
      } catch (e) {
        console.warn(`[frame-analysis] frame ${i} failed:`, e);
      }
    }

    if (frameAnalyses.length === 0) {
      throw new Error(
        "All frame analyses failed. Check that GEMINI_API_KEY or OPENAI_API_KEY is set in .env"
      );
    }

    // Combine the per-frame analyses into a single video analysis
    const combinedRaw = combineFrameAnalyses(frameAnalyses);

    return {
      rawResponse: combinedRaw,
      provider: lastProvider,
      frameCount: frameAnalyses.length,
      frameAnalyses,
    };
  } finally {
    // Cleanup temp files
    await cleanupVideo();
    if (frameCleanup) await frameCleanup();
  }
}

/**
 * Combine per-frame JSON responses into a single JSON response.
 * Strategy: pick the highest-risk frame's classification as the primary,
 * but include a summary noting it was derived from frame analysis.
 */
function combineFrameAnalyses(frames: FrameAnalysis[]): string {
  const parsed = frames.map((f) => {
    let s = f.response.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    try {
      return JSON.parse(s);
    } catch {
      return {
        categories: [],
        riskLevel: "low",
        confidence: 0.1,
        explanation: `(frame ${f.frameIndex + 1} at ${f.timestampSec.toFixed(2)}s) unparseable`,
      };
    }
  });

  // Pick the highest-risk frame
  const riskOrder: Record<string, number> = {
    low: 0,
    moderate: 1,
    high: 2,
    critical: 3,
  };
  let best = parsed[0];
  let bestRisk = riskOrder[best?.riskLevel ?? "low"] ?? 0;
  for (const p of parsed) {
    const r = riskOrder[p?.riskLevel ?? "low"] ?? 0;
    if (r > bestRisk) {
      best = p;
      bestRisk = r;
    }
  }

  // Combine categories (union)
  const allCategories = new Set<string>();
  for (const p of parsed) {
    for (const c of p?.categories ?? []) allCategories.add(String(c).toLowerCase());
  }

  // Merge confidences (take the max)
  let maxConf = 0;
  for (const p of parsed) {
    if (typeof p?.confidence === "number" && p.confidence > maxConf) {
      maxConf = p.confidence;
    }
  }

  const combined = {
    categories: Array.from(allCategories),
    riskLevel: best?.riskLevel ?? "low",
    confidence: maxConf,
    explanation:
      `[Derived from ${frames.length} key frames extracted via ffmpeg, analyzed individually by ${frames[0].provider}.] ` +
      (best?.explanation ?? "No structured explanation from any frame."),
    _frameBreakdown: frames.map((f, i) => ({
      frame: i + 1,
      timestampSec: f.timestampSec,
      summary: (parsed[i]?.explanation ?? "").slice(0, 120),
    })),
  };

  return JSON.stringify(combined);
}
