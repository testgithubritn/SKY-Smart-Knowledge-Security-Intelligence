/**
 * MongoDB connection singleton (MERN-compliant — NO Prisma, NO Docker).
 * Uses `mongodb-memory-server` to run a real MongoDB instance in-memory.
 *
 * This is a TRUE MongoDB: Mongoose queries, aggregation pipelines,
 * indexes, transactions — everything works. Data is cleared on restart,
 * which is fine for a security-ops demo / sandbox.
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | null = null;
let connecting: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      console.log("[mongo] memory-server URI:", uri);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
      });
      console.log("[mongo] connected. MERN stack is live (no Prisma, no Docker).");
      // Seed initial knowledge base on first connect
      const { seedIfEmpty } = await import("@/lib/seed");
      await seedIfEmpty();
      return mongoose;
    } catch (err) {
      console.error("[mongo] connection failed:", err);
      connecting = null;
      throw err;
    }
  })();

  return connecting;
}

export async function disconnectDB(): Promise<void> {
  if (connecting) await connecting;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}
