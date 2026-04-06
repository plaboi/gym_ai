"use client";

import { useState, useMemo, useTransition } from "react";
import { motion } from "framer-motion";
import Body from "react-muscle-highlighter";
import { completeWorkout } from "@/lib/actions";
import { lookupExercise } from "@/lib/exercise-lookup";
import { mapMuscles } from "@/lib/muscle-map";
import type { GeneratedExercise } from "../app-shell";

interface SummaryScreenProps {
  splitType: string;
  duration: number;
  exercises: GeneratedExercise[];
  startTime: number;
  userGender: string | null;
  onFinish: () => void;
}

const SPLIT_LABELS: Record<string, string> = {
  legs_arms: "Legs + Arms",
  chest_tri: "Chest + Tri",
  back_bi: "Back + Bi",
};

export default function SummaryScreen({
  splitType,
  duration,
  exercises,
  startTime,
  userGender,
  onFinish,
}: SummaryScreenProps) {
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const elapsed = useMemo(() => {
    const diffMs = Date.now() - startTime;
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [startTime]);

  const totalSets = exercises.reduce(
    (sum, ex) => sum + ex.recommended_sets,
    0
  );

  const bodyData = useMemo(() => {
    const allMuscles: string[] = [];
    for (const ex of exercises) {
      const info = lookupExercise(ex.name);
      allMuscles.push(...info.primaryMuscles, ...info.secondaryMuscles);
    }
    return mapMuscles(allMuscles);
  }, [exercises]);

  const gender: "male" | "female" =
    userGender === "female" ? "female" : "male";

  const handleFinish = () => {
    setSaving(true);
    startTransition(async () => {
      try {
        await completeWorkout(splitType, duration, exercises);
      } catch {
        // DB write failed — still let the user proceed
      }
      setSaving(false);
      onFinish();
    });
  };

  const stats = [
    { label: "Time Elapsed", value: elapsed },
    { label: "Exercises", value: exercises.length },
    { label: "Total Sets", value: totalSets },
  ];

  return (
    <motion.div
      className="flex flex-1 flex-col items-center overflow-y-auto bg-black px-8 py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-white">Workout Complete</h2>
        <p className="text-sm text-muted">
          {SPLIT_LABELS[splitType] ?? splitType}
        </p>
      </motion.div>

      <motion.div
        className="my-6 flex items-center justify-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Body
          data={bodyData}
          side="front"
          gender={gender}
          scale={1.2}
          border="none"
          defaultFill="#1a1a1a"
          colors={["#ffffff"]}
        />
        <Body
          data={bodyData}
          side="back"
          gender={gender}
          scale={1.2}
          border="none"
          defaultFill="#1a1a1a"
          colors={["#ffffff"]}
        />
      </motion.div>

      <div className="flex w-full justify-around">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.1 }}
          >
            <motion.span
              className="text-3xl font-bold text-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.5 + i * 0.1,
                type: "spring",
                stiffness: 200,
              }}
            >
              {stat.value}
            </motion.span>
            <span className="text-xs text-muted">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={handleFinish}
        disabled={saving || isPending}
        className="mt-8 w-full rounded-2xl bg-white py-4 text-base font-semibold text-black disabled:opacity-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        whileTap={{ scale: 0.97 }}
      >
        {saving || isPending ? "Saving..." : "Finish"}
      </motion.button>
    </motion.div>
  );
}
