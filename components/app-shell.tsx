"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import LandingScreen from "./screens/landing-screen";
import SplitSelection from "./screens/split-selection";
import DurationSelection from "./screens/duration-selection";
import WorkoutPlanner from "./screens/workout-planner";
import SummaryScreen from "./screens/summary-screen";
import ActivityTimer from "./screens/activity-timer";
import type { CustomCategory } from "@/lib/actions";

export type Screen =
  | "landing"
  | "split"
  | "duration"
  | "planner"
  | "activity"
  | "summary";

export type SummaryMode = "gym" | "activity";

export interface GeneratedExercise {
  name: string;
  recommended_sets: number;
  recommended_reps: number;
}

export interface HistoryExercise {
  name: string;
  sets: number;
  reps: number;
}

export interface WorkoutHistoryEntry {
  date: string;
  splitType: string;
  exerciseCount: number;
  durationMinutes: number;
  exercises: HistoryExercise[];
}

export interface UserProfile {
  name: string | null;
  age: number | null;
  gender: string | null;
}

export interface SplitChoice {
  value: string;
  label: string;
  isGym: boolean;
}

const SESSION_KEY = "gym-ai-workout-state";

interface PersistedState {
  screen: Screen;
  splitType: string;
  categoryLabel: string;
  categoryIsGym: boolean;
  duration: number;
  startTime: number;
  exercises: GeneratedExercise[];
  summaryMode: SummaryMode;
  activityElapsedSeconds: number;
}

const ACTIVITY_TIMER_SESSION_KEY = "gym-ai-activity-timer";
function clearActivityTimerState() {
  try {
    sessionStorage.removeItem(ACTIVITY_TIMER_SESSION_KEY);
  } catch {
    // Ignore
  }
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function persistState(state: PersistedState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable
  }
}

function clearPersistedState() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

interface AppShellProps {
  lastWorkoutAt: string | null;
  initialPreferences: string;
  workoutHistory: WorkoutHistoryEntry[];
  userProfile: UserProfile | null;
  customCategories: CustomCategory[];
}

export default function AppShell({
  lastWorkoutAt,
  initialPreferences,
  workoutHistory,
  userProfile,
  customCategories,
}: AppShellProps) {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>("landing");
  const [splitType, setSplitType] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categoryIsGym, setCategoryIsGym] = useState(true);
  const [duration, setDuration] = useState(0);
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("gym");
  const [activityElapsedSeconds, setActivityElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const saved = loadPersistedState();
    if (saved && saved.screen !== "landing") {
      setScreen(saved.screen);
      setSplitType(saved.splitType);
      setCategoryLabel(saved.categoryLabel ?? "");
      setCategoryIsGym(saved.categoryIsGym ?? true);
      setDuration(saved.duration);
      startTimeRef.current = saved.startTime;
      setExercises(saved.exercises);
      setSummaryMode(saved.summaryMode ?? "gym");
      setActivityElapsedSeconds(saved.activityElapsedSeconds ?? 0);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (screen === "landing") {
      clearPersistedState();
    } else {
      persistState({
        screen,
        splitType,
        categoryLabel,
        categoryIsGym,
        duration,
        startTime: startTimeRef.current,
        exercises,
        summaryMode,
        activityElapsedSeconds,
      });
    }
  }, [
    hydrated,
    screen,
    splitType,
    categoryLabel,
    categoryIsGym,
    duration,
    exercises,
    summaryMode,
    activityElapsedSeconds,
  ]);

  const handleStart = useCallback(() => {
    setScreen("split");
  }, []);

  const handleSplitSelect = useCallback((sel: SplitChoice) => {
    setSplitType(sel.value);
    setCategoryLabel(sel.label);
    setCategoryIsGym(sel.isGym);
    setExercises([]);
    if (sel.isGym) {
      setScreen("duration");
    } else {
      startTimeRef.current = 0;
      setActivityElapsedSeconds(0);
      clearActivityTimerState();
      setScreen("activity");
    }
  }, []);

  const handleDurationSelect = useCallback((minutes: number) => {
    setDuration(minutes);
    startTimeRef.current = Date.now();
    setScreen("planner");
  }, []);

  const handleExercisesUpdate = useCallback(
    (updatedExercises: GeneratedExercise[]) => {
      setExercises(updatedExercises);
    },
    []
  );

  const handleWorkoutComplete = useCallback(
    (completedExercises: GeneratedExercise[]) => {
      setExercises(completedExercises);
      setSummaryMode("gym");
      setScreen("summary");
    },
    []
  );

  const handleActivityComplete = useCallback((elapsedSeconds: number) => {
    setActivityElapsedSeconds(elapsedSeconds);
    setDuration(Math.max(1, Math.round(elapsedSeconds / 60)));
    setSummaryMode("activity");
    setScreen("summary");
  }, []);

  const handleFinish = useCallback(() => {
    clearPersistedState();
    clearActivityTimerState();
    setScreen("landing");
    router.refresh();
  }, [router]);

  if (!hydrated) return null;

  return (
    <AnimatePresence mode="wait">
      {screen === "landing" && (
        <LandingScreen
          key="landing"
          lastWorkoutAt={lastWorkoutAt}
          initialPreferences={initialPreferences}
          workoutHistory={workoutHistory}
          userProfile={userProfile}
          onStart={handleStart}
        />
      )}
      {screen === "split" && (
        <SplitSelection
          key="split"
          customCategories={customCategories}
          onSelect={handleSplitSelect}
        />
      )}
      {screen === "duration" && (
        <DurationSelection key="duration" onSelect={handleDurationSelect} />
      )}
      {screen === "planner" && (
        <WorkoutPlanner
          key="planner"
          splitType={splitType}
          customLabel={categoryIsGym ? categoryLabel : undefined}
          duration={duration}
          startTime={startTimeRef.current}
          restoredExercises={exercises.length > 0 ? exercises : undefined}
          onExercisesChange={handleExercisesUpdate}
          onComplete={handleWorkoutComplete}
        />
      )}
      {screen === "activity" && (
        <ActivityTimer
          key="activity"
          categoryName={splitType}
          categoryLabel={categoryLabel}
          onComplete={handleActivityComplete}
        />
      )}
      {screen === "summary" && (
        <SummaryScreen
          key="summary"
          splitType={splitType}
          categoryLabel={categoryLabel}
          duration={duration}
          exercises={exercises}
          startTime={startTimeRef.current}
          userGender={userProfile?.gender ?? null}
          mode={summaryMode}
          activityElapsedSeconds={activityElapsedSeconds}
          onFinish={handleFinish}
        />
      )}
    </AnimatePresence>
  );
}
