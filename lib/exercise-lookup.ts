import exerciseDb from "./exercise-db.json";

const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

interface ExerciseEntry {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  images: string[];
}

interface LookupResult {
  imageUrl: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSet(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

function jaccardScore(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const db = exerciseDb as ExerciseEntry[];

const indexedDb = db.map((entry) => ({
  ...entry,
  normalized: normalize(entry.name),
  words: wordSet(entry.name),
}));

export function lookupExercise(name: string): LookupResult {
  const queryNorm = normalize(name);
  const queryWords = wordSet(name);

  let bestScore = 0;
  let bestEntry: ExerciseEntry | null = null;

  for (const entry of indexedDb) {
    if (entry.normalized === queryNorm) {
      bestEntry = entry;
      bestScore = 1;
      break;
    }

    if (entry.normalized.includes(queryNorm) || queryNorm.includes(entry.normalized)) {
      const len = Math.min(queryNorm.length, entry.normalized.length);
      const maxLen = Math.max(queryNorm.length, entry.normalized.length);
      const score = 0.5 + 0.5 * (len / maxLen);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
      continue;
    }

    const score = jaccardScore(queryWords, entry.words);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (!bestEntry || bestScore < 0.25) {
    return { imageUrl: null, primaryMuscles: [], secondaryMuscles: [] };
  }

  const imageUrl =
    bestEntry.images.length > 0
      ? `${IMAGE_BASE}${bestEntry.images[0]}`
      : null;

  return {
    imageUrl,
    primaryMuscles: bestEntry.primaryMuscles,
    secondaryMuscles: bestEntry.secondaryMuscles,
  };
}
