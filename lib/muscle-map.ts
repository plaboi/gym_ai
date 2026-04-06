type BodyHighlighterMuscle =
  | "trapezius"
  | "upper-back"
  | "lower-back"
  | "chest"
  | "biceps"
  | "triceps"
  | "forearm"
  | "back-deltoids"
  | "front-deltoids"
  | "abs"
  | "obliques"
  | "adductor"
  | "hamstring"
  | "quadriceps"
  | "abductors"
  | "calves"
  | "gluteal"
  | "head"
  | "neck";

const MUSCLE_ALIAS: Record<string, BodyHighlighterMuscle[]> = {
  abdominals: ["abs"],
  abductors: ["abductors"],
  adductors: ["adductor"],
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
  shoulders: ["front-deltoids", "back-deltoids"],
  traps: ["trapezius"],
  triceps: ["triceps"],
};

export function mapMuscles(dbMuscles: string[]): BodyHighlighterMuscle[] {
  const result = new Set<BodyHighlighterMuscle>();
  for (const m of dbMuscles) {
    const mapped = MUSCLE_ALIAS[m.toLowerCase()];
    if (mapped) mapped.forEach((x) => result.add(x));
  }
  return [...result];
}
