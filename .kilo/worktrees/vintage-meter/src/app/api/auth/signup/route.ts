/** POST /api/auth/signup
 * Accepts: { email, password, name, role?, department? }
 * Hashes password with bcrypt (10 rounds), creates a User record.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongo";
import { User } from "@/lib/models/user";
import { AVATAR_COLORS } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
    if (!body.email.includes("@") || body.email.length < 5) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter your name (min 2 characters)." },
        { status: 400 }
      );
    }

    await connectDB();
    const email = body.email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const role = ["admin", "analyst", "operator", "viewer"].includes(body.role)
      ? body.role
      : "analyst";

    const avatarColor = AVATAR_COLORS[
      Math.floor(Math.random() * AVATAR_COLORS.length)
    ];

    const user = await User.create({
      email,
      name: body.name.trim(),
      passwordHash,
      role,
      department: body.department || "Security Operations",
      avatarColor,
      isActive: true,
      lastLoginAt: null,
      loginCount: 0,
      preferences: { theme: "dark", notifications: true, autoRefresh: true },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        avatarColor: user.avatarColor,
      },
    });
  } catch (err) {
    console.error("[api/auth/signup] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
