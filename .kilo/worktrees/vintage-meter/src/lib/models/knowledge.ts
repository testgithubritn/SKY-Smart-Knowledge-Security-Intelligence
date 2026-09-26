/**
 * Knowledge source model — the "RAG corpus" for SKY.
 * Each entry is a trusted document (FBI fraud handbook section, scam pattern,
 * CCTV incident play-by-play, regulatory rule, etc.) used as retrieval context.
 *
 * Retrieval is keyword + category weighted (no external vector DB needed).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type KnowledgeCategory =
  | "fraud"
  | "scam"
  | "violence"
  | "theft"
  | "unauthorized-entry"
  | "fire"
  | "accident"
  | "impersonation"
  | "manipulated-media"
  | "regulation"
  | "other";

const KnowledgeSchema = new Schema(
  {
    title: { type: String, required: true, index: "text" },
    category: {
      type: String,
      enum: [
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
      ] as KnowledgeCategory[],
      required: true,
      index: true,
    },
    modality: {
      type: String,
      enum: ["image", "video", "audio", "any"],
      default: "any",
      index: true,
    },
    content: { type: String, required: true, index: "text" },
    keywords: { type: [String], default: [] },
    source: { type: String, default: "trusted" },
    severityHint: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      default: "moderate",
    },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export type KnowledgeDoc = InferSchemaType<typeof KnowledgeSchema> & {
  _id: mongoose.Types.ObjectId;
};

KnowledgeSchema.index({ title: "text", content: "text", keywords: "text" });

export const Knowledge: Model<KnowledgeDoc> =
  (mongoose.models.Knowledge as Model<KnowledgeDoc>) ||
  mongoose.model<KnowledgeDoc>("Knowledge", KnowledgeSchema);
