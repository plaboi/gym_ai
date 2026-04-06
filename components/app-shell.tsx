"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import LandingScreen from "./screens/landing-screen";
import SplitSelection from "./screens/split-selection";
import DurationSelection from "./screens/duration-selection";
import WorkoutPlanner from "./screens/workout-planner";
import SummaryScreen from "./screens/summary-screen";

export type Screen =
  | "landing"
  | "split"
  | "duration"
  | "planner"
  | "summary";

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

interface AppShellProps {
  lastWorkoutAt: string | null;
  initialPreferences: string;
  workoutHistory: WorkoutHistoryEntry[];
}

export default function AppShell({
  lastWorkoutAt,
  initialPreferences,
  workoutHistory,
}: AppShellProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("landing");
  const [splitType, setSplitType] = useState("");
  const [duration, setDuration] = useState(0);
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const startTimeRef = useRef<number>(0);

  const handleStart = useCallback(() => {
    setScreen("split");
  }, []);

  const handleSplitSelect = useCallback((split: string) => {
    setSplitType(split);
    setScreen("duration");
  }, []);

  const handleDurationSelect = useCallback((minutes: number) => {
    setDuration(minutes);
    startTimeRef.current = Date.now();
    setScreen("planner");
  }, []);

  const handleWorkoutComplete = useCallback(
    (completedExercises: GeneratedExercise[]) => {
      setExercises(completedExercises);
      setScreen("summary");
    },
    []
  );

  const handleFinish = useCallback(() => {
    setScreen("landing");
    router.refresh();
  }, [router]);

  return (
    <AnimatePresence mode="wait">
      {screen === "landing" && (
        <LandingScreen
          key="landing"
          lastWorkoutAt={lastWorkoutAt}
          initialPreferences={initialPreferences}
          workoutHistory={workoutHistory}
          onStart={handleStart}
        />
      )}
      {screen === "split" && (
        <SplitSelection
          key="split"
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
          duration={duration}
          startTime={startTimeRef.current}
          onComplete={handleWorkoutComplete}
        />
      )}
      {screen === "summary" && (
        <SummaryScreen
          key="summary"
          splitType={splitType}
          duration={duration}
          exercises={exercises}
          startTime={startTimeRef.current}
          onFinish={handleFinish}
        />
      )}
    </AnimatePresence>
  );
}
