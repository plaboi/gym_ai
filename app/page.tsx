import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, workouts, userPreferences } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import AppShell from "@/components/app-shell";
import {
  getWorkoutHistoryForCalendar,
  getUserProfile,
  type WorkoutHistoryEntry,
} from "@/lib/actions";

async function getLastWorkoutTimestamp(
  clerkId: string
): Promise<string | null> {
  try {
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

async function getUserPreferencesContent(clerkId: string): Promise<string> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!user) return "";

    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);
    return rows[0]?.content ?? "";
  } catch {
    return "";
  }
}

export default async function Home() {
  const { userId } = await auth();
  const lastWorkoutAt = userId ? await getLastWorkoutTimestamp(userId) : null;
  const initialPreferences = userId
    ? await getUserPreferencesContent(userId)
    : "";
  const workoutHistory: WorkoutHistoryEntry[] = userId
    ? await getWorkoutHistoryForCalendar(userId)
    : [];
  const userProfile = userId ? await getUserProfile(userId) : null;

  return (
    <AppShell
      lastWorkoutAt={lastWorkoutAt}
      initialPreferences={initialPreferences}
      workoutHistory={workoutHistory}
      userProfile={userProfile}
    />
  );
}
