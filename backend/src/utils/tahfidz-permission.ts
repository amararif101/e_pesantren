import { db } from "../db";
import { teachers, teacherDivisions, divisions } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

// Only admins and teachers in the "Tahfidz" division (head or member) may
// backdate tahfidz deposit input; regular halaqah mentors may only input
// for the current day.
export async function canBackdateTahfidzDeposit(
  userId: number,
  role: string,
): Promise<boolean> {
  if (role === "admin") return true;

  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.userId, userId),
  });
  if (!teacher) return false;

  const membership = await db
    .select({ id: teacherDivisions.id })
    .from(teacherDivisions)
    .innerJoin(divisions, eq(teacherDivisions.divisionId, divisions.id))
    .where(
      and(
        eq(teacherDivisions.teacherId, teacher.id),
        sql`LOWER(${divisions.name}) LIKE '%tahfidz%'`,
      ),
    )
    .limit(1);

  return membership.length > 0;
}

export function isDateBeforeToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  return check < today;
}
