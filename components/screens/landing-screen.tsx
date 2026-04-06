"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton } from "@clerk/nextjs";
import { saveUserPreferences, saveName } from "@/lib/actions";
import { useTimer } from "../hooks/use-timer";
import type { WorkoutHistoryEntry } from "../app-shell";

interface LandingScreenProps {
  lastWorkoutAt: string | null;
  initialPreferences: string;
  workoutHistory: WorkoutHistoryEntry[];
  userName: string | null;
  onStart: () => void;
}

const SPLIT_LABELS: Record<string, string> = {
  legs_arms: "Legs + Arms",
  chest_tri: "Chest + Tri",
  back_bi: "Back + Bi",
};

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function TimeSinceCounter({ iso }: { iso: string }) {
  const startTime = new Date(iso).getTime();
  const { long } = useTimer(startTime);

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <span className="font-mono text-lg tabular-nums text-white/50">
        {long}
      </span>
      <span className="text-xs text-white/25">since last workout</span>
    </motion.div>
  );
}

function WorkoutCard({ entry }: { entry: WorkoutHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-left"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">
            {SPLIT_LABELS[entry.splitType] ?? entry.splitType}
          </p>
          <p className="text-xs text-white/40">
            {entry.exerciseCount} exercises &middot; {entry.durationMinutes} min
          </p>
        </div>
        <motion.span
          className="text-[10px] text-white/30"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          &#x25BC;
        </motion.span>
      </div>
      <AnimatePresence>
        {expanded && entry.exercises.length > 0 && (
          <motion.div
            className="mt-2 flex flex-col gap-1 border-t border-white/5 pt-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {entry.exercises.map((ex, j) => (
              <div key={j} className="flex items-baseline justify-between">
                <span className="text-xs text-white/60">{ex.name}</span>
                <span className="ml-2 shrink-0 text-[10px] text-white/30">
                  {ex.sets}x{ex.reps}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function CalendarView({
  workoutHistory,
}: {
  workoutHistory: WorkoutHistoryEntry[];
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const workoutMap = useMemo(() => {
    const map = new Map<string, WorkoutHistoryEntry[]>();
    for (const entry of workoutHistory) {
      const existing = map.get(entry.date) ?? [];
      existing.push(entry);
      map.set(entry.date, existing);
    }
    return map;
  }, [workoutHistory]);

  const { year, month, daysInMonth, startDay, monthLabel } = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    return {
      year: y,
      month: m,
      daysInMonth: new Date(y, m + 1, 0).getDate(),
      startDay: d.getDay(),
      monthLabel: d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    };
  }, [monthOffset]);

  const days = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [startDay, daysInMonth]);

  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedWorkouts = selectedDate ? workoutMap.get(selectedDate) : null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="rounded-lg px-3 py-1 text-sm text-white/50 hover:bg-white/5"
        >
          &lt;
        </button>
        <span className="text-sm font-medium text-white/70">{monthLabel}</span>
        <button
          onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
          disabled={monthOffset >= 0}
          className="rounded-lg px-3 py-1 text-sm text-white/50 hover:bg-white/5 disabled:opacity-20"
        >
          &gt;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map((d) => (
          <span key={d} className="pb-1 text-[10px] font-medium text-white/30">
            {d}
          </span>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const ds = dateStr(day);
          const hasWorkout = workoutMap.has(ds);
          const isSelected = selectedDate === ds;
          const isToday =
            monthOffset === 0 && day === new Date().getDate();

          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(isSelected ? null : ds)}
              className={`relative flex h-9 w-full items-center justify-center rounded-lg text-xs transition-colors ${
                isSelected
                  ? "bg-white text-black"
                  : isToday
                    ? "text-white ring-1 ring-white/30"
                    : "text-white/50 hover:bg-white/5"
              }`}
            >
              {day}
              {hasWorkout && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedWorkouts && selectedWorkouts.length > 0 && (
          <motion.div
            key={selectedDate}
            className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedWorkouts.map((w, i) => (
              <WorkoutCard key={i} entry={w} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingScreen({
  lastWorkoutAt,
  initialPreferences,
  workoutHistory,
  userName,
  onStart,
}: LandingScreenProps) {
  const [tab, setTab] = useState<"home" | "history">("home");
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefsDraft, setPrefsDraft] = useState(initialPreferences);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(userName);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setPrefsDraft(initialPreferences);
  }, [initialPreferences]);

  useEffect(() => {
    setSavedFlash(false);
  }, [prefsDraft]);

  const handleSavePrefs = () => {
    startTransition(async () => {
      await saveUserPreferences(prefsDraft);
      setSavedFlash(true);
    });
  };

  return (
    <motion.div
      className="relative flex flex-1 flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {(["home", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-white text-black"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <UserButton
          appearance={{
            elements: { avatarBox: "h-8 w-8" },
          }}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <motion.div
              key="home"
              className="flex flex-1 flex-col items-center justify-center px-4 pb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {!displayName ? (
                <motion.div
                  className="flex w-full max-w-xs flex-col items-center gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <h2 className="text-xl font-semibold text-white">
                    What&apos;s your name?
                  </h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const trimmed = nameInput.trim();
                      if (!trimmed || savingName) return;
                      setSavingName(true);
                      try {
                        const saved = await saveName(trimmed);
                        setDisplayName(saved);
                      } finally {
                        setSavingName(false);
                      }
                    }}
                    className="flex w-full flex-col gap-4"
                  >
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your first name"
                      autoFocus
                      className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-center text-base text-white placeholder-white/25 outline-none focus:border-white/30"
                    />
                    <button
                      type="submit"
                      disabled={!nameInput.trim() || savingName}
                      className="w-full rounded-2xl bg-white py-3 text-base font-semibold text-black disabled:opacity-40"
                    >
                      {savingName ? "Saving..." : "Continue"}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <>
                  <motion.p
                    className="mb-6 text-lg text-white/50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {lastWorkoutAt
                      ? `Hello again, ${displayName}`
                      : `Hi ${displayName}, ready to start?`}
                  </motion.p>

                  <motion.button
                    onClick={onStart}
                    className="relative h-20 w-20 shrink-0 rounded-full bg-white font-semibold tracking-wider text-black uppercase"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      boxShadow: [
                        "0 0 0px rgba(255,255,255,0.0)",
                        "0 0 30px rgba(255,255,255,0.15)",
                        "0 0 0px rgba(255,255,255,0.0)",
                      ],
                    }}
                    transition={{
                      boxShadow: {
                        repeat: Infinity,
                        duration: 2.5,
                        ease: "easeInOut",
                      },
                    }}
                  >
                    Start
                  </motion.button>

                  <div className="mt-6 shrink-0">
                    {lastWorkoutAt ? (
                      <TimeSinceCounter iso={lastWorkoutAt} />
                    ) : (
                      <motion.p
                        className="text-xs text-white/25"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        Ready for your first workout
                      </motion.p>
                    )}
                  </div>

                  <div className="mt-8 w-full max-w-sm">
                    <button
                      type="button"
                      onClick={() => setShowPrefs((v) => !v)}
                      className="w-full text-center text-xs tracking-wide text-white/40 underline-offset-4 hover:text-white/60 hover:underline"
                    >
                      {showPrefs
                        ? "Hide workout rules"
                        : "Workout rules"}
                    </button>

                    <AnimatePresence>
                      {showPrefs && (
                        <motion.div
                          className="mt-4 flex flex-col gap-3"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <p className="text-center text-[11px] leading-relaxed text-white/30">
                            The AI reads this every time it builds or adjusts a
                            workout. One rule per line works well.
                          </p>
                          <textarea
                            value={prefsDraft}
                            onChange={(e) => setPrefsDraft(e.target.value)}
                            rows={5}
                            placeholder="e.g. No free weights on leg day. Prefer machines."
                            className="w-full resize-none rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/25"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={handleSavePrefs}
                              disabled={isPending}
                              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                            >
                              {isPending ? "Saving..." : "Save rules"}
                            </button>
                            {savedFlash && (
                              <span className="text-xs text-emerald-400/90">
                                Saved
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {tab === "history" && (
            <motion.div
              key="history"
              className="flex flex-1 flex-col px-4 pt-4 pb-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              {workoutHistory.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-white/30">
                    No workout history yet
                  </p>
                </div>
              ) : (
                <CalendarView workoutHistory={workoutHistory} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
