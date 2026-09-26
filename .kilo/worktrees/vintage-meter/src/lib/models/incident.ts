/**
 * Incident model — the central artifact in SKY.
 * Each analysis (image / video / audio) creates one incident with:
 *  - modality (image | video | audio)
 *  - raw input reference (data URL, transcript, etc.)
 *  - AI detection result (categories, risk level, explanation)
 *  - RAG-retrieved evidence
 *  - human review status (pending | approved | rejected | escalated)
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type Modality = "image" | "video" | "audio";
export type ReviewStatus = "pending" | "approved" | "rejected" | "escalated";

const EvidenceSchema = new Schema(
  {
    sourceId: { type: String, required: true },
    title: { type: String, required: true },
    snippet: { type: String, required: true },
    relevance: { type: Number, default: 0 },
    source: { type: String, default: "trusted" },
  },
  { _id: false }
);

const SubjectRefSchema = new Schema(
  {
    subjectId: { type: String, required: true },
    claimedName: { type: String, required: true },
    role: { type: String, default: "" }, // role played in THIS incident
    isImpersonated: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const HistoricalContextSchema = new Schema(
  {
    locationHistory: { type: [Schema.Types.Mixed], default: [] }, // previous incidents at same location
    personsOfInterest: { type: [Schema.Types.Mixed], default: [] }, // subjects from prior incidents
    locationStats: {
      totalIncidents: { type: Number, default: 0 },
      byRisk: { type: Schema.Types.Mixed, default: {} },
      byCategory: { type: Schema.Types.Mixed, default: {} },
      lastIncidentDate: { type: Date, default: null },
    },
    repeatOffenders: { type: [Schema.Types.Mixed], default: [] }, // subjects appearing in 2+ incidents
  },
  { _id: false }
);

const IncidentSchema = new Schema(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    modality: {
      type: String,
      enum: ["image", "video", "audio"] as Modality[],
      required: true,
      index: true,
    },
    source: { type: String, default: "manual-upload" },
    location: { type: String, default: "unknown" },
    inputRef: { type: String, required: true },
    previewRef: { type: String, default: "" },
    detectedCategories: { type: [String], default: [] },
    riskLevel: {
      type: String,
      enum: ["low", "moderate", "high", "critical"] as RiskLevel[],
      required: true,
      index: true,
    },
    confidence: { type: Number, default: 0 },
    explanation: { type: String, default: "" },
    transcript: { type: String, default: "" },
    evidence: { type: [EvidenceSchema], default: [] },
    subjects: { type: [SubjectRefSchema], default: [] }, // NEW: named persons in this incident
    historicalContext: { type: HistoricalContextSchema, default: null }, // NEW: prior context snapshot
    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "escalated"] as ReviewStatus[],
      default: "pending",
      index: true,
    },
    reviewer: { type: String, default: "" },
    reviewerNote: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    alerts: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      webhook: { type: Boolean, default: false },
    },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export type IncidentDoc = InferSchemaType<typeof IncidentSchema> & {
  _id: mongoose.Types.ObjectId;
};

IncidentSchema.index({ reviewStatus: 1, riskLevel: 1, createdAt: -1 });

export const Incident: Model<IncidentDoc> =
  (mongoose.models.Incident as Model<IncidentDoc>) ||
  mongoose.model<IncidentDoc>("Incident", IncidentSchema);
