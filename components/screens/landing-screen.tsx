"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton } from "@clerk/nextjs";
import { saveUserPreferences, saveProfile } from "@/lib/actions";
import { useTimer } from "../hooks/use-timer";
import type { WorkoutHistoryEntry, UserProfile } from "../app-shell";

interface LandingScreenProps {
  lastWorkoutAt: string | null;
  initialPreferences: string;
  workoutHistory: WorkoutHistoryEntry[];
  userProfile: UserProfile | null;
  onStart: () => void;
}

interface StructuredPrefs {
  goal: string;
  prioritizeGoal: boolean;
  requirements: string;
  preferences: string;
}

const SPLIT_LABELS: Record<string, string> = {
  legs_arms: "Legs + Arms",
  chest_tri: "Chest + Tri",
  back_bi: "Back + Bi",
};

function titleCaseSplit(s: string) {
  return s
    .split(/[\s_]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const GOALS = [
  "Lose weight",
  "Build muscle",
  "Improve endurance",
  "General fitness",
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function parsePrefs(raw: string): StructuredPrefs {
  try {
    const parsed = JSON.parse(raw);
    return {
      goal: parsed.goal ?? "",
      prioritizeGoal: parsed.prioritizeGoal ?? false,
      requirements: parsed.requirements ?? "",
      preferences: parsed.preferences ?? "",
    };
  } catch {
    return {
      goal: "",
      prioritizeGoal: false,
      requirements: raw,
      preferences: "",
    };
  }
}

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
            {SPLIT_LABELS[entry.splitType] ?? titleCaseSplit(entry.splitType)}
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

function OnboardingFlow({
  onComplete,
}: {
  onComplete: (profile: UserProfile) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFinish = async (selectedGender: string) => {
    setSaving(true);
    try {
      const profile = await saveProfile(
        name,
        parseInt(age, 10),
        selectedGender
      );
      onComplete(profile);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step === 1 && (
        <motion.div
          key="step1"
          className="flex w-full max-w-xs flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-white">
            What&apos;s your name?
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setStep(2);
            }}
            className="flex w-full flex-col gap-4"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your first name"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-center text-base text-white placeholder-white/25 outline-none focus:border-white/30"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full rounded-2xl bg-white py-3 text-base font-semibold text-black disabled:opacity-40"
            >
              Next
            </button>
          </form>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step2"
          className="flex w-full max-w-xs flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-white">
            How old are you?
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const num = parseInt(age, 10);
              if (num > 0 && num < 120) setStep(3);
            }}
            className="flex w-full flex-col gap-4"
          >
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              min={1}
              max={120}
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-card px-4 py-3 text-center text-base text-white placeholder-white/25 outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="submit"
              disabled={!age || parseInt(age, 10) <= 0}
              className="w-full rounded-2xl bg-white py-3 text-base font-semibold text-black disabled:opacity-40"
            >
              Next
            </button>
          </form>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          key="step3"
          className="flex w-full max-w-xs flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-white">Gender</h2>
          <div className="flex w-full gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGender(opt.value)}
                className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-colors ${
                  gender === opt.value
                    ? "border-white bg-white text-black"
                    : "border-white/10 text-white/60 hover:border-white/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleFinish(gender)}
            disabled={!gender || saving}
            className="w-full rounded-2xl bg-white py-3 text-base font-semibold text-black disabled:opacity-40"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PreferencesEditor({
  initialPreferences,
}: {
  initialPreferences: string;
}) {
  const [prefs, setPrefs] = useState<StructuredPrefs>(() =>
    parsePrefs(initialPreferences)
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPrefs(parsePrefs(initialPreferences));
  }, [initialPreferences]);

  useEffect(() => {
    setSavedFlash(false);
  }, [prefs]);

  const handleSave = () => {
    startTransition(async () => {
      await saveUserPreferences(JSON.stringify(prefs));
      setSavedFlash(true);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-medium text-white/50">Goal</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() =>
                setPrefs((p) => ({ ...p, goal: p.goal === g ? "" : g }))
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                prefs.goal === g
                  ? "border-white bg-white text-black"
                  : "border-white/10 text-white/50 hover:border-white/30"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {prefs.goal && (
          <label className="mt-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.prioritizeGoal}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, prioritizeGoal: e.target.checked }))
              }
              className="h-3.5 w-3.5 rounded border-white/30 bg-card accent-white"
            />
            <span className="text-[11px] text-white/40">
              Prioritize this goal
            </span>
          </label>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-white/50">
          Requirements
        </p>
        <p className="mb-2 text-[10px] text-white/25">
          Hard rules the AI must always follow
        </p>
        <textarea
          value={prefs.requirements}
          onChange={(e) =>
            setPrefs((p) => ({ ...p, requirements: e.target.value }))
          }
          rows={3}
          placeholder="e.g. No free weights for legs. No overhead press."
          className="w-full resize-none rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-white/50">Preferences</p>
        <p className="mb-2 text-[10px] text-white/25">
          Soft preferences the AI should try to follow
        </p>
        <textarea
          value={prefs.preferences}
          onChange={(e) =>
            setPrefs((p) => ({ ...p, preferences: e.target.value }))
          }
          rows={3}
          placeholder="e.g. Prefer machines. Like supersets."
          className="w-full resize-none rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        {savedFlash && (
          <span className="text-xs text-emerald-400/90">Saved</span>
        )}
      </div>
    </div>
  );
}

export default function LandingScreen({
  lastWorkoutAt,
  initialPreferences,
  workoutHistory,
  userProfile,
  onStart,
}: LandingScreenProps) {
  const [tab, setTab] = useState<"home" | "history">("home");
  const [showPrefs, setShowPrefs] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(userProfile);

  const needsOnboarding = !profile?.name;
  const displayName = profile?.name ?? null;

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
              {needsOnboarding ? (
                <OnboardingFlow onComplete={(p) => setProfile(p)} />
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
                        ? "Hide preferences"
                        : "Workout preferences & goals"}
                    </button>

                    <AnimatePresence>
                      {showPrefs && (
                        <motion.div
                          className="mt-4"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <PreferencesEditor
                            initialPreferences={initialPreferences}
                          />
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
