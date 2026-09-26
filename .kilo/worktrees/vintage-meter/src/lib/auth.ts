/**
 * NextAuth configuration — Credentials provider with bcrypt verification
 * against the Mongoose User collection.
 *
 * Pure MERN: NO Prisma, NO external auth service. Passwords are hashed
 * with bcrypt (10 rounds) at signup time and verified at login.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { User } from "@/lib/models/user";
import { connectDB } from "@/lib/mongo";

const AVATAR_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you.sky@gmail.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        await connectDB();
        const user = await User.findOne({
          email: credentials.email.toLowerCase().trim(),
        });
        if (!user || !user.isActive) {
          return null;
        }
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) {
          return null;
        }
        // Update last login
        await User.findByIdAndUpdate(user._id, {
          $set: { lastLoginAt: new Date() },
          $inc: { loginCount: 1 },
        });
        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          avatarColor: user.avatarColor || AVATAR_COLORS[0],
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: { signIn: "/" }, // SPA-style: render auth screen on `/`
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "analyst";
        token.department = (user as { department?: string }).department ?? "";
        token.avatarColor =
          (user as { avatarColor?: string }).avatarColor ?? AVATAR_COLORS[0];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { department?: string }).department = token.department as string;
        (session.user as { avatarColor?: string }).avatarColor = token.avatarColor as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "sky-dev-secret-change-in-production-9f8e7d6c5b4a",
};

export { AVATAR_COLORS };
