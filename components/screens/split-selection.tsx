"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createCustomCategory, type CustomCategory } from "@/lib/actions";
import type { SplitChoice } from "../app-shell";

const DEFAULT_SPLITS: SplitChoice[] = [
  { value: "legs_arms", label: "Legs + Arms", isGym: true },
  { value: "chest_tri", label: "Chest + Tri", isGym: true },
  { value: "back_bi", label: "Back + Bi", isGym: true },
];

interface SplitSelectionProps {
  customCategories: CustomCategory[];
  onSelect: (choice: SplitChoice) => void;
}

export default function SplitSelection({
  customCategories,
  onSelect,
}: SplitSelectionProps) {
  const [customs, setCustoms] = useState<CustomCategory[]>(customCategories);
  const [showModal, setShowModal] = useState(false);

  const handleCreated = (cat: CustomCategory) => {
    setCustoms((prev) => {
      if (prev.some((c) => c.id === cat.id)) return prev;
      return [...prev, cat];
    });
    setShowModal(false);
    onSelect({ value: cat.name, label: titleCase(cat.name), isGym: cat.isGym });
  };

  const allChoices: SplitChoice[] = [
    ...DEFAULT_SPLITS,
    ...customs.map((c) => ({
      value: c.name,
      label: titleCase(c.name),
      isGym: c.isGym,
    })),
  ];

  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto bg-black px-8 py-8"
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
        {allChoices.map((choice, i) => (
          <motion.button
            key={`${choice.value}-${i}`}
            onClick={() => onSelect(choice)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-card px-5 py-5 text-left text-lg font-medium text-white transition-colors hover:bg-white/5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>{choice.label}</span>
            {!choice.isGym && (
              <span className="text-xs font-normal text-white/40">
                Activity
              </span>
            )}
          </motion.button>
        ))}

        <motion.button
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-transparent py-5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + allChoices.length * 0.08, duration: 0.35 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="text-lg leading-none">+</span>
          <span>Add Custom Category</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showModal && (
          <CreateCategoryModal
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function titleCase(s: string) {
  return s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface CreateCategoryModalProps {
  onClose: () => void;
  onCreated: (cat: CustomCategory) => void;
}

function CreateCategoryModal({ onClose, onCreated }: CreateCategoryModalProps) {
  const [name, setName] = useState("");
  const [isGym, setIsGym] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const cat = await createCustomCategory(trimmed, isGym);
        onCreated(cat);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-card p-6"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">
          New workout category
        </h3>
        <p className="mt-1 text-xs text-white/40">
          Give it a name like &ldquo;abs&rdquo;, &ldquo;swimming&rdquo;, or
          &ldquo;tennis&rdquo;.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          autoFocus
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
        />

        <div className="mt-5">
          <p className="mb-2 text-xs text-white/50">
            Is this a gym / body-part workout?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsGym(true)}
              className={`flex-1 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                isGym
                  ? "bg-white text-black"
                  : "border border-white/10 bg-transparent text-white/60 hover:bg-white/5"
              }`}
            >
              Gym / body part
            </button>
            <button
              type="button"
              onClick={() => setIsGym(false)}
              className={`flex-1 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                !isGym
                  ? "bg-white text-black"
                  : "border border-white/10 bg-transparent text-white/60 hover:bg-white/5"
              }`}
            >
              Activity / cardio
            </button>
          </div>
          <p className="mt-2 text-xs text-white/30">
            {isGym
              ? "We'll ask the AI to generate exercises."
              : "You'll use a simple start/stop timer."}
          </p>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
