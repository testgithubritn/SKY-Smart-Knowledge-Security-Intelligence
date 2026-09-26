/**
 * User model — Mongoose schema for SKY platform users.
 * Stores email, name, passwordHash (bcrypt), role, lastLoginAt, etc.
 *
 * NO Prisma. Pure Mongoose, persists to the same MongoDB (in-memory)
 * as the rest of SKY. The seed script creates a demo user on first run.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "analyst", "operator", "viewer"],
      default: "analyst",
      index: true,
    },
    department: { type: String, default: "Security Operations" },
    avatarColor: { type: String, default: "" }, // gradient color hint for avatar
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
    preferences: {
      theme: { type: String, enum: ["dark", "light", "system"], default: "dark" },
      notifications: { type: Boolean, default: true },
      autoRefresh: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);
