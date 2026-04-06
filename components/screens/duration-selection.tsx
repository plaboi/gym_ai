"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const DURATIONS = [30, 45, 60] as const;

interface DurationSelectionProps {
  onSelect: (minutes: number) => void;
}

export default function DurationSelection({
  onSelect,
}: DurationSelectionProps) {
  const [selected, setSelected] = useState<number>(45);

  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center gap-12 bg-black px-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <p className="text-sm tracking-wide text-muted">
        Select workout duration
      </p>

      <div className="relative flex items-center justify-center">
        <motion.div
          className="flex h-44 w-44 items-center justify-center rounded-full border-2 border-white/20"
          animate={{
            borderColor:
              selected === 30
                ? "rgba(255,255,255,0.4)"
                : selected === 60
                  ? "rgba(255,255,255,0.8)"
                  : "rgba(255,255,255,0.6)",
          }}
          transition={{ duration: 0.3 }}
        >
          <motion.span
            key={selected}
            className="text-5xl font-bold text-white"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {selected}
          </motion.span>
          <span className="absolute bottom-10 text-sm text-muted">min</span>
        </motion.div>
      </div>

      <div className="flex w-full gap-3">
        {DURATIONS.map((d) => (
          <motion.button
            key={d}
            onClick={() => setSelected(d)}
            className={`flex-1 rounded-xl py-3 text-base font-medium transition-colors ${
              selected === d
                ? "bg-white text-black"
                : "border border-white/10 bg-card text-white"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {d} min
          </motion.button>
        ))}
      </div>

      <motion.button
        onClick={() => onSelect(selected)}
        className="w-full rounded-2xl bg-white py-4 text-base font-semibold text-black"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        Generate Workout
      </motion.button>
    </motion.div>
  );
}
