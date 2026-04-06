type Slug =
  | "abs"
  | "adductors"
  | "ankles"
  | "biceps"
  | "calves"
  | "chest"
  | "deltoids"
  | "feet"
  | "forearm"
  | "gluteal"
  | "hamstring"
  | "hands"
  | "head"
  | "knees"
  | "lower-back"
  | "neck"
  | "obliques"
  | "quadriceps"
  | "tibialis"
  | "trapezius"
  | "triceps"
  | "upper-back";

const MUSCLE_ALIAS: Record<string, Slug[]> = {
  abdominals: ["abs"],
  abductors: ["adductors"],
  adductors: ["adductors"],
  biceps: ["biceps"],
  calves: ["calves"],
  chest: ["chest"],
  forearms: ["forearm"],
  glutes: ["gluteal"],
  hamstrings: ["hamstring"],
  lats: ["upper-back"],
  "lower back": ["lower-back"],
  "middle back": ["upper-back"],
  neck: ["neck"],
  quadriceps: ["quadriceps"],
  shoulders: ["deltoids"],
  traps: ["trapezius"],
  triceps: ["triceps"],
};

export interface MuscleSlug {
  slug: Slug;
  intensity: number;
  color: string;
}

export function mapMuscles(dbMuscles: string[]): MuscleSlug[] {
  const slugSet = new Set<Slug>();
  for (const m of dbMuscles) {
    const mapped = MUSCLE_ALIAS[m.toLowerCase()];
    if (mapped) mapped.forEach((x) => slugSet.add(x));
  }
  return [...slugSet].map((slug) => ({
    slug,
    intensity: 1,
    color: "#ffffff",
  }));
}
