"use client";
/** Simple in-memory router for the single-page SKY app.
 *  No Next.js routing — just a section state shared via context. */
import { createContext, useContext, useState, type ReactNode } from "react";
import type { SectionKey } from "./sidebar";

const Ctx = createContext<{
  active: SectionKey;
  go: (s: SectionKey) => void;
  pendingCount: number;
  setPendingCount: (n: number) => void;
}>({
  active: "dashboard",
  go: () => {},
  pendingCount: 0,
  setPendingCount: () => {},
});

export function RouterProvider({
  children,
  initialPendingCount = 0,
}: {
  children: ReactNode;
  initialPendingCount?: number;
}) {
  const [active, setActive] = useState<SectionKey>("dashboard");
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  return (
    <Ctx.Provider
      value={{ active, go: setActive, pendingCount, setPendingCount }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRouter() {
  return useContext(Ctx);
}
