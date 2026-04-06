"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, workouts, exercises, userPreferences } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface GeneratedExercise {
  name: string;
  recommended_sets: number;
  recommended_reps: number;
}

const SPLIT_LABELS: Record<string, string> = {
  legs_arms: "Legs + Arms",
  chest_tri: "Chest + Triceps",
  back_bi: "Back + Biceps",
};

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

async function getWorkoutHistory(userId: string): Promise<string> {
  const recentWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, userId),
    orderBy: [desc(workouts.completedAt)],
    limit: 10,
  });

  if (recentWorkouts.length === 0) return "No previous workout history.";

  const entries: string[] = [];
  for (const w of recentWorkouts) {
    const exList = await db.query.exercises.findMany({
      where: eq(exercises.workoutId, w.id),
    });
    const date = w.completedAt
      ? w.completedAt.toISOString().split("T")[0]
      : "in-progress";
    const names = exList.map((e) => e.name).join(", ");
    entries.push(`${date} — ${SPLIT_LABELS[w.splitType] ?? w.splitType} (${w.durationMinutes}min): ${names}`);
  }

  return `Recent workout history (newest first):\n${entries.join("\n")}`;
}

async function getPreferencesPromptBlock(userId: string): Promise<string> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  const text = rows[0]?.content?.trim() ?? "";
  if (!text) {
    return "The user has not set any persistent workout preferences.";
  }
  return `The user's persistent workout preferences (always honor these; still vary exercises and avoid repeating recent workouts unnecessarily):\n${text}`;
}

async function callGemini(prompt: string): Promise<GeneratedExercise[]> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse workout from AI response");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generateWorkout(
  splitType: string,
  durationMinutes: number
): Promise<GeneratedExercise[]> {
  const splitLabel = SPLIT_LABELS[splitType] ?? splitType;

  let historyContext = "No previous workout history.";
  let prefsBlock = "The user has not set any persistent workout preferences.";
  try {
    const userId = await ensureUser();
    historyContext = await getWorkoutHistory(userId);
    prefsBlock = await getPreferencesPromptBlock(userId);
  } catch {
    // User may not exist yet — that's fine, generate without history
  }

  const prompt = `You are a personal fitness trainer AI. Generate a workout list for a ${splitLabel} workout that takes exactly ${durationMinutes} minutes.

${prefsBlock}

${historyContext}

IMPORTANT: Vary the exercises so they don't repeat the same ones from recent workouts. Mix in different exercises to keep things fresh, while still respecting the user's persistent preferences above.

Return ONLY a JSON array of objects with 'name', 'recommended_sets', and 'recommended_reps'. No markdown, no explanation — just the raw JSON array.`;

  return callGemini(prompt);
}

export async function modifyWorkout(
  currentExercises: GeneratedExercise[],
  userMessage: string,
  splitType: string,
  durationMinutes: number,
  saveAsPreference?: boolean
): Promise<GeneratedExercise[]> {
  const splitLabel = SPLIT_LABELS[splitType] ?? splitType;

  let historyContext = "No previous workout history.";
  let prefsBlock = "The user has not set any persistent workout preferences.";
  let userId: string | null = null;
  try {
    userId = await ensureUser();
    historyContext = await getWorkoutHistory(userId);
    prefsBlock = await getPreferencesPromptBlock(userId);
  } catch {
    // Continue without history
  }

  const currentList = currentExercises
    .map((ex) => `- ${ex.name}: ${ex.recommended_sets} sets x ${ex.recommended_reps} reps`)
    .join("\n");

  const prompt = `You are a personal fitness trainer AI. The user is doing a ${splitLabel} workout (${durationMinutes} min).

${prefsBlock}

Current workout plan:
${currentList}

${historyContext}

The user wants to change their workout. Their request: "${userMessage}"

Modify the workout plan based on the user's request. Keep the total duration around ${durationMinutes} minutes. Respect persistent preferences, and use the workout history to avoid repeating the same exercises too often.

Return ONLY a JSON array of objects with 'name', 'recommended_sets', and 'recommended_reps'. No markdown, no explanation — just the raw JSON array.`;

  const result = await callGemini(prompt);

  if (saveAsPreference && userId && userMessage.trim()) {
    await appendPreferenceLine(userId, userMessage.trim());
  }

  return result;
}

async function appendPreferenceLine(userId: string, line: string): Promise<void> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  const prev = rows[0]?.content?.trim() ?? "";
  const next = prev ? `${prev}\n${line}` : line;
  await db
    .insert(userPreferences)
    .values({ userId, content: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { content: next, updatedAt: new Date() },
    });
}

async function ensureUser(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (existing) return existing.id;

  const [newUser] = await db
    .insert(users)
    .values({ clerkId, email: `${clerkId}@clerk.user` })
    .returning({ id: users.id });

  return newUser.id;
}

export async function completeWorkout(
  splitType: string,
  durationMinutes: number,
  completedExercises: GeneratedExercise[]
) {
  const userId = await ensureUser();

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      splitType,
      durationMinutes,
      completedAt: new Date(),
    })
    .returning({ id: workouts.id });

  if (completedExercises.length > 0) {
    await db.insert(exercises).values(
      completedExercises.map((ex) => ({
        workoutId: workout.id,
        name: ex.name,
        sets: ex.recommended_sets,
        reps: ex.recommended_reps,
        completed: true,
      }))
    );
  }

  return { success: true };
}

export async function getUserPreferences(): Promise<{ content: string }> {
  try {
    const userId = await ensureUser();
    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return { content: rows[0]?.content ?? "" };
  } catch {
    return { content: "" };
  }
}

export async function saveUserPreferences(
  content: string
): Promise<{ content: string }> {
  const userId = await ensureUser();
  const trimmed = content.trim();
  await db
    .insert(userPreferences)
    .values({ userId, content: trimmed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { content: trimmed, updatedAt: new Date() },
    });
  return { content: trimmed };
}

export async function getLastWorkoutTimestamp(): Promise<string | null> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!user) return null;

    const lastWorkout = await db.query.workouts.findFirst({
      where: eq(workouts.userId, user.id),
      orderBy: [desc(workouts.completedAt)],
    });

    return lastWorkout?.completedAt?.toISOString() ?? null;
  } catch {
    return null;
  }
}

export async function getUserName(clerkId: string): Promise<string | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    return user?.name ?? null;
  } catch {
    return null;
  }
}

export async function saveName(name: string): Promise<string> {
  const userId = await ensureUser();
  const trimmed = name.trim();
  await db.update(users).set({ name: trimmed }).where(eq(users.id, userId));
  return trimmed;
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

export async function getWorkoutHistoryForCalendar(
  clerkId: string
): Promise<WorkoutHistoryEntry[]> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!user) return [];

    const recent = await db.query.workouts.findMany({
      where: eq(workouts.userId, user.id),
      orderBy: [desc(workouts.completedAt)],
      limit: 90,
    });

    const result: WorkoutHistoryEntry[] = [];
    for (const w of recent) {
      if (!w.completedAt) continue;
      const exList = await db.query.exercises.findMany({
        where: eq(exercises.workoutId, w.id),
      });
      result.push({
        date: w.completedAt.toISOString().split("T")[0],
        splitType: w.splitType,
        exerciseCount: exList.length,
        durationMinutes: w.durationMinutes,
        exercises: exList.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
        })),
      });
    }
    return result;
  } catch {
    return [];
  }
}
