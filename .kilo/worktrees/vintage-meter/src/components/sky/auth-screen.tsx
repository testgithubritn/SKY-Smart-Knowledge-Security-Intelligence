"use client";
/**
 * SKY Auth Screen — highly attractive login/signup with:
 *  - Animated gradient background (slate-950 → indigo-950 → purple-950)
 *  - Glassmorphism card (backdrop-blur, border-white/10)
 *  - Framer Motion entrance animations
 *  - Demo credentials quick-fill buttons
 *  - Toggle between login / signup modes
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Building2,
  Zap,
  Brain,
  Camera,
  Video,
  Mic,
} from "lucide-react";
import { toast } from "sonner";

const DEMO_CREDS = [
  {
    label: "Admin",
    email: "admin@sky.ts",
    password: "admin123",
    color: "from-indigo-500 to-purple-600",
    name: "Arjun Reddy",
  },
  {
    label: "Analyst",
    email: "analyst@sky.ts",
    password: "analyst123",
    color: "from-rose-500 to-pink-600",
    name: "Priya Naidu",
  },
  {
    label: "Operator",
    email: "operator@sky.ts",
    password: "operator123",
    color: "from-emerald-500 to-teal-600",
    name: "Karthik Chary",
  },
];

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res?.ok) {
        throw new Error(
          res?.error === "CredentialsSignin"
            ? "Invalid email or password."
            : res?.error || "Login failed. Please try again."
        );
      }
      toast.success("Welcome back to SKY", {
        description: "Authentication successful. Loading dashboard…",
      });
      // Force a full reload so the SessionProvider picks up the new session
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          department: department || "Security Operations",
          role: "analyst",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Signup failed");
      }
      // Auto-login after signup
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!loginRes?.ok) {
        // If auto-login fails, switch to login mode
        setMode("login");
        toast.success("Account created! Please sign in.");
      } else {
        toast.success("Account created!", {
          description: "Welcome to SKY. Loading dashboard…",
        });
        setTimeout(() => window.location.reload(), 600);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      toast.error("Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(email: string, password: string) {
    setEmail(email);
    setPassword(password);
    setError(null);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950" />
        {/* Floating orbs */}
        <motion.div
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{
            x: [0, 80, 0],
            y: [0, 60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl"
          animate={{
            x: [0, -60, 0],
            y: [0, 80, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -70, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Main split layout */}
      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* LEFT: Hero / Branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10"
        >
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, type: "spring", bounce: 0.5 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/50"
            >
              <ShieldCheck className="h-7 w-7 text-white" />
            </motion.div>
            <div>
              <div className="text-xl font-bold tracking-tight">SKY</div>
              <div className="text-[11px] uppercase tracking-wider text-indigo-300">
                Smart Knowledge & Security Intelligence
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-4xl xl:text-5xl font-bold leading-tight bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent"
            >
              Multimodal AI for crime, fraud &amp; scam detection.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-indigo-200/80 text-base leading-relaxed"
            >
              SKY analyzes images, videos, and voice/audio to detect
              violence, theft, payment fraud, scams, impersonation, and
              manipulated media — backed by RAG retrieval from trusted
              sources, with full human-in-the-loop review.
            </motion.p>

            {/* Feature chips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="grid grid-cols-2 gap-3 pt-2"
            >
              {[
                { icon: Camera, label: "Image VLM" },
                { icon: Video, label: "Video Forensics" },
                { icon: Mic, label: "ASR + LLM" },
                { icon: Brain, label: "RAG Evidence" },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm"
                >
                  <f.icon className="h-4 w-4 text-indigo-300" />
                  <span className="text-xs text-white/80">{f.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center gap-2 text-xs text-indigo-300/60"
          >
            <Sparkles className="h-3 w-3" />
            <span>
              Multimodal AI · Telangana-aware · AI-assisted decision support
            </span>
          </motion.div>
        </motion.div>

        {/* RIGHT: Auth card */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            {/* Mobile branding */}
            <div className="lg:hidden mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/50">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold">SKY</div>
                <div className="text-[10px] uppercase tracking-wider text-indigo-300">
                  Security Intelligence
                </div>
              </div>
            </div>

            {/* Glassmorphism card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Mode toggle */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                    mode === "login"
                      ? "bg-white/10 text-white border-b-2 border-indigo-400"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                    mode === "signup"
                      ? "bg-white/10 text-white border-b-2 border-fuchsia-400"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div className="p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="text-2xl font-bold mb-1">
                      {mode === "login" ? "Welcome back" : "Get started"}
                    </h2>
                    <p className="text-sm text-white/60 mb-6">
                      {mode === "login"
                        ? "Sign in to your SKY security operations account."
                        : "Create a new analyst account for SKY platform."}
                    </p>

                    <form
                      onSubmit={mode === "login" ? handleLogin : handleSignup}
                      className="space-y-4"
                    >
                      {mode === "signup" && (
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="name"
                            className="text-xs text-white/70"
                          >
                            Full name
                          </Label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <Input
                              id="name"
                              type="text"
                              placeholder="Arjun Reddy"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 focus:border-indigo-400 focus:bg-white/10"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs text-white/70">
                          Email address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you.sky@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 focus:border-indigo-400 focus:bg-white/10"
                          />
                        </div>
                      </div>

                      {mode === "signup" && (
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="department"
                            className="text-xs text-white/70"
                          >
                            Department (optional)
                          </Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <Input
                              id="department"
                              type="text"
                              placeholder="Security Operations — Cyberabad"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 focus:border-indigo-400 focus:bg-white/10"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="password"
                          className="text-xs text-white/70"
                        >
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <Input
                            id="password"
                            type={showPwd ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={
                              mode === "login"
                                ? "current-password"
                                : "new-password"
                            }
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 pr-10 focus:border-indigo-400 focus:bg-white/10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                          >
                            {showPwd ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {mode === "signup" && (
                          <p className="text-[11px] text-white/40 pl-1">
                            Min 6 characters
                          </p>
                        )}
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"
                        >
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 hover:-translate-y-0.5"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {mode === "login" ? "Signing in…" : "Creating account…"}
                          </>
                        ) : (
                          <>
                            {mode === "login" ? (
                              <>
                                <Zap className="h-4 w-4" />
                                Sign In
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Create Account
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    </form>

                    {mode === "login" && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-[11px] text-white/50 mb-3 uppercase tracking-wider">
                          Quick demo login
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {DEMO_CREDS.map((c) => (
                            <button
                              key={c.label}
                              type="button"
                              onClick={() => quickFill(c.email, c.password)}
                              className="group rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-center transition-all hover:-translate-y-0.5"
                            >
                              <div
                                className={`mx-auto mb-1 h-7 w-7 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-xs font-bold`}
                              >
                                {c.name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div className="text-[11px] font-medium text-white/80">
                                {c.label}
                              </div>
                              <div className="text-[9px] text-white/40">
                                {c.email.split("@")[0]}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] text-white/40">
              🔒 SKY is an AI-assisted decision-support platform. All findings
              are advisory and require human review.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
