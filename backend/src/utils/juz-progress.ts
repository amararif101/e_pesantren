import { Database } from "bun:sqlite";
import path from "path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { tahfidzDeposits, tahfidzExams } from "../db/schema";

// Read-only connection to the same per-ayat Quran dataset used by
// /api/quran/calculate, so juz boundaries here match exactly what the
// daily input form shows the teacher.
const quranDb = new Database(path.join(process.cwd(), "data", "quran.db"), {
  readonly: true,
});

interface AyatInfo {
  id: number;
  jozz: number;
  sora: number;
  aya_no: number;
}

function getAyatInfo(sora: number, aya: number): AyatInfo | null {
  return quranDb
    .query(`SELECT id, jozz, sora, aya_no FROM quran WHERE sora = ? AND aya_no = ?`)
    .get(sora, aya) as AyatInfo | null;
}

// Returns the juz number if (sora, aya) is the very last ayat of that juz,
// otherwise null (i.e. the student is still mid-juz).
export function getJuzIfCompleted(
  sora: number | null | undefined,
  aya: number | null | undefined,
): number | null {
  if (!sora || !aya) return null;
  const info = getAyatInfo(sora, aya);
  if (!info) return null;
  const maxInJuz = quranDb
    .query(`SELECT MAX(id) as maxId FROM quran WHERE jozz = ?`)
    .get(info.jozz) as { maxId: number } | null;
  return maxInJuz && maxInJuz.maxId === info.id ? info.jozz : null;
}

// A student is blocked from new Taqdim (ziyadah) input when their most
// recent such deposit ends exactly at the last ayat of a juz and they have
// no passing UKJ exam recorded for that juz yet.
export async function checkJuzCompletionBlock(
  studentId: number,
): Promise<{ blocked: boolean; completedJuz: number | null }> {
  const lastDeposit = await db.query.tahfidzDeposits.findFirst({
    where: and(
      eq(tahfidzDeposits.studentId, studentId),
      eq(tahfidzDeposits.type, "ziyadah"),
    ),
    orderBy: [desc(tahfidzDeposits.depositDate), desc(tahfidzDeposits.id)],
  });

  const completedJuz = getJuzIfCompleted(
    lastDeposit?.endSurah,
    lastDeposit?.endAyat,
  );
  if (!completedJuz) {
    return { blocked: false, completedJuz: null };
  }

  const passedUKJ = await db.query.tahfidzExams.findFirst({
    where: and(
      eq(tahfidzExams.studentId, studentId),
      eq(tahfidzExams.examCategory, "UKJ"),
      eq(tahfidzExams.juz, completedJuz),
      eq(tahfidzExams.verdict, "pass"),
    ),
  });

  return passedUKJ
    ? { blocked: false, completedJuz: null }
    : { blocked: true, completedJuz };
}
