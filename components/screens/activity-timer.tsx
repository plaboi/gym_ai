"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { completeActivity } from "@/lib/actions";

const SESSION_KEY = "gym-ai-activity-timer";

type TimerStatus = "idle" | "running" | "stopped";

interface PersistedTimer {
  status: TimerStatus;
  accumulatedMs: number;
  runningSince: number | null;
}

function loadTimer(): PersistedTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedTimer;
  } catch {
    return null;
  }
}

function saveTimer(t: PersistedTimer) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(t));
  } catch {
    // Ignore
  }
}

function clearTimer() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface ActivityTimerProps {
  categoryName: string;
  categoryLabel: string;
  onComplete: (elapsedSeconds: number) => void;
}

export default function ActivityTimer({
  categoryName,
  categoryLabel,
  onComplete,
}: ActivityTimerProps) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = loadTimer();
    if (saved) {
      setStatus(saved.status);
      setAccumulatedMs(saved.accumulatedMs);
      setRunningSince(saved.runningSince);
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveTimer({ status, accumulatedMs, runningSince });
  }, [status, accumulatedMs, runningSince]);

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [status]);

  const liveMs =
    status === "running" && runningSince !== null
      ? accumulatedMs + (Date.now() - runningSince)
      : accumulatedMs;

  const handleStart = () => {
    setRunningSince(Date.now());
    setStatus("running");
  };

  const handleStop = () => {
    if (runningSince !== null) {
      setAccumulatedMs((prev) => prev + (Date.now() - runningSince));
    }
    setRunningSince(null);
    setStatus("stopped");
  };

  const handleResume = () => {
    setRunningSince(Date.now());
    setStatus("running");
  };

  const handleSave = () => {
    const totalSeconds = Math.max(1, Math.round(liveMs / 1000));
    setError(null);
    startTransition(async () => {
      try {
        await completeActivity(categoryName, totalSeconds);
        clearTimer();
        onComplete(totalSeconds);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save activity");
      }
    });
  };

  const handleDiscard = () => {
    clearTimer();
    setAccumulatedMs(0);
    setRunningSince(null);
    setStatus("idle");
  };

  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-between bg-black px-8 py-10"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.div
        className="flex flex-col items-center gap-2 pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-sm tracking-wide text-muted">Activity</p>
        <h2 className="text-2xl font-bold text-white">{categoryLabel}</h2>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 160 }}
      >
        <span className="font-mono text-6xl tabular-nums text-white sm:text-7xl">
          {formatTime(liveMs)}
        </span>
        <span className="text-xs uppercase tracking-widest text-white/40">
          {status === "running"
            ? "Running"
            : status === "stopped"
              ? "Paused"
              : "Ready"}
        </span>
      </motion.div>

      <div className="flex w-full flex-col gap-3">
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.button
              key="start"
              onClick={handleStart}
              className="w-full rounded-2xl bg-white py-5 text-lg font-semibold text-black"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileTap={{ scale: 0.97 }}
            >
              Start
            </motion.button>
          )}

          {status === "running" && (
            <motion.button
              key="stop"
              onClick={handleStop}
              className="w-full rounded-2xl bg-red-500 py-5 text-lg font-semibold text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileTap={{ scale: 0.97 }}
            >
              Stop
            </motion.button>
          )}

          {status === "stopped" && (
            <motion.div
              key="stopped"
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="w-full rounded-2xl bg-white py-4 text-base font-semibold text-black disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save & Finish"}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={isPending}
                  className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-medium text-white/80 hover:bg-white/5 disabled:opacity-50"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isPending}
                  className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-medium text-white/50 hover:bg-white/5 disabled:opacity-50"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-center text-xs text-red-400">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
