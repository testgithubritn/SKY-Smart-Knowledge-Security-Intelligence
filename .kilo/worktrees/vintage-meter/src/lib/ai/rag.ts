/**
 * RAG retrieval layer.
 *
 * Given an analysis context (modality, detected categories, transcript, etc.),
 * pull the most relevant entries from the Knowledge collection.
 *
 * This is a lightweight BM25-like retrieval over keywords + text index.
 * No external vector DB — keeps the stack MERN-pure.
 */
import type mongoose from "mongoose";
import { Knowledge, type KnowledgeCategory } from "@/lib/models/knowledge";

export interface RagQuery {
  modality: "image" | "video" | "audio";
  categories: string[];
  transcript?: string;
  explanation?: string;
  topK?: number;
}

export interface RagEvidence {
  sourceId: string;
  title: string;
  snippet: string;
  relevance: number;
  source: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function relevanceScore(
  entry: {
    _id: mongoose.Types.ObjectId | string;
    title: string;
    content: string;
    keywords?: string[];
    category: string;
    modality: string;
    severityHint?: string;
    source?: string;
  },
  query: RagQuery
): number {
  let score = 0;
  const haystack = [
    entry.title,
    entry.content,
    ...(entry.keywords ?? []),
  ].join(" ");
  const tokens = tokenize(haystack);
  const tokenSet = new Set(tokens);

  // Category match (weighted heavily)
  if (query.categories.includes(entry.category)) {
    score += 5;
  }

  // Modality match (modest weight)
  if (entry.modality === "any" || entry.modality === query.modality) {
    score += 1;
  }

  // Transcript / explanation keyword overlap
  const textSources = [query.transcript, query.explanation]
    .filter(Boolean)
    .join(" ");
  if (textSources) {
    const queryTokens = tokenize(textSources);
    let overlap = 0;
    for (const qt of queryTokens) {
      if (tokenSet.has(qt)) overlap++;
    }
    score += Math.min(overlap * 0.3, 4);
  }

  // Severity boost
  const sevBoost: Record<string, number> = {
    low: 0.1,
    moderate: 0.3,
    high: 0.6,
    critical: 0.9,
  };
  score += sevBoost[entry.severityHint ?? "moderate"] ?? 0.3;

  return score;
}

export async function retrieveEvidence(query: RagQuery): Promise<RagEvidence[]> {
  await import("@/lib/mongo").then(({ connectDB }) => connectDB());

  // Pull all published knowledge (small corpus). Real-world: BM25 + vector store.
  const all = await Knowledge.find({ isPublished: true }).lean();

  const scored = all
    .map((entry) => ({
      entry,
      score: relevanceScore(entry as unknown as RagEvidence & { keywords?: string[]; category: string; modality: string; severityHint?: string }, query),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, query.topK ?? 4);

  const totalScore = scored.reduce((s, x) => s + x.score, 0) || 1;

  return scored.map(({ entry, score }) => ({
    sourceId: String(entry._id),
    title: entry.title,
    snippet:
      entry.content.length > 280
        ? entry.content.slice(0, 280) + "…"
        : entry.content,
    relevance: Math.round((score / totalScore) * 100) / 100,
    source: entry.source ?? "trusted",
  }));
}

/**
 * Map a free-form AI-detected category string to our KnowledgeCategory enum.
 * Falls back to "other" if no match.
 */
export function mapCategory(label: string): KnowledgeCategory {
  const l = label.toLowerCase();
  const map: Record<string, KnowledgeCategory> = {
    fraud: "fraud",
    "payment-fraud": "fraud",
    scam: "scam",
    "phone-scam": "scam",
    violence: "violence",
    assault: "violence",
    "physical-violence": "violence",
    brawl: "violence",
    theft: "theft",
    "snatch-theft": "theft",
    shoplifting: "theft",
    "unauthorized-entry": "unauthorized-entry",
    intrusion: "unauthorized-entry",
    trespassing: "unauthorized-entry",
    fire: "fire",
    "active-fire": "fire",
    smoke: "fire",
    accident: "accident",
    collision: "accident",
    "road-accident": "accident",
    impersonation: "impersonation",
    "voice-impersonation": "impersonation",
    "deepfake-video": "manipulated-media",
    "voice-clone": "manipulated-media",
    "ai-generated": "manipulated-media",
    "manipulated-media": "manipulated-media",
    regulation: "regulation",
    advisory: "regulation",
  };
  return map[l] ?? "other";
}
