/**
 * Subject model — named persons of interest tracked across incidents.
 *
 * A Subject represents any individual identified by name (real or claimed)
 * in one or more SKY incidents. Scammers impersonating officials get a
 * Subject entry with isImpersonated=true. Repeat offenders link multiple
 * incidents together.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SubjectAppearanceSchema = new Schema(
  {
    caseId: { type: String, required: true },
    incidentId: { type: String, required: false, default: "" }, // ObjectId as string OR "seed" placeholder
    role: { type: String, required: true }, // "claimed-cybercrime-officer", "victim-impersonator", etc.
    isImpersonated: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    seenAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SubjectSchema = new Schema(
  {
    subjectId: { type: String, required: true, unique: true, index: true },
    claimedName: { type: String, required: true, index: "text" }, // e.g. "Officer Sharma"
    realName: { type: String, default: "" }, // if known (rare)
    aliases: { type: [String], default: [] },
    rolesClaimed: { type: [String], default: [] }, // "cybercrime-officer", "amazon-support", etc.
    isImpersonated: { type: Boolean, default: false },
    isRepeatOffender: { type: Boolean, default: false },
    phoneNumbers: { type: [String], default: [] },
    vehiclePlates: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    modalities: { type: [String], default: [] }, // audio, image, video
    categories: { type: [String], default: [] }, // fraud, scam, etc.
    firstSeenCaseId: { type: String, default: "" },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenCaseId: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    totalIncidents: { type: Number, default: 0 },
    riskProfile: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      default: "moderate",
    },
    status: {
      type: String,
      enum: ["active", "watchlist", "closed"],
      default: "active",
      index: true,
    },
    appearances: { type: [SubjectAppearanceSchema], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

SubjectSchema.index({ claimedName: "text", aliases: "text" });
SubjectSchema.index({ locations: 1 });
SubjectSchema.index({ phoneNumbers: 1 });

export type SubjectDoc = InferSchemaType<typeof SubjectSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Subject: Model<SubjectDoc> =
  (mongoose.models.Subject as Model<SubjectDoc>) ||
  mongoose.model<SubjectDoc>("Subject", SubjectSchema);
