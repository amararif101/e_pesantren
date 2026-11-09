import { Database } from "bun:sqlite";
import path from "path";
import { and, desc, eq, lte, ne } from "drizzle-orm";
import { db } from "../db";
import { tahfidzDeposits, tahfidzExams } from "../db/schema";

// Read-only connection to the same per-ayat Quran dataset used by
// /api/quran/calculate, so juz boundaries here match exactly what the
// daily input form shows the teacher.
//
// Opened lazily and never let to throw at import time: this module is
// pulled in by tahfidz.ts, so a missing/unreadable quran.db here would
// otherwise crash the entire backend process at startup, not just the
// juz-completion check. If it fails to open, juz-block checks simply
// degrade to "not blocked" (see getAyatInfo / safeCheckJuzCompletionBlock).
let quranDb: Database | null = null;
try {
  quranDb = new Database(path.join(process.cwd(), "data", "quran.db"), {
    readonly: true,
  });
} catch (e) {
  console.error(
    "Failed to open quran.db - juz-completion checks will be disabled:",
    e,
  );
}

interface AyatInfo {
  id: number;
  jozz: number;
  sora: number;
  aya_no: number;
}

function getAyatInfo(sora: number, aya: number): AyatInfo | null {
  if (!quranDb) return null;
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
  if (!sora || !aya || !quranDb) return null;
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

  // UKJ has no pass/fail: any recorded UKJ for this juz unblocks Taqdim.
  const takenUKJ = await db.query.tahfidzExams.findFirst({
    where: and(
      eq(tahfidzExams.studentId, studentId),
      eq(tahfidzExams.examCategory, "UKJ"),
      eq(tahfidzExams.juz, completedJuz),
    ),
  });

  return takenUKJ
    ? { blocked: false, completedJuz: null }
    : { blocked: true, completedJuz };
}

function getJuz(sora: number | null | undefined, aya: number | null | undefined) {
  return sora && aya ? (getAyatInfo(sora, aya)?.jozz ?? null) : null;
}

// The exact-end block above only fires when a Taqdim stops precisely on the
// last ayat of a juz, so a deposit that runs past the boundary, or a new one
// started in another juz, slipped through without UKJ. This guard closes
// both: a Taqdim must stay inside one juz, and may only move to a different
// juz than the previous Taqdim once that previous juz has a UKJ record.
// Returns the rejection message, or null when allowed.
export async function checkJuzTransition(
  studentId: number,
  deposit: {
    startSurah?: number | null;
    startAyat?: number | null;
    endSurah?: number | null;
    endAyat?: number | null;
    depositDate: Date;
  },
  excludeDepositId?: number,
): Promise<string | null> {
  const startJuz = getJuz(deposit.startSurah, deposit.startAyat);
  const endJuz = getJuz(deposit.endSurah, deposit.endAyat);
  if (!startJuz || !endJuz) return null;

  if (startJuz !== endJuz) {
    return `Setoran Taqdim tidak boleh melewati batas juz (Juz ${startJuz} ke Juz ${endJuz}). Akhiri setoran di akhir Juz ${startJuz}, lalu ikuti UKJ Juz ${startJuz}.`;
  }

  const prev = await db.query.tahfidzDeposits.findFirst({
    where: and(
      eq(tahfidzDeposits.studentId, studentId),
      eq(tahfidzDeposits.type, "ziyadah"),
      lte(tahfidzDeposits.depositDate, deposit.depositDate),
      excludeDepositId ? ne(tahfidzDeposits.id, excludeDepositId) : undefined,
    ),
    orderBy: [desc(tahfidzDeposits.depositDate), desc(tahfidzDeposits.id)],
  });
  const prevJuz = getJuz(prev?.endSurah, prev?.endAyat);
  if (!prevJuz || prevJuz === startJuz) return null;

  const takenUKJ = await db.query.tahfidzExams.findFirst({
    where: and(
      eq(tahfidzExams.studentId, studentId),
      eq(tahfidzExams.examCategory, "UKJ"),
      eq(tahfidzExams.juz, prevJuz),
    ),
  });
  return takenUKJ
    ? null
    : `Santri belum mengikuti UKJ Juz ${prevJuz}. Setoran Taqdim di Juz ${startJuz} baru bisa diinput setelah UKJ Juz ${prevJuz} tercatat.`;
}

// checkJuzCompletionBlock() is called per-student inside Promise.all() for
// halaqah rosters and the monitoring dashboard - if quran.db is missing or
// unreadable (e.g. not deployed to the server), one failed lookup must not
// blank out the whole list for every other student. Defaults to "not
// blocked" on failure so data entry keeps working; the real error is logged
// for diagnosis instead of surfacing as a generic empty list.
export async function safeCheckJuzCompletionBlock(
  studentId: number,
): Promise<{ blocked: boolean; completedJuz: number | null }> {
  try {
    return await checkJuzCompletionBlock(studentId);
  } catch (e) {
    console.error(`checkJuzCompletionBlock failed for student ${studentId}:`, e);
    return { blocked: false, completedJuz: null };
  }
}
