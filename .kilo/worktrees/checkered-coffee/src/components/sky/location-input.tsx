"use client";
/**
 * LocationInput — text input with autocomplete dropdown showing related
 * Telangana locations as the user types.
 *
 * - Fetches all known locations from /api/sky/locations on mount
 * - Shows up to 8 matching suggestions in a dropdown below the input
 * - Click on a suggestion to fill the input
 * - Keyboard support: arrow down/up to navigate, Enter to select, Esc to close
 * - Click outside to close the dropdown
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LocationInputProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
}

export function LocationInput({
  id = "location",
  value,
  onChange,
  placeholder = "Type the location (e.g. Banjara Hills, Hyderabad)",
  required = false,
  label = "Location",
}: LocationInputProps) {
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all known locations on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/sky/locations");
        if (!res.ok) return;
        const json = await res.json();
        if (alive && Array.isArray(json.locations)) {
          setLocations(json.locations);
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Filter suggestions — case-insensitive, contains-match, exclude exact current value
  const suggestions = useMemo(() => {
    const v = value.trim().toLowerCase();
    if (!v) return locations.slice(0, 8);
    return locations
      .filter((loc) => loc.toLowerCase().includes(v) && loc.toLowerCase() !== v)
      .slice(0, 8);
  }, [value, locations]);

  function pick(loc: string) {
    onChange(loc);
    setOpen(false);
    setHighlightedIdx(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightedIdx((i) =>
        Math.min(i + 1, suggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIdx >= 0 && open) {
      e.preventDefault();
      const s = suggestions[highlightedIdx];
      if (s) pick(s);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIdx(-1);
    }
  }

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <Label htmlFor={id} className="text-xs">
        {label}{" "}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlightedIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="pl-9 pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-64 overflow-y-auto"
          >
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              {suggestions.length} related location
              {suggestions.length === 1 ? "" : "s"}
            </div>
            <ul className="py-1">
              {suggestions.map((loc, idx) => (
                <li key={loc}>
                  <button
                    type="button"
                    onClick={() => pick(loc)}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 transition-colors ${
                      idx === highlightedIdx
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{loc}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
