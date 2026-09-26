"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Sidebar, type SectionKey } from "@/components/sky/sidebar";
import { RouterProvider, useRouter } from "@/components/sky/router";
import { Dashboard } from "@/components/sky/dashboard";
import { ImageAnalyzer } from "@/components/sky/image-analyzer";
import { VideoAnalyzer } from "@/components/sky/video-analyzer";
import { AudioAnalyzer } from "@/components/sky/audio-analyzer";
import { Incidents } from "@/components/sky/incidents";
import { ReviewQueue } from "@/components/sky/review-queue";
import { KnowledgeBase } from "@/components/sky/knowledge-base";
import { Reports } from "@/components/sky/reports";
import { AuthScreen } from "@/components/sky/auth-screen";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

function renderSection(active: SectionKey) {
  switch (active) {
    case "dashboard":
      return <Dashboard />;
    case "analyze-image":
      return <ImageAnalyzer />;
    case "analyze-video":
      return <VideoAnalyzer />;
    case "analyze-audio":
      return <AudioAnalyzer />;
    case "incidents":
      return <Incidents />;
    case "review":
      return <ReviewQueue />;
    case "knowledge":
      return <KnowledgeBase />;
    case "reports":
      return <Reports />;
  }
}

export default function Home() {
  return (
    <RouterProvider>
      <AuthGate />
    </RouterProvider>
  );
}

function AuthGate() {
  const { data: session, status } = useSession();

  // Loading state — show elegant splash while we check session
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/50"
          >
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </motion.div>
          <div className="text-sm text-indigo-300">Loading SKY…</div>
        </motion.div>
      </div>
    );
  }

  // Not authenticated — show auth screen
  if (!session) {
    return <AuthScreen />;
  }

  // Authenticated — show full app
  return <Shell />;
}

function Shell() {
  const { active, go, pendingCount, setPendingCount } = useRouter();
  const { data: session } = useSession();

  // Re-fetch the pending-review count whenever the active section changes,
  // so the sidebar badge stays current.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/sky/stats");
        if (!res.ok) return;
        const json = await res.json();
        if (alive && typeof json.totals?.pending === "number") {
          setPendingCount(json.totals.pending);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [active, setPendingCount]);

  const user = session?.user as
    | { name?: string; email?: string; role?: string; department?: string; avatarColor?: string }
    | undefined;
  const initials = (user?.name ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* === Animated gradient mesh background === */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950" />
        {/* Floating animated orbs */}
        <motion.div
          className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-indigo-600/15 blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, 80, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/4 -right-32 h-[32rem] w-[32rem] rounded-full bg-purple-600/15 blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, 100, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 left-1/3 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/10 blur-3xl"
          animate={{ x: [0, 70, 0], y: [0, -90, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* === Main layout: sidebar + content === */}
      <div className="relative flex min-h-screen w-full">
        <div className="md:h-screen md:sticky md:top-0 md:flex md:flex-col">
          {/* Sidebar with glassmorphism */}
          <div className="md:h-screen md:flex md:flex-col md:backdrop-blur-xl md:bg-slate-950/40 md:border-r md:border-white/10">
            <Sidebar
              active={active}
              pendingCount={pendingCount}
              onSelect={go}
            />
            {/* User profile + logout footer */}
            <div className="border-t border-white/10 p-3 mt-auto">
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${
                    user?.avatarColor || "from-indigo-500 to-purple-600"
                  } text-white text-xs font-bold shadow-md`}
                >
                  {initials || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-white">
                    {user?.name || "User"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {user?.role || "analyst"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="h-8 w-8 p-0 hover:bg-rose-500/20 hover:text-rose-300"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area with animated section transitions */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {renderSection(active)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
