import { eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db";
import { teachers, students, users } from "../db/schema";
import { clinicPatients } from "../db/schema/clinic";
import { halaqahMembers, halaqahMentors } from "../db/schema/halaqah";

export type GenderScope = "male" | "female" | null;

// Guru (role "teacher") may only see santri of their own gender. Admin and
// every other role are unrestricted (null = no restriction). Gender comes
// from the linked teacher record, falling back to the user account.
export async function getStudentGenderScope(
  userId: number,
  role: string,
): Promise<GenderScope> {
  if (role !== "teacher") return null;
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.userId, userId),
  });
  const gender =
    teacher?.gender ||
    (await db.query.users.findFirst({ where: eq(users.id, userId) }))?.gender;
  if (!gender) return null;
  const g = String(gender).toLowerCase();
  if (g === "male" || g === "l" || g === "laki-laki" || g === "ikhwan") return "male";
  if (g === "female" || g === "p" || g === "perempuan" || g === "akhwat") return "female";
  return null;
}

// For endpoints that can't add `eq(students.gender, scope)` directly to
// their query (e.g. filtering by a FK like studentId elsewhere), precompute
// the set of student ids the caller is allowed to see.
export async function getAllowedStudentIds(
  scope: GenderScope,
): Promise<number[] | null> {
  if (!scope) return null;
  const allowedGenders =
    scope === "male"
      ? ["male", "L", "Laki-laki", "Ikhwan", "l", "laki-laki", "ikhwan"]
      : ["female", "P", "Perempuan", "Akhwat", "p", "perempuan", "akhwat"];
  const rows = await db
    .select({ id: students.id })
    .from(students)
    .where(
      sql`(${inArray(students.gender, allowedGenders as any)} OR ${students.gender} IS NULL)`,
    );
  return rows.map((r) => r.id);
}

// For single-student detail endpoints: true if the caller may view this student.
export function isStudentGenderAllowed(
  studentGender: string | null | undefined,
  scope: GenderScope,
): boolean {
  if (!scope) return true;
  if (!studentGender) return true;
  const s = String(studentGender).toLowerCase();
  if (scope === "male") {
    return s === "male" || s === "l" || s === "laki-laki" || s === "ikhwan";
  }
  return s === "female" || s === "p" || s === "perempuan" || s === "akhwat";
}

// Single-student access guard: pass a studentId to fetch-and-check, or the
// student's gender directly if already fetched (avoids a duplicate query).
// Returns a 403 Response to `return` from the route, or null if allowed.
export async function requireStudentGenderAccess(
  c: Context,
  studentIdOrGender: number | string | null | undefined,
): Promise<Response | null> {
  const user = c.get("user");
  const scope = await getStudentGenderScope(user.userId, user.role);
  if (!scope) return null;

  const gender =
    typeof studentIdOrGender === "number"
      ? (
          await db.query.students.findFirst({
            where: eq(students.id, studentIdOrGender),
          })
        )?.gender
      : studentIdOrGender;

  if (isStudentGenderAllowed(gender, scope)) return null;
  return c.json({ success: false, message: "Forbidden" }, 403);
}

// Halaqah visibility for a gender-scoped guru (null = unrestricted).
// - Halaqah the guru mentors keep their full roster: that membership is an
//   administrative assignment (see the 2026-09-20 VPS roster fix).
// - Elsewhere only same-gender santri are shown, and a halaqah whose santri
//   are all of the opposite gender is hidden entirely. Empty halaqah stay
//   visible (nothing to leak, and PJ may still be filling them).
export async function getHalaqahGenderAccess(userId: number, role: string) {
  const scope = await getStudentGenderScope(userId, role);
  if (!scope) return null;

  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.userId, userId),
  });
  const mentored = new Set(
    teacher
      ? (
          await db
            .select({ id: halaqahMentors.halaqahId })
            .from(halaqahMentors)
            .where(eq(halaqahMentors.teacherId, teacher.id))
        ).map((r) => r.id)
      : [],
  );
  const memberships = await db
    .select({ halaqahId: halaqahMembers.halaqahId, gender: students.gender })
    .from(halaqahMembers)
    .innerJoin(students, eq(halaqahMembers.studentId, students.id));
  const withMembers = new Set<number>();
  const withAllowed = new Set<number>();
  for (const m of memberships) {
    withMembers.add(m.halaqahId);
    if (isStudentGenderAllowed(m.gender, scope)) withAllowed.add(m.halaqahId);
  }

  return {
    canSeeHalaqah: (halaqahId: number) =>
      mentored.has(halaqahId) ||
      withAllowed.has(halaqahId) ||
      !withMembers.has(halaqahId),
    canSeeMember: (halaqahId: number, studentGender: string | null | undefined) =>
      mentored.has(halaqahId) || isStudentGenderAllowed(studentGender, scope),
  };
}

// clinicPatients.gender uses "L"/"P" instead of "male"/"female".
export function toClinicGender(scope: GenderScope): "L" | "P" | null {
  return scope === "male" ? "L" : scope === "female" ? "P" : null;
}

// Restricts clinicPatients rows to the caller's gender for type="student"
// rows only; teacher/external rows are left untouched by this restriction.
export function clinicStudentGenderSql(scope: GenderScope): SQL | undefined {
  const clinicGender = toClinicGender(scope);
  if (!clinicGender) return undefined;
  return sql`(${clinicPatients.type} != 'student' OR ${clinicPatients.gender} = ${clinicGender})`;
}
