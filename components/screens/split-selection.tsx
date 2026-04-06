"use client";

import { motion } from "framer-motion";

const SPLITS = [
  { label: "Legs + Arms", value: "legs_arms" },
  { label: "Chest + Tri", value: "chest_tri" },
  { label: "Back + Bi", value: "back_bi" },
] as const;

interface SplitSelectionProps {
  onSelect: (split: string) => void;
}

export default function SplitSelection({ onSelect }: SplitSelectionProps) {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center gap-10 bg-black px-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.p
        className="text-center text-sm tracking-wide text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Choose your split
      </motion.p>

      <div className="flex w-full flex-col gap-4">
        {SPLITS.map((split, i) => (
          <motion.button
            key={split.value}
            onClick={() => onSelect(split.value)}
            className="w-full rounded-2xl border border-white/10 bg-card py-5 text-lg font-medium text-white transition-colors hover:bg-white/5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {split.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
