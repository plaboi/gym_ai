"use client";

import { useEffect, useState, useMemo, useTransition, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { generateWorkout, modifyWorkout } from "@/lib/actions";
import { lookupExercise } from "@/lib/exercise-lookup";
import { useTimer } from "../hooks/use-timer";
import type { GeneratedExercise } from "../app-shell";

interface WorkoutPlannerProps {
  splitType: string;
  customLabel?: string;
  duration: number;
  startTime: number;
  restoredExercises?: GeneratedExercise[];
  onExercisesChange?: (exercises: GeneratedExercise[]) => void;
  onComplete: (exercises: GeneratedExercise[]) => void;
}

export default function WorkoutPlanner({
  splitType,
  customLabel,
  duration,
  startTime,
  restoredExercises,
  onExercisesChange,
  onComplete,
}: WorkoutPlannerProps) {
  const [exercises, setExercisesRaw] = useState<GeneratedExercise[]>(
    restoredExercises ?? []
  );
  const [checked, setChecked] = useState<boolean[]>(
    restoredExercises ? new Array(restoredExercises.length).fill(false) : []
  );
  const [loading, setLoading] = useState(!restoredExercises);
  const [modifying, setModifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [rememberAsPreference, setRememberAsPreference] = useState(false);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const { hhmmss } = useTimer(startTime);

  const setExercises = useCallback(
    (exs: GeneratedExercise[]) => {
      setExercisesRaw(exs);
      onExercisesChange?.(exs);
    },
    [onExercisesChange]
  );

  useEffect(() => {
    if (restoredExercises && restoredExercises.length > 0) return;
    startTransition(async () => {
      try {
        const result = await generateWorkout(splitType, duration, customLabel);
        setExercises(result);
        setChecked(new Array(result.length).fill(false));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate workout");
      } finally {
        setLoading(false);
      }
    });
  }, [splitType, customLabel, duration, restoredExercises, setExercises]);

  const toggleExercise = (index: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleModify = () => {
    const message = chatInput.trim();
    if (!message || modifying) return;

    const savePref = rememberAsPreference;
    setModifying(true);
    setChatInput("");
    startTransition(async () => {
      try {
        const result = await modifyWorkout(
          exercises,
          message,
          splitType,
          duration,
          savePref,
          customLabel
        );
        setExercises(result);
        setChecked(new Array(result.length).fill(false));
        setError(null);
        if (savePref) setRememberAsPreference(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to modify workout");
      } finally {
        setModifying(false);
        inputRef.current?.focus();
      }
    });
  };

  const exerciseLookups = useMemo(
    () => exercises.map((ex) => lookupExercise(ex.name)),
    [exercises]
  );

  const allChecked = checked.length > 0 && checked.every(Boolean);

  return (
    <motion.div
      className="flex flex-1 flex-col bg-black"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-white">Your Workout</h2>
        <span className="font-mono text-sm tabular-nums text-white/70">
          {hhmmss}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-44">
        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-32">
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
            <p className="text-sm text-muted">Generating your workout...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 pt-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {modifying && (
          <div className="flex items-center gap-2 py-3">
            <motion.div
              className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
            <p className="text-sm text-muted">Updating workout...</p>
          </div>
        )}

        <AnimatePresence>
          {!loading &&
            exercises.map((ex, i) => (
              <motion.button
                key={`${ex.name}-${i}`}
                onClick={() => toggleExercise(i)}
                className="flex w-full items-center gap-3 border-b border-white/5 py-3 text-left"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <div
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    if (exerciseLookups[i]?.imageUrl) {
                      e.stopPropagation();
                      setZoomedIndex(i);
                    }
                  }}
                  className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5"
                >
                  {exerciseLookups[i]?.imageUrl ? (
                    <Image
                      src={exerciseLookups[i].imageUrl!}
                      alt={ex.name}
                      fill
                      sizes="40px"
                      className="object-cover grayscale contrast-125 brightness-110"
                    />
                  ) : (
                    <svg className="h-full w-full p-2 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6.5 6.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM21.5 6.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM2 6.5h2.5M6.5 6.5h11M19.5 6.5H22" strokeLinecap="round" />
                    </svg>
                  )}
                </div>

                <motion.div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    checked[i]
                      ? "border-white bg-white"
                      : "border-white/30 bg-transparent"
                  }`}
                  animate={checked[i] ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.25 }}
                >
                  {checked[i] && (
                    <motion.svg
                      width="12"
                      height="12"
                      viewBox="0 0 14 14"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.path
                        d="M2 7L5.5 10.5L12 3.5"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  )}
                </motion.div>

                <div className="flex flex-1 flex-col">
                  <span
                    className={`text-sm font-medium transition-colors ${checked[i] ? "text-white/40 line-through" : "text-white"}`}
                  >
                    {ex.name}
                  </span>
                  <span className="text-xs text-muted">
                    {ex.recommended_sets} sets x {ex.recommended_reps} reps
                  </span>
                </div>
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black via-black to-transparent px-6 pt-6 pb-8">
        {!loading && !allChecked && (
          <div className="flex flex-col gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleModify();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="e.g. replace stretching with cardio"
                disabled={modifying}
                className="flex-1 rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || modifying}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30"
              >
                {modifying ? "..." : "Send"}
              </button>
            </form>
            <label className="flex cursor-pointer items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={rememberAsPreference}
                onChange={(e) => setRememberAsPreference(e.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-card accent-white"
              />
              <span className="text-xs text-white/40">
                Remember this for future workouts
              </span>
            </label>
          </div>
        )}

        <AnimatePresence>
          {allChecked && (
            <motion.button
              onClick={() => onComplete(exercises)}
              className="w-full rounded-2xl bg-white py-4 text-base font-semibold text-black"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              whileTap={{ scale: 0.97 }}
            >
              Complete Workout
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {zoomedIndex !== null && exerciseLookups[zoomedIndex]?.imageUrl && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setZoomedIndex(null)}
          >
            <motion.div
              className="relative flex flex-col items-center gap-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-72 w-72 overflow-hidden rounded-2xl">
                <Image
                  src={exerciseLookups[zoomedIndex].imageUrl!}
                  alt={exercises[zoomedIndex]?.name ?? "Exercise"}
                  fill
                  sizes="288px"
                  className="object-cover grayscale contrast-125 brightness-110"
                />
              </div>
              <p className="max-w-[280px] text-center text-sm font-medium text-white">
                {exercises[zoomedIndex]?.name}
              </p>
              <button
                onClick={() => setZoomedIndex(null)}
                className="mt-1 rounded-full bg-white/10 px-5 py-2 text-xs text-white/70"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
