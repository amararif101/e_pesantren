import { Hono } from "hono";
import * as XLSX from "xlsx";
import { db } from "../db";
import {
  tahfidzDeposits,
  tahfidzExams,
  tahfidzTargets,
  students,
  teachers,
  halaqahMembers,
  halaqahGroups,
  halaqahMentors,
  tahfidzReportSettings,
  tahfidzReportCards,
  tahfidzExamTypes,
  classHomeroomTeachers,
  settings,
  classes,
  rooms,
  teacherAttendances,
  healthExaminations,
  studentLeaves,
  studentLeaveItems,
} from "../db/schema";
import {
  getStudentGenderScope,
  getAllowedStudentIds,
  requireStudentGenderAccess,
  isStudentGenderAllowed,
} from "../utils/gender-scope";
import {
  eq,
  desc,
  and,
  gte,
  lte,
  sql,
  inArray,
  like,
  or,
  asc,
} from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getJuzFromPage, getJuzFromSurah } from "../utils/quran-mapping";
import { checkJuzCompletionBlock, safeCheckJuzCompletionBlock, getJuzIfCompleted } from "../utils/juz-progress";
import { canBackdateTahfidzDeposit, isDateBeforeToday } from "../utils/tahfidz-permission";
import { authMiddleware, requirePermission } from "../middleware/auth";
import {
  assertAcademicPeriodWritable,
  assertDateInWritableAcademicPeriod,
  buildTahfidzReportSnapshotPayload,
  createOrUpdateReportSnapshot,
  normalizeSemester,
  writeAuditLog,
} from "../utils/academic-periods";

function academicPeriodGuardErrorResponse(c: any, error: any) {
  if (error?.statusCode === 409) {
    return c.json(
      {
        success: false,
        message: error.message,
        periodStatus: error.periodStatus,
      },
      409,
    );
  }
  return null;
}

const app = new Hono();

// Apply auth to all routes
app.use("*", authMiddleware);

// --- Schemas ---
const depositSchema = z.object({
  studentId: z.number(),
  teacherId: z.number(),
  type: z.enum(["ziyadah", "murajaah", "sabqi", "manzil", "izin", "alpha", "sakit", "tidak_setor"]),
  isLate: z.boolean().optional(),
  isCompleted: z.boolean().nullable().optional(),
  // New line-based position fields
  startSurah: z.number().nullable().optional(),
  startAyat: z.number().nullable().optional(),
  startPage: z.number().nullable().optional(),
  endSurah: z.number().nullable().optional(),
  endAyat: z.number().nullable().optional(),
  endPage: z.number().nullable().optional(),
  totalLines: z.number().nullable().optional(),
  totalPages: z.number().nullable().optional(),
  // Legacy fields (kept for backward compatibility)
  juz: z.number().nullable().optional(),
  surahNumber: z.number().nullable().optional(),
  surahName: z.string().nullable().optional(),
  ayatStart: z.number().nullable().optional(),
  ayatEnd: z.number().nullable().optional(),
  pageNumber: z.number().nullable().optional(),
  // Other
  fluency: z.enum(["A", "B", "C"]).optional(),
  notes: z.string().optional(),
  depositDate: z.string().optional(),
});

const examSchema = z.object({
  studentId: z.number(),
  examinerId: z.number(),
  examType: z.string(),
  examCategory: z
    .enum(["UPK", "UKJ", "UA", "Suluk", "Jilsah", "Sertifikasi", "Other"])
    .optional(),
  // New filtering fields
  academicYear: z.string().optional(),
  semester: z.enum(["1", "2", "ganjil", "genap"]).optional(),

  examDate: z.string(),
  juz: z.number().nullable().optional(),
  startPage: z.number().nullable().optional(),
  endPage: z.number().nullable().optional(),
  scoreFluency: z.number().optional(),
  scoreTajwid: z.number().optional(),
  scoreMakhraj: z.number().optional(),
  scoreAdab: z.number().optional(),
  // UPK & UKJ & UA
  nilai1: z.number().nullable().optional(),
  nilai2: z.number().nullable().optional(),
  nilai3: z.number().nullable().optional(),
  nilai4: z.number().nullable().optional(),
  nilai5: z.number().nullable().optional(),
  nilai6: z.number().nullable().optional(),
  nilai7: z.number().nullable().optional(),
  nilai8: z.number().nullable().optional(),
  nilai9: z.number().nullable().optional(),
  // UPK & UA
  capaianTargetPages: z.number().nullable().optional(),
  capaianTargetScore: z.number().nullable().optional(),
  // Jilsah & Sertifikasi
  khotoJaliCount: z.number().nullable().optional(),
  khotoKhofiCount: z.number().nullable().optional(),
  finalScore: z.number(),
  verdict: z.enum(["pass", "fail", "conditional"]),
  notes: z.string().optional(),
});

const reportCardPublishSchema = z.object({
  academicYear: z.string().min(1),
  semester: z.enum(["1", "2", "ganjil", "genap"]),
  notes: z.string().optional(),
  result: z.string().optional(),
  sickCount: z.number().int().min(0).optional(),
  permissionCount: z.number().int().min(0).optional(),
  alphaCount: z.number().int().min(0).optional(),
});

// --- Routes ---

// GET /stats - Dashboard Stats
app.get("/stats", async (c) => {
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const halaqahId = c.req.query("halaqahId");
  const gender = c.req.query("gender");

  try {
    const conditions: any[] = [];

    if (startDate) {
      conditions.push(gte(tahfidzDeposits.depositDate, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(sql`DATE(${tahfidzDeposits.depositDate}) <= ${endDate}`);
    }

    if (gender) {
      conditions.push(eq(students.gender, gender as "male" | "female"));
    }

    if (halaqahId) {
      conditions.push(eq(halaqahMembers.halaqahId, Number(halaqahId)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Helper to build base query with joins if needed
    // We strictly need joins only if filtering by gender or halaqah
    // But for simplicity/consistency, let's always join if no perf hit
    const buildQuery = () => {
      const query = db
        .select({ count: sql<number>`count(*)` })
        .from(tahfidzDeposits)
        .leftJoin(students, eq(tahfidzDeposits.studentId, students.id))
        .leftJoin(
          halaqahMembers,
          and(
            eq(tahfidzDeposits.studentId, halaqahMembers.studentId),
            eq(halaqahMembers.status, "active"),
          ),
        );

      if (whereClause) {
        query.where(whereClause);
      }
      return query;
    };

    // Total deposits count
    const [totalDepositsResult] = await buildQuery();

    // Total students with at least 1 deposit (in the filtered range)
    const activeStudentsQuery = db
      .select({
        count: sql<number>`count(distinct ${tahfidzDeposits.studentId})`,
      })
      .from(tahfidzDeposits)
      .leftJoin(students, eq(tahfidzDeposits.studentId, students.id))
      .leftJoin(
        halaqahMembers,
        and(
          eq(tahfidzDeposits.studentId, halaqahMembers.studentId),
          eq(halaqahMembers.status, "active"),
        ),
      );

    if (whereClause) {
      activeStudentsQuery.where(whereClause);
    }

    const [activeStudentsResult] = await activeStudentsQuery;

    return c.json({
      success: true,
      data: {
        totalDeposits: totalDepositsResult?.count || 0,
        activeStudents: activeStudentsResult?.count || 0,
      },
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /deposits - History
app.get("/deposits", async (c) => {
  const studentId = c.req.query("studentId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const halaqahId = c.req.query("halaqahId");
  const gender = c.req.query("gender"); // male | female

  try {
    let query = db
      .select({
        id: tahfidzDeposits.id,
        studentId: tahfidzDeposits.studentId,
        date: tahfidzDeposits.depositDate,
        type: tahfidzDeposits.type,
        isCompleted: tahfidzDeposits.isCompleted,
        surah: tahfidzDeposits.surahName,
        ayatStart: tahfidzDeposits.ayatStart,
        ayatEnd: tahfidzDeposits.ayatEnd,
        // New line-based fields
        startSurah: tahfidzDeposits.startSurah,
        startAyat: tahfidzDeposits.startAyat,
        endSurah: tahfidzDeposits.endSurah,
        endAyat: tahfidzDeposits.endAyat,
        totalLines: tahfidzDeposits.totalLines,
        totalPages: tahfidzDeposits.totalPages,
        // Legacy
        juz: tahfidzDeposits.juz,
        fluency: tahfidzDeposits.fluency,
        notes: tahfidzDeposits.notes,
        studentName: students.fullName,
        teacherName: teachers.fullName,
        teacherNip: teachers.nip,
        className: classes.name,
        roomName: rooms.name,
        halaqahName: halaqahGroups.name,
      })
      .from(tahfidzDeposits)
      .leftJoin(students, eq(tahfidzDeposits.studentId, students.id))
      .leftJoin(teachers, eq(tahfidzDeposits.teacherId, teachers.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(rooms, eq(students.roomId, rooms.id))
      // Join with halaqahMembers if filtering by halaqah
      .leftJoin(
        halaqahMembers,
        and(
          eq(tahfidzDeposits.studentId, halaqahMembers.studentId),
          eq(halaqahMembers.status, "active"), // Only active members? Maybe not strictly needed if we want history
        ),
      )
      .leftJoin(halaqahGroups, eq(halaqahMembers.halaqahId, halaqahGroups.id))
      .orderBy(desc(tahfidzDeposits.depositDate));

    const page = Number(c.req.query("page") || 1);
    const limit = Number(c.req.query("limit") || 10);
    const offset = (page - 1) * limit;
    const search = c.req.query("search");

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(students.fullName, `%${search}%`),
          like(students.nis, `%${search}%`),
        ),
      );
    }

    if (studentId) {
      conditions.push(eq(tahfidzDeposits.studentId, Number(studentId)));
    }

    if (startDate) {
      conditions.push(gte(tahfidzDeposits.depositDate, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(sql`DATE(${tahfidzDeposits.depositDate}) <= ${endDate}`);
    }

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    if (genderScope) {
      // Guru only sees their own gender, regardless of the requested filter
      conditions.push(eq(students.gender, genderScope));
    } else if (gender) {
      conditions.push(eq(students.gender, gender as "male" | "female"));
    }

    if (halaqahId) {
      conditions.push(eq(halaqahMembers.halaqahId, Number(halaqahId)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Get Total Count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tahfidzDeposits)
      .leftJoin(students, eq(tahfidzDeposits.studentId, students.id))
      .leftJoin(teachers, eq(tahfidzDeposits.teacherId, teachers.id))
      .leftJoin(
        halaqahMembers,
        and(
          eq(tahfidzDeposits.studentId, halaqahMembers.studentId),
          eq(halaqahMembers.status, "active"),
        ),
      )
      .where(whereClause);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // 2. Get Data
    if (whereClause) {
      query.where(whereClause);
    }

    const data = await query.limit(limit).offset(offset);

    return c.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// POST /deposits - Create
app.post("/deposits", zValidator("json", depositSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const depositDate = body.depositDate ? new Date(body.depositDate) : new Date();

    if (isDateBeforeToday(depositDate)) {
      const user = c.get("user");
      const allowed = await canBackdateTahfidzDeposit(user.userId, user.role);
      if (!allowed) {
        return c.json(
          {
            success: false,
            message:
              "Pengampu halaqoh hanya dapat menginput setoran untuk hari ini. Input untuk hari sebelumnya hanya dapat dilakukan oleh Kepala Divisi atau anggota Divisi Tahfidz.",
          },
          403,
        );
      }
    }

    await assertDateInWritableAcademicPeriod(
      depositDate,
      "mencatat setoran tahfidz",
    );

    // Taqdim (ziyadah) is blocked once the student has finished a juz until
    // they pass the UKJ exam for it.
    if (body.type === "ziyadah") {
      const juzBlock = await safeCheckJuzCompletionBlock(body.studentId);
      if (juzBlock.blocked) {
        return c.json(
          {
            success: false,
            message: `Santri harus mengikuti dan lulus Ujian Kenaikan Juz (UKJ) untuk Juz ${juzBlock.completedJuz} sebelum bisa melanjutkan setoran Taqdim.`,
            juzBlocked: juzBlock.completedJuz,
          },
          400,
        );
      }
    }

    await db.insert(tahfidzDeposits).values({
      studentId: body.studentId,
      teacherId: body.teacherId,
      type: body.type,
      isLate: body.isLate || false,
      isCompleted: body.isCompleted ?? null,
      // New line-based fields
      startSurah: body.startSurah ?? null,
      startAyat: body.startAyat ?? null,
      startPage: body.startPage ?? null,
      endSurah: body.endSurah ?? null,
      endAyat: body.endAyat ?? null,
      endPage: body.endPage ?? null,
      totalLines: body.totalLines ?? null,
      totalPages: body.totalPages ? String(body.totalPages) : null,
      // Legacy fields
      juz: body.juz ?? null,
      surahNumber: body.surahNumber ?? null,
      surahName: body.surahName ?? null,
      ayatStart: body.ayatStart ?? null,
      ayatEnd: body.ayatEnd ?? null,
      pageNumber: body.pageNumber ?? null,
      // Other
      fluency: body.fluency ?? null,
      notes: body.notes ?? null,
      depositDate,
    });

    const juzCompleted =
      body.type === "ziyadah"
        ? getJuzIfCompleted(body.endSurah, body.endAyat)
        : null;

    return c.json({
      success: true,
      message: "Setoran berhasil dicatat",
      juzCompleted,
    });
  } catch (e: any) {
    const guardResponse = academicPeriodGuardErrorResponse(c, e);
    if (guardResponse) return guardResponse;

    const isForeignKeyError =
      e.code === "ER_NO_REFERENCED_ROW_2" ||
      e?.cause?.code === "ER_NO_REFERENCED_ROW_2" ||
      (e.message && e.message.includes("ER_NO_REFERENCED_ROW_2")) ||
      (e.message && e.message.includes("a foreign key constraint fails"));

    if (isForeignKeyError) {
      return c.json(
        {
          success: false,
          message:
            "Data santri atau guru tidak valid atau sudah dihapus. Silakan muat ulang halaman.",
        },
        400,
      );
    }
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// PUT /deposits/:id - Update
app.put("/deposits/:id", zValidator("json", depositSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = c.req.valid("json");
  try {
    const existing = await db.query.tahfidzDeposits.findFirst({
      where: eq(tahfidzDeposits.id, id),
    });

    if (!existing) {
      return c.json({ success: false, message: "Data setoran tidak ditemukan" }, 404);
    }

    await assertDateInWritableAcademicPeriod(
      existing.depositDate,
      "mengubah setoran tahfidz",
    );
    const depositDate = body.depositDate ? new Date(body.depositDate) : new Date();

    if (isDateBeforeToday(depositDate)) {
      const user = c.get("user");
      const allowed = await canBackdateTahfidzDeposit(user.userId, user.role);
      if (!allowed) {
        return c.json(
          {
            success: false,
            message:
              "Pengampu halaqoh hanya dapat mengubah setoran untuk hari ini. Perubahan untuk hari sebelumnya hanya dapat dilakukan oleh Kepala Divisi atau anggota Divisi Tahfidz.",
          },
          403,
        );
      }
    }

    await assertDateInWritableAcademicPeriod(
      depositDate,
      "mengubah setoran tahfidz",
    );

    await db
      .update(tahfidzDeposits)
      .set({
        studentId: body.studentId,
        teacherId: body.teacherId,
        type: body.type,
        isLate: body.isLate || false,
        isCompleted: body.isCompleted ?? null,
        // New line-based fields
        startSurah: body.startSurah ?? null,
        startAyat: body.startAyat ?? null,
        startPage: body.startPage ?? null,
        endSurah: body.endSurah ?? null,
        endAyat: body.endAyat ?? null,
        endPage: body.endPage ?? null,
        totalLines: body.totalLines ?? null,
        totalPages: body.totalPages ? String(body.totalPages) : null,
        // Legacy fields
        juz: body.juz ?? null,
        surahNumber: body.surahNumber ?? null,
        surahName: body.surahName ?? null,
        ayatStart: body.ayatStart ?? null,
        ayatEnd: body.ayatEnd ?? null,
        pageNumber: body.pageNumber ?? null,
        // Other
        fluency: body.fluency ?? null,
        notes: body.notes ?? null,
        depositDate,
        updatedAt: new Date(),
      })
      .where(eq(tahfidzDeposits.id, id));

    return c.json({ success: true, message: "Setoran berhasil diperbarui" });
  } catch (e: any) {
    const guardResponse = academicPeriodGuardErrorResponse(c, e);
    if (guardResponse) return guardResponse;

    const isForeignKeyError =
      e.code === "ER_NO_REFERENCED_ROW_2" ||
      e?.cause?.code === "ER_NO_REFERENCED_ROW_2" ||
      (e.message && e.message.includes("ER_NO_REFERENCED_ROW_2")) ||
      (e.message && e.message.includes("a foreign key constraint fails"));

    if (isForeignKeyError) {
      return c.json(
        {
          success: false,
          message:
            "Data santri atau guru tidak valid atau sudah dihapus. Silakan muat ulang halaman.",
        },
        400,
      );
    }
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// DELETE /deposits/:id - Delete
app.delete("/deposits/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  try {
    const existing = await db.query.tahfidzDeposits.findFirst({
      where: eq(tahfidzDeposits.id, id),
    });

    if (!existing) {
      return c.json({ success: false, message: "Data setoran tidak ditemukan" }, 404);
    }

    await assertDateInWritableAcademicPeriod(
      existing.depositDate,
      "menghapus setoran tahfidz",
    );

    await db.delete(tahfidzDeposits).where(eq(tahfidzDeposits.id, id));
    return c.json({ success: true, message: "Data setoran berhasil dihapus" });
  } catch (e: any) {
    const guardResponse = academicPeriodGuardErrorResponse(c, e);
    if (guardResponse) return guardResponse;

    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /exams
app.get("/exams", async (c) => {
  const page = Number(c.req.query("page") || 1);
  const limit = Number(c.req.query("limit") || 10);
  const offset = (page - 1) * limit;

  const studentId = c.req.query("studentId");
  const search = c.req.query("search");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const verdict = c.req.query("verdict");
  const gender = c.req.query("gender");
  const examinerId = c.req.query("examinerId");
  const academicYear = c.req.query("academicYear");
  const semester = c.req.query("semester");
  const classId = c.req.query("classId");
  const halaqahId = c.req.query("halaqahId");

  try {
    const conditions: any[] = [];

    if (studentId)
      conditions.push(eq(tahfidzExams.studentId, Number(studentId)));
    if (search) {
      conditions.push(
        or(
          like(students.fullName, `%${search}%`),
          like(students.nis, `%${search}%`),
        ),
      );
    }
    if (startDate)
      conditions.push(gte(tahfidzExams.examDate, new Date(startDate)));
    if (endDate)
      conditions.push(sql`DATE(${tahfidzExams.examDate}) <= ${endDate}`);
    if (verdict) conditions.push(eq(tahfidzExams.verdict, verdict as any));
    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    if (genderScope) {
      // Guru only sees their own gender, regardless of the requested filter
      conditions.push(eq(students.gender, genderScope));
    } else if (gender) {
      conditions.push(eq(students.gender, gender as any));
    }
    if (examinerId)
      conditions.push(eq(tahfidzExams.examinerId, Number(examinerId)));
    if (academicYear)
      conditions.push(eq(tahfidzExams.academicYear, academicYear));
    if (semester) conditions.push(eq(tahfidzExams.semester, semester as any));

    // New Filters
    if (classId) conditions.push(eq(students.classId, Number(classId)));
    if (halaqahId)
      conditions.push(eq(halaqahMembers.halaqahId, Number(halaqahId)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Get Total Count
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(tahfidzExams)
      .leftJoin(students, eq(tahfidzExams.studentId, students.id));

    if (halaqahId) {
      countQuery.leftJoin(
        halaqahMembers,
        and(
          eq(tahfidzExams.studentId, halaqahMembers.studentId),
          eq(halaqahMembers.status, "active"),
        ),
      );
    }

    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);

    // 2. Get Data
    // Need to change `const dataQuery` to `let dataQuery` at line 456 first? Or just restructure.
    // Better to restructure.
    let dataQuery = db
      .select({
        id: tahfidzExams.id,
        date: tahfidzExams.examDate,
        type: tahfidzExams.examType,
        finalScore: tahfidzExams.finalScore,
        verdict: tahfidzExams.verdict,
        studentName: students.fullName,
        examinerName: teachers.fullName,
        // Detailed fields for Edit
        studentId: tahfidzExams.studentId,
        examinerId: tahfidzExams.examinerId,
        scoreFluency: tahfidzExams.scoreFluency,
        scoreTajwid: tahfidzExams.scoreTajwid,
        scoreMakhraj: tahfidzExams.scoreMakhraj,
        scoreAdab: tahfidzExams.scoreAdab,
        nilai1: tahfidzExams.nilai1,
        nilai2: tahfidzExams.nilai2,
        nilai3: tahfidzExams.nilai3,
        nilai4: tahfidzExams.nilai4,
        nilai5: tahfidzExams.nilai5,
        nilai6: tahfidzExams.nilai6,
        nilai7: tahfidzExams.nilai7,
        nilai8: tahfidzExams.nilai8,
        nilai9: tahfidzExams.nilai9,
        capaianTargetPages: tahfidzExams.capaianTargetPages,
        capaianTargetScore: tahfidzExams.capaianTargetScore,
        khotoJaliCount: tahfidzExams.khotoJaliCount,
        khotoKhofiCount: tahfidzExams.khotoKhofiCount,
        notes: tahfidzExams.notes,
        juz: tahfidzExams.juz,
        startPage: tahfidzExams.startPage,
        endPage: tahfidzExams.endPage,
        academicYear: tahfidzExams.academicYear,
        semester: tahfidzExams.semester,
      })
      .from(tahfidzExams)
      .leftJoin(students, eq(tahfidzExams.studentId, students.id));

    if (halaqahId) {
      dataQuery.leftJoin(
        halaqahMembers,
        and(
          eq(tahfidzExams.studentId, halaqahMembers.studentId),
          eq(halaqahMembers.status, "active"),
        ),
      );
    }

    dataQuery
      .leftJoin(teachers, eq(tahfidzExams.examinerId, teachers.id))
      .orderBy(desc(tahfidzExams.examDate))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      dataQuery.where(whereClause);
    }

    const data = await dataQuery;

    return c.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// POST /exams
app.post("/exams", zValidator("json", examSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    if (body.academicYear && body.semester) {
      await assertAcademicPeriodWritable(
        body.academicYear,
        body.semester,
        "menyimpan ujian tahfidz",
      );
    } else {
      await assertDateInWritableAcademicPeriod(
        body.examDate,
        "menyimpan ujian tahfidz",
      );
    }

    // For Suluk and UA, check for duplicate (one per student per semester per academic year)
    if (body.examCategory === "Suluk" || body.examCategory === "UA") {
      const existing = await db.query.tahfidzExams.findFirst({
        where: and(
          eq(tahfidzExams.studentId, body.studentId),
          eq(tahfidzExams.examCategory, body.examCategory),
          eq(tahfidzExams.academicYear, body.academicYear || ""),
          eq(tahfidzExams.semester, body.semester || "ganjil"),
        ),
      });

      if (existing) {
        const categoryLabel =
          body.examCategory === "Suluk" ? "Suluk" : "Ujian Akhir";
        return c.json(
          {
            success: false,
            message: `Data ${categoryLabel} untuk siswa ini di semester dan tahun pelajaran yang sama sudah ada. Silakan edit data yang sudah ada.`,
          },
          400,
        );
      }
    }

    await db.insert(tahfidzExams).values({
      ...body,
      examDate: new Date(body.examDate),
    });
    return c.json({ success: true, message: "Nilai ujian berhasil disimpan" });
  } catch (e: any) {
    const guardResponse = academicPeriodGuardErrorResponse(c, e);
    if (guardResponse) return guardResponse;

    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// PUT /exams/:id - Update
app.put("/exams/:id", zValidator("json", examSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = c.req.valid("json");
  try {
    const existing = await db.query.tahfidzExams.findFirst({
      where: eq(tahfidzExams.id, id),
    });

    if (!existing) {
      return c.json({ success: false, message: "Data ujian tidak ditemukan" }, 404);
    }

    if (existing.academicYear && existing.semester) {
      await assertAcademicPeriodWritable(
        existing.academicYear,
        existing.semester,
        "mengubah ujian tahfidz",
      );
    } else {
      await assertDateInWritableAcademicPeriod(
        existing.examDate,
        "mengubah ujian tahfidz",
      );
    }

    if (body.academicYear && body.semester) {
      await assertAcademicPeriodWritable(
        body.academicYear,
        body.semester,
        "mengubah ujian tahfidz",
      );
    } else {
      await assertDateInWritableAcademicPeriod(
        body.examDate,
        "mengubah ujian tahfidz",
      );
    }

    await db
      .update(tahfidzExams)
      .set({
        ...body,
        examDate: new Date(body.examDate),
        updatedAt: new Date(),
      })
      .where(eq(tahfidzExams.id, id));

    return c.json({
      success: true,
      message: "Nilai ujian berhasil diperbarui",
    });
  } catch (e: any) {
    const guardResponse = academicPeriodGuardErrorResponse(c, e);
    if (guardResponse) return guardResponse;

    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /capaian-target/:studentId - Halaman dihafal vs target, dipakai untuk
// komponen "Capaian Target" di penilaian Ujian Pekanan (UPK, window 2 pekan)
// dan Ujian Akhir (UA, window 1 semester berjalan)
app.get("/capaian-target/:studentId", async (c) => {
  const studentId = parseInt(c.req.param("studentId"));
  const examDateStr = c.req.query("examDate") || new Date().toISOString().split("T")[0];
  const maxScore = Number(c.req.query("maxScore")) || 30; // UPK: 30, UA: 10
  const category = c.req.query("category"); // "UA" => window 1 semester

  try {
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
      with: { class: true },
    });

    if (!student) {
      return c.json({ success: false, message: "Santri tidak ditemukan" }, 404);
    }

    const denied = await requireStudentGenderAccess(c, student.gender);
    if (denied) return denied;

    const halaqahMember = await db.query.halaqahMembers.findFirst({
      where: and(
        eq(halaqahMembers.studentId, studentId),
        eq(halaqahMembers.status, "active"),
      ),
      with: { halaqah: true },
    });

    // Target lookup (same priority as report-card): halaqah level link, then
    // class/grade name matching, then first available target as fallback.
    const allTargets = await db.select().from(tahfidzTargets);
    let target = null as (typeof allTargets)[number] | null;

    if (halaqahMember?.halaqah && (halaqahMember.halaqah as any).targetLevelId) {
      const tId = (halaqahMember.halaqah as any).targetLevelId;
      target = allTargets.find((t) => t.id === tId) || null;
    }

    if (!target && student.class?.name) {
      const className = student.class.name.toUpperCase();
      const exactMatch = allTargets.find((t) =>
        className.includes(t.level.toUpperCase()),
      );
      if (exactMatch) target = exactMatch;
      else if (
        className.includes("SMP") ||
        className.includes("7") ||
        className.includes("8") ||
        className.includes("9")
      ) {
        let match = allTargets.find((t) => t.level === "SMP");
        if (!match && className.includes("7"))
          match = allTargets.find((t) => t.level === "1");
        if (!match && className.includes("8"))
          match = allTargets.find((t) => t.level === "2");
        if (!match && className.includes("9"))
          match = allTargets.find((t) => t.level === "3");
        target = match || target;
      } else if (
        className.includes("SMA") ||
        className.includes("ALIYAH") ||
        className.includes("10") ||
        className.includes("11") ||
        className.includes("12")
      ) {
        let match = allTargets.find((t) => t.level === "SMA");
        if (!match && className.includes("10"))
          match = allTargets.find((t) => t.level === "1");
        target = match || target;
      }
    }

    if (!target) target = allTargets[0] || ({ targetPages: 50, level: "Default" } as any);

    const baseTargetPages = target.targetPages || 50;
    const examDate = new Date(examDateStr);

    let targetPages: number;
    let startWindow: Date;

    if (category === "UA") {
      // UA: window 1 semester berjalan (Jul-Des atau Jan-Jun) s.d. examDate,
      // target = target bulanan x 6 bulan (sama seperti perhitungan report-card)
      const isGenapSemester = examDate.getMonth() < 6; // Jan(0)-Jun(5)
      startWindow = isGenapSemester
        ? new Date(examDate.getFullYear(), 0, 1)
        : new Date(examDate.getFullYear(), 6, 1);
      targetPages = baseTargetPages * 6;
    } else {
      // UPK: window 14 hari terakhir s.d. examDate
      startWindow = new Date(examDate);
      startWindow.setDate(startWindow.getDate() - 13);
      targetPages = baseTargetPages;
    }

    const recentDeposits = await db
      .select({ totalPages: tahfidzDeposits.totalPages })
      .from(tahfidzDeposits)
      .where(
        and(
          eq(tahfidzDeposits.studentId, studentId),
          eq(tahfidzDeposits.type, "ziyadah"),
          sql`DATE(${tahfidzDeposits.depositDate}) >= ${startWindow.toISOString().split("T")[0]}`,
          sql`DATE(${tahfidzDeposits.depositDate}) <= ${examDateStr}`,
        ),
      );

    const achievedPages = recentDeposits.reduce(
      (sum, d) => sum + (Number(d.totalPages) || 0),
      0,
    );

    const capaianTargetScore = Math.round(
      Math.min(achievedPages / targetPages, 1) * maxScore * 100,
    ) / 100;

    return c.json({
      success: true,
      data: {
        achievedPages,
        targetPages,
        capaianTargetScore,
      },
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// DELETE /exams/:id - Delete
app.delete("/exams/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  try {
    const existing = await db.query.tahfidzExams.findFirst({
      where: eq(tahfidzExams.id, id),
    });

    if (!existing) {
      return c.json({ success: false, message: "Data ujian tidak ditemukan" }, 404);
    }

    if (existing.academicYear && existing.semester) {
      await assertAcademicPeriodWritable(
        existing.academicYear,
        existing.semester,
        "menghapus ujian tahfidz",
      );
    } else {
      await assertDateInWritableAcademicPeriod(
        existing.examDate,
        "menghapus ujian tahfidz",
      );
    }

    await db.delete(tahfidzExams).where(eq(tahfidzExams.id, id));
    return c.json({ success: true, message: "Data ujian berhasil dihapus" });
  } catch (e: any) {
    const guardResponse = academicPeriodGuardErrorResponse(c, e);
    if (guardResponse) return guardResponse;

    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /halaqah/:groupId/daily-summary
app.get("/halaqah/:groupId/daily-summary", async (c) => {
  try {
    const groupId = parseInt(c.req.param("groupId"));
    const dateStr =
      c.req.query("date") || new Date().toISOString().split("T")[0];

    // 1. Get all students in the halaqah group
    const members = await db.query.halaqahMembers.findMany({
      where: eq(halaqahMembers.halaqahId, groupId),
      with: {
        student: true,
      },
    });

    if (!members.length) {
      return c.json({ success: true, data: [] });
    }

    // Filter members: ensure student record exists
    const validMembers = members.filter((m) => m.student != null);

    if (!validMembers.length) {
      return c.json({ success: true, data: [] });
    }

    const studentIds = validMembers.map((m) => m.studentId);

    // 2. Get deposits for these students on the specific date
    const startStr = `${dateStr} 00:00:00`;
    const endStr = `${dateStr} 23:59:59`;
    const deposits = await db
      .select()
      .from(tahfidzDeposits)
      .where(
        and(
          inArray(tahfidzDeposits.studentId, studentIds),
          sql`${tahfidzDeposits.depositDate} >= ${startStr}`,
          sql`${tahfidzDeposits.depositDate} <= ${endStr}`,
        ),
      );

    // 3. Map students to their status
    // Taqdim (ziyadah), Sabqi, and Manzil are independent per day: a student
    // can have all three on the same date. Izin/Alpha/Sakit/Tidak Setor are
    // day-level exceptions (a student marked absent normally won't also have
    // a hafalan entry that day).
    const summary = await Promise.all(
      validMembers.map(async (m) => {
        const studentDeposits = deposits.filter(
          (d) => d.studentId === m.studentId,
        );
        const exceptionDeposit = studentDeposits.find((d) =>
          ["izin", "alpha", "sakit", "tidak_setor"].includes(d.type),
        );
        const juzBlock = await safeCheckJuzCompletionBlock(m.studentId);

        return {
          student: {
            id: m.student.id,
            name: m.student.fullName,
            nis: m.student.nis,
            avatar: m.student.photo,
          },
          status: exceptionDeposit
            ? exceptionDeposit.type
            : studentDeposits.length > 0
              ? "done"
              : "none",
          deposits: studentDeposits,
          juzBlock,
        };
      }),
    );

    return c.json({
      success: true,
      data: summary,
      meta: {
        date: dateStr,
        totalStudents: validMembers.length,
        totalDone: deposits.length,
      },
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /monitoring-dashboard - school-wide daily/monthly monitoring for the
// tahfidz division: mentor attendance, sick/permission counts, per-type
// (Ziyadah/Sabqi/Manzil) non-submission tracking, achievement totals,
// at-risk students, per-halaqah summary, UKJ-blocked count, 30-day trend,
// and a monthly leaderboard.
app.get("/monitoring-dashboard", requirePermission("/apps/tahfidz/monitoring"), async (c) => {
  try {
    const dateStr = c.req.query("date") || new Date().toISOString().split("T")[0];
    const targetDate = new Date(dateStr);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    const trendStart = new Date(targetDate);
    trendStart.setDate(trendStart.getDate() - 29);
    const trendStartStr = trendStart.toISOString().split("T")[0];

    // 1. Active halaqah groups with mentors and members
    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const allowedStudentIds = await getAllowedStudentIds(genderScope);
    const groups = await db.query.halaqahGroups.findMany({
      where: eq(halaqahGroups.status, "active"),
      with: {
        mentors: { where: eq(halaqahMentors.status, "active"), with: { teacher: true } },
        members: {
          where: allowedStudentIds
            ? and(eq(halaqahMembers.status, "active"), inArray(halaqahMembers.studentId, allowedStudentIds))
            : eq(halaqahMembers.status, "active"),
          with: { student: true },
        },
        targetLevel: true,
      },
    });

    const allTargets = await db.select().from(tahfidzTargets);
    const defaultTargetPages = allTargets[0]?.targetPages || 6;

    const activeStudentIds = groups.flatMap((g) => g.members.map((m) => m.studentId));
    const mentorTeacherIds = [
      ...new Set(groups.flatMap((g) => g.mentors.map((m) => m.teacherId))),
    ];

    // 2. Mentor attendance for the selected date
    const mentorAttendanceRows = mentorTeacherIds.length
      ? await db
          .select()
          .from(teacherAttendances)
          .where(
            and(
              inArray(teacherAttendances.teacherId, mentorTeacherIds),
              eq(teacherAttendances.date, dateStr),
            ),
          )
      : [];
    const attendanceByTeacher = new Map(
      mentorAttendanceRows.map((r) => [r.teacherId, r.status]),
    );

    const mentorAttendancePerHalaqah = groups.map((g) => ({
      halaqahId: g.id,
      halaqahName: g.name,
      mentors: g.mentors.map((m) => ({
        teacherId: m.teacherId,
        fullName: m.teacher?.fullName || "-",
        role: m.role,
        status: attendanceByTeacher.get(m.teacherId) || "not_recorded",
      })),
    }));

    const mentorStatusCounts = { present: 0, late: 0, absent: 0, not_recorded: 0, other: 0 };
    mentorTeacherIds.forEach((tId) => {
      const status = attendanceByTeacher.get(tId);
      if (!status) mentorStatusCounts.not_recorded++;
      else if (status === "present") mentorStatusCounts.present++;
      else if (status === "late") mentorStatusCounts.late++;
      else if (status === "absent") mentorStatusCounts.absent++;
      else mentorStatusCounts.other++;
    });

    // 2b. Mentor attendance recap for the whole month
    const mentorAttendanceMonthRows = mentorTeacherIds.length
      ? await db
          .select()
          .from(teacherAttendances)
          .where(
            and(
              inArray(teacherAttendances.teacherId, mentorTeacherIds),
              sql`${teacherAttendances.date} >= ${monthStart}`,
              sql`${teacherAttendances.date} <= ${monthEnd}`,
            ),
          )
      : [];
    const monthAttendanceByTeacher = new Map();
    mentorAttendanceMonthRows.forEach((r) => {
      if (!monthAttendanceByTeacher.has(r.teacherId)) {
        monthAttendanceByTeacher.set(r.teacherId, { present: 0, late: 0, absent: 0, other: 0 });
      }
      const bucket = monthAttendanceByTeacher.get(r.teacherId);
      if (r.status === "present") bucket.present++;
      else if (r.status === "late") bucket.late++;
      else if (r.status === "absent") bucket.absent++;
      else bucket.other++;
    });
    const mentorAttendanceMonthlyPerHalaqah = groups.map((g) => ({
      halaqahId: g.id,
      halaqahName: g.name,
      mentors: g.mentors.map((m) => ({
        teacherId: m.teacherId,
        fullName: m.teacher?.fullName || "-",
        role: m.role,
        ...(monthAttendanceByTeacher.get(m.teacherId) || { present: 0, late: 0, absent: 0, other: 0 }),
      })),
    }));

    // 3-5. Deposits for the selected date across every active tahfidz student
    const dayStartStr = `${dateStr} 00:00:00`;
    const dayEndStr = `${dateStr} 23:59:59`;
    const dayDeposits = activeStudentIds.length
      ? await db
          .select()
          .from(tahfidzDeposits)
          .where(
            and(
              inArray(tahfidzDeposits.studentId, activeStudentIds),
              sql`${tahfidzDeposits.depositDate} >= ${dayStartStr}`,
              sql`${tahfidzDeposits.depositDate} <= ${dayEndStr}`,
            ),
          )
      : [];
    const depositsByStudent = new Map();
    dayDeposits.forEach((d) => {
      if (!depositsByStudent.has(d.studentId)) depositsByStudent.set(d.studentId, []);
      depositsByStudent.get(d.studentId).push(d);
    });

    const sakitList = [];
    const izinList = [];
    let ziyadahMissing = 0;
    let sabqiMissing = 0;
    let manzilMissing = 0;
    let excusedCount = 0;
    const perHalaqahSubmission = [];

    groups.forEach((g) => {
      let hZiyadahMissing = 0;
      let hSabqiMissing = 0;
      let hManzilMissing = 0;
      g.members.forEach((m) => {
        const studentDeposits = depositsByStudent.get(m.studentId) || [];
        const exception = studentDeposits.find((d) =>
          ["izin", "alpha", "sakit", "tidak_setor"].includes(d.type),
        );
        if (exception?.type === "sakit") {
          sakitList.push({ studentId: m.studentId, fullName: m.student?.fullName, halaqahName: g.name });
        }
        if (exception?.type === "izin") {
          izinList.push({ studentId: m.studentId, fullName: m.student?.fullName, halaqahName: g.name });
        }
        if (exception) {
          excusedCount++;
          return; // excused students are not counted as "belum setor"
        }
        const hasType = (t) => studentDeposits.some((d) => d.type === t);
        if (!hasType("ziyadah")) { ziyadahMissing++; hZiyadahMissing++; }
        if (!hasType("sabqi")) { sabqiMissing++; hSabqiMissing++; }
        if (!hasType("manzil")) { manzilMissing++; hManzilMissing++; }
      });
      perHalaqahSubmission.push({
        halaqahId: g.id,
        halaqahName: g.name,
        ziyadahMissing: hZiyadahMissing,
        sabqiMissing: hSabqiMissing,
        manzilMissing: hManzilMissing,
      });
    });

    // 5b. Sakit/Izin recap for the whole month
    const monthDeposits = activeStudentIds.length
      ? await db.query.tahfidzDeposits.findMany({
          where: and(
            inArray(tahfidzDeposits.studentId, activeStudentIds),
            inArray(tahfidzDeposits.type, ["sakit", "izin"]),
            sql`DATE(${tahfidzDeposits.depositDate}) >= ${monthStart}`,
            sql`DATE(${tahfidzDeposits.depositDate}) <= ${monthEnd}`,
          ),
          orderBy: [desc(tahfidzDeposits.depositDate)],
        })
      : [];
    const studentNameById = new Map();
    const studentHalaqahById = new Map();
    groups.forEach((g) =>
      g.members.forEach((m) => {
        studentNameById.set(m.studentId, m.student?.fullName);
        studentHalaqahById.set(m.studentId, g.name);
      }),
    );
    const sakitListMonth = monthDeposits
      .filter((d) => d.type === "sakit")
      .map((d) => ({
        studentId: d.studentId,
        fullName: studentNameById.get(d.studentId),
        halaqahName: studentHalaqahById.get(d.studentId),
        date: new Date(d.depositDate).toISOString().split("T")[0],
      }));
    const izinListMonth = monthDeposits
      .filter((d) => d.type === "izin")
      .map((d) => ({
        studentId: d.studentId,
        fullName: studentNameById.get(d.studentId),
        halaqahName: studentHalaqahById.get(d.studentId),
        date: new Date(d.depositDate).toISOString().split("T")[0],
      }));

    // 6. Achievement this month (Ziyadah pages only, matching Mading/Rapor convention)
    const achievementRows = activeStudentIds.length
      ? await db
          .select({
            halaqahId: halaqahMembers.halaqahId,
            totalPages: sql`sum(${tahfidzDeposits.totalPages})`,
          })
          .from(tahfidzDeposits)
          .innerJoin(halaqahMembers, eq(tahfidzDeposits.studentId, halaqahMembers.studentId))
          .where(
            and(
              inArray(tahfidzDeposits.studentId, activeStudentIds),
              eq(tahfidzDeposits.type, "ziyadah"),
              eq(halaqahMembers.status, "active"),
              sql`DATE(${tahfidzDeposits.depositDate}) >= ${monthStart}`,
              sql`DATE(${tahfidzDeposits.depositDate}) <= ${monthEnd}`,
            ),
          )
          .groupBy(halaqahMembers.halaqahId)
      : [];
    const achievedByHalaqah = new Map(
      achievementRows.map((r) => [r.halaqahId, Number(r.totalPages) || 0]),
    );

    let totalPagesThisMonth = 0;
    const achievementPerHalaqah = groups.map((g) => {
      const achieved = achievedByHalaqah.get(g.id) || 0;
      totalPagesThisMonth += achieved;
      const targetPages = g.targetLevel?.targetPages || defaultTargetPages;
      const memberCount = g.members.length || 1;
      const percentage =
        Math.round((achieved / (targetPages * memberCount)) * 1000) / 10;
      return { halaqahId: g.id, halaqahName: g.name, totalPages: achieved, targetPages, percentage };
    });
    const averagePercentage = achievementPerHalaqah.length
      ? Math.round(
          (achievementPerHalaqah.reduce((sum, h) => sum + h.percentage, 0) /
            achievementPerHalaqah.length) * 10,
        ) / 10
      : 0;

    // 7. At-risk students: no Ziyadah/Sabqi/Manzil deposit in the longest time
    const lastSubmissionRows = activeStudentIds.length
      ? await db
          .select({
            studentId: tahfidzDeposits.studentId,
            lastDate: sql`max(DATE(${tahfidzDeposits.depositDate}))`,
          })
          .from(tahfidzDeposits)
          .where(
            and(
              inArray(tahfidzDeposits.studentId, activeStudentIds),
              inArray(tahfidzDeposits.type, ["ziyadah", "sabqi", "manzil"]),
            ),
          )
          .groupBy(tahfidzDeposits.studentId)
      : [];
    const lastSubmissionByStudent = new Map(
      lastSubmissionRows.map((r) => [r.studentId, r.lastDate]),
    );
    const AT_RISK_DAYS = 3;
    const atRisk = [];
    groups.forEach((g) => {
      g.members.forEach((m) => {
        const lastDate = lastSubmissionByStudent.get(m.studentId);
        const daysSince = lastDate
          ? Math.floor((targetDate - new Date(lastDate)) / (1000 * 60 * 60 * 24))
          : null;
        if (daysSince === null || daysSince >= AT_RISK_DAYS) {
          atRisk.push({
            studentId: m.studentId,
            fullName: m.student?.fullName,
            halaqahName: g.name,
            daysSinceLastSubmission: daysSince,
          });
        }
      });
    });
    atRisk.sort((a, b) => (b.daysSinceLastSubmission ?? 9999) - (a.daysSinceLastSubmission ?? 9999));

    // 8. Per-halaqah summary table
    const halaqahSummary = groups.map((g) => {
      const submission = perHalaqahSubmission.find((s) => s.halaqahId === g.id);
      const presentToday = g.members.filter((m) => {
        const deposits = depositsByStudent.get(m.studentId) || [];
        return deposits.some((d) => ["ziyadah", "sabqi", "manzil"].includes(d.type));
      }).length;
      const achievement = achievementPerHalaqah.find((a) => a.halaqahId === g.id);
      const leadMentor = g.mentors.find((m) => m.role === "lead") || g.mentors[0];
      return {
        halaqahId: g.id,
        halaqahName: g.name,
        mentorName: leadMentor?.teacher?.fullName || "-",
        totalStudents: g.members.length,
        presentToday,
        achievementPercentage: achievement?.percentage || 0,
        ziyadahMissing: submission?.ziyadahMissing || 0,
        sabqiMissing: submission?.sabqiMissing || 0,
        manzilMissing: submission?.manzilMissing || 0,
      };
    });

    // 9. UKJ-blocked students
    const juzBlockResults = await Promise.all(
      groups.flatMap((g) =>
        g.members.map(async (m) => ({
          studentId: m.studentId,
          fullName: m.student?.fullName,
          halaqahName: g.name,
          block: await safeCheckJuzCompletionBlock(m.studentId),
        })),
      ),
    );
    const ukjBlockedList = juzBlockResults
      .filter((r) => r.block.blocked)
      .map((r) => ({
        studentId: r.studentId,
        fullName: r.fullName,
        halaqahName: r.halaqahName,
        juz: r.block.completedJuz,
      }));

    // 10. 30-day submission trend
    const trendRows = activeStudentIds.length
      ? await db
          .select({
            date: sql`DATE(${tahfidzDeposits.depositDate})`,
            count: sql`count(*)`,
          })
          .from(tahfidzDeposits)
          .where(
            and(
              inArray(tahfidzDeposits.studentId, activeStudentIds),
              inArray(tahfidzDeposits.type, ["ziyadah", "sabqi", "manzil"]),
              sql`DATE(${tahfidzDeposits.depositDate}) >= ${trendStartStr}`,
              sql`DATE(${tahfidzDeposits.depositDate}) <= ${dateStr}`,
            ),
          )
          .groupBy(sql`DATE(${tahfidzDeposits.depositDate})`)
      : [];
    const trendByDate = new Map(trendRows.map((r) => [String(r.date), Number(r.count)]));
    const weeklyTrend = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(trendStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      weeklyTrend.push({ date: key, count: trendByDate.get(key) || 0 });
    }

    // 11. Leaderboard: top 10 by Ziyadah pages this month
    const leaderboardRows = activeStudentIds.length
      ? await db
          .select({
            studentId: tahfidzDeposits.studentId,
            totalPages: sql`sum(${tahfidzDeposits.totalPages})`,
          })
          .from(tahfidzDeposits)
          .where(
            and(
              inArray(tahfidzDeposits.studentId, activeStudentIds),
              eq(tahfidzDeposits.type, "ziyadah"),
              sql`DATE(${tahfidzDeposits.depositDate}) >= ${monthStart}`,
              sql`DATE(${tahfidzDeposits.depositDate}) <= ${monthEnd}`,
            ),
          )
          .groupBy(tahfidzDeposits.studentId)
          .orderBy(desc(sql`sum(${tahfidzDeposits.totalPages})`))
          .limit(10)
      : [];
    const studentInfoById = new Map();
    groups.forEach((g) =>
      g.members.forEach((m) =>
        studentInfoById.set(m.studentId, { fullName: m.student?.fullName, halaqahName: g.name }),
      ),
    );
    const leaderboard = leaderboardRows.map((r) => ({
      studentId: r.studentId,
      fullName: studentInfoById.get(r.studentId)?.fullName || "-",
      halaqahName: studentInfoById.get(r.studentId)?.halaqahName || "-",
      totalPages: Number(r.totalPages) || 0,
    }));

    return c.json({
      success: true,
      data: {
        date: dateStr,
        mentorAttendance: {
          summary: mentorStatusCounts,
          total: mentorTeacherIds.length,
          perHalaqah: mentorAttendancePerHalaqah,
          monthlyPerHalaqah: mentorAttendanceMonthlyPerHalaqah,
        },
        studentHealth: {
          sakit: { count: sakitList.length, list: sakitList, monthList: sakitListMonth },
          izin: { count: izinList.length, list: izinList, monthList: izinListMonth },
        },
        dailySubmission: {
          summary: { ziyadahMissing, sabqiMissing, manzilMissing, excusedCount, totalActiveStudents: activeStudentIds.length },
          perHalaqah: perHalaqahSubmission,
        },
        achievement: { totalPagesThisMonth, averagePercentage, perHalaqah: achievementPerHalaqah },
        atRisk: atRisk.slice(0, 20),
        halaqahSummary,
        ukjBlocked: { count: ukjBlockedList.length, list: ukjBlockedList },
        weeklyTrend,
        leaderboard,
      },
    });
  } catch (e: any) {
    console.error("Monitoring dashboard error:", e);
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /can-backdate - can the current user submit/edit tahfidz deposits
// for a date before today? (admin or Divisi Tahfidz head/member only)
app.get("/can-backdate", async (c) => {
  try {
    const user = c.get("user");
    const allowed = await canBackdateTahfidzDeposit(user.userId, user.role);
    return c.json({ success: true, data: { allowed } });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /juz-status/:studentId - is this student blocked from new Taqdim
// pending a UKJ exam for a juz they've already finished?
app.get("/juz-status/:studentId", async (c) => {
  try {
    const studentId = parseInt(c.req.param("studentId"));
    const juzBlock = await checkJuzCompletionBlock(studentId);
    return c.json({ success: true, data: juzBlock });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /halaqah/:groupId/monthly-summary
app.get("/halaqah/:groupId/monthly-summary", async (c) => {
  try {
    const groupId = parseInt(c.req.param("groupId"));
    const month = parseInt(c.req.query("month") || ""); // 1-12
    const year = parseInt(c.req.query("year") || "");

    if (!month || !year) {
      return c.json(
        { success: false, message: "Month and Year required" },
        400,
      );
    }

    // 1. Get total students in halaqah
    // Using findMany to ensure consistency with daily-summary logic 100%
    const members = await db.query.halaqahMembers.findMany({
      where: and(
        eq(halaqahMembers.halaqahId, groupId),
        eq(halaqahMembers.status, "active"),
      ),
    });

    const totalStudents = members.length;

    if (totalStudents === 0) {
      return c.json({ success: true, data: {}, totalStudents: 0 });
    }

    // 2. Get students IDs
    // Optimization: We could just query deposits filtered by halaqah members subquery,
    // but for now let's reuse logic or just join.
    // Let's use a join approach for efficiency.

    // Query deposits for this halaqah's students in the date range
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const deposits = await db
      .select({
        date: sql<string>`DATE(${tahfidzDeposits.depositDate})`,
        type: tahfidzDeposits.type,
        count: sql<number>`count(distinct ${tahfidzDeposits.studentId})`,
      })
      .from(tahfidzDeposits)
      .innerJoin(
        halaqahMembers,
        and(
          eq(tahfidzDeposits.studentId, halaqahMembers.studentId),
          eq(halaqahMembers.halaqahId, groupId),
        ),
      )
      .where(
        and(
          sql`DATE(${tahfidzDeposits.depositDate}) >= ${startDate}`,
          sql`DATE(${tahfidzDeposits.depositDate}) <= ${endDate}`,
        ),
      )
      .groupBy(sql`DATE(${tahfidzDeposits.depositDate})`, tahfidzDeposits.type);

    // { "2024-12-01": { done: 5, permission: 1, alpha: 0, sick: 0, notSubmitted: 0 } }
    const stats: Record<
      string,
      { done: number; permission: number; alpha: number; sick: number; notSubmitted: number }
    > = {};

    deposits.forEach((d) => {
      let dateKey = String(d.date);
      if ((d.date as any) instanceof Date) {
        dateKey = (d.date as any).toISOString().split("T")[0];
      }

      if (!stats[dateKey]) {
        stats[dateKey] = { done: 0, permission: 0, alpha: 0, sick: 0, notSubmitted: 0 };
      }

      if (d.type === "izin") {
        stats[dateKey]!.permission += d.count;
      } else if (d.type === "alpha") {
        stats[dateKey]!.alpha += d.count;
      } else if (d.type === "sakit") {
        stats[dateKey]!.sick += d.count;
      } else if (d.type === "tidak_setor") {
        stats[dateKey]!.notSubmitted += d.count;
      } else {
        stats[dateKey]!.done += d.count;
      }
    });

    return c.json({
      success: true,
      data: stats,
      totalStudents,
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// GET /halaqah/:groupId/health-summary - count of halaqah members seen by
// the clinic (sakit) or on a student-affairs leave (izin pulang) in a given
// month, sourced directly from kesehatan/kesantrian records rather than the
// mentor's own manual sakit/izin deposit entries.
app.get("/halaqah/:groupId/health-summary", async (c) => {
  try {
    const groupId = parseInt(c.req.param("groupId"));
    const month = parseInt(c.req.query("month") || "");
    const year = parseInt(c.req.query("year") || "");

    if (!month || !year) {
      return c.json(
        { success: false, message: "Month and Year required" },
        400,
      );
    }

    const members = await db.query.halaqahMembers.findMany({
      where: and(
        eq(halaqahMembers.halaqahId, groupId),
        eq(halaqahMembers.status, "active"),
      ),
    });
    const studentIds = members.map((m) => m.studentId);

    if (!studentIds.length) {
      return c.json({ success: true, data: { sickCount: 0, leaveCount: 0 } });
    }

    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const sickRows = await db
      .selectDistinct({ studentId: healthExaminations.patientId })
      .from(healthExaminations)
      .where(
        and(
          eq(healthExaminations.patientType, "student"),
          inArray(healthExaminations.patientId, studentIds),
          sql`${healthExaminations.examinationDate} >= ${startDate}`,
          sql`${healthExaminations.examinationDate} <= ${endDate}`,
        ),
      );

    const leaveRows = await db
      .selectDistinct({ studentId: studentLeaveItems.studentId })
      .from(studentLeaveItems)
      .innerJoin(studentLeaves, eq(studentLeaveItems.leaveId, studentLeaves.id))
      .where(
        and(
          inArray(studentLeaveItems.studentId, studentIds),
          sql`${studentLeaves.startDate} <= ${endDate}`,
          sql`${studentLeaves.endDate} >= ${startDate}`,
        ),
      );

    return c.json({
      success: true,
      data: { sickCount: sickRows.length, leaveCount: leaveRows.length },
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// --- HALAQAH REPORT ---
// GET /sertifikasi-report - Mading Sertifikasi: per-halaqah wall report of
// each member's Sertifikasi exam status/date/score/verdict for a date range.
app.get("/sertifikasi-report", async (c) => {
  const halaqahId = c.req.query("halaqahId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const gender = c.req.query("gender");
  const classId = c.req.query("classId");

  if (!halaqahId || !startDate || !endDate) {
    return c.json(
      { success: false, message: "halaqahId, startDate, endDate required" },
      400,
    );
  }

  try {
    const halaqah = await db.query.halaqahGroups.findFirst({
      where: eq(halaqahGroups.id, Number(halaqahId)),
    });

    if (!halaqah) {
      return c.json({ success: false, message: "Halaqah not found" }, 404);
    }

    const mentorRecord = await db
      .select({
        teacherId: halaqahMentors.teacherId,
        fullName: teachers.fullName,
      })
      .from(halaqahMentors)
      .leftJoin(teachers, eq(halaqahMentors.teacherId, teachers.id))
      .where(eq(halaqahMentors.halaqahId, Number(halaqahId)))
      .orderBy(sql`${halaqahMentors.id} ASC`)
      .limit(1);

    const members = await db
      .select({
        studentId: halaqahMembers.studentId,
        fullName: students.fullName,
        nis: students.nis,
        gender: students.gender,
        classId: students.classId,
        className: classes.name,
      })
      .from(halaqahMembers)
      .leftJoin(students, eq(halaqahMembers.studentId, students.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(
        and(
          eq(halaqahMembers.halaqahId, Number(halaqahId)),
          eq(halaqahMembers.status, "active"),
        ),
      );

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const effectiveGender = genderScope || gender;

    const filteredMembers = members.filter((m) => {
      if (effectiveGender && m.gender !== effectiveGender) return false;
      if (classId && String(m.classId) !== String(classId)) return false;
      return true;
    });

    const studentIds = filteredMembers.map((m) => m.studentId);

    const exams = studentIds.length
      ? await db.query.tahfidzExams.findMany({
          where: and(
            inArray(tahfidzExams.studentId, studentIds),
            eq(tahfidzExams.examCategory, "Sertifikasi"),
            sql`DATE(${tahfidzExams.examDate}) >= ${startDate}`,
            sql`DATE(${tahfidzExams.examDate}) <= ${endDate}`,
          ),
          orderBy: [desc(tahfidzExams.examDate)],
        })
      : [];
    const examByStudent = new Map();
    exams.forEach((e) => {
      if (!examByStudent.has(e.studentId)) examByStudent.set(e.studentId, e);
    });

    const resultMembers = filteredMembers.map((m) => {
      const exam = examByStudent.get(m.studentId);
      return {
        studentId: m.studentId,
        fullName: m.fullName,
        nis: m.nis,
        classId: m.classId,
        className: m.className,
        hasExam: !!exam,
        examDate: exam?.examDate || null,
        finalScore: exam?.finalScore ?? null,
        verdict: exam?.verdict || null,
      };
    });

    return c.json({
      success: true,
      data: {
        halaqah: { id: halaqah.id, name: halaqah.name },
        mentor: mentorRecord[0] || null,
        dateRange: { startDate, endDate },
        members: resultMembers,
      },
    });
  } catch (e: any) {
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

app.get("/halaqah-report", async (c) => {
  const halaqahId = c.req.query("halaqahId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const gender = c.req.query("gender");
  const classId = c.req.query("classId");

  if (!halaqahId || !startDate || !endDate) {
    return c.json(
      { success: false, message: "halaqahId, startDate, endDate required" },
      400,
    );
  }

  try {
    // 1. Get halaqah info
    const halaqah = await db.query.halaqahGroups.findFirst({
      where: eq(halaqahGroups.id, Number(halaqahId)),
      with: {
        targetLevel: true,
      },
    });

    if (!halaqah) {
      return c.json({ success: false, message: "Halaqah not found" }, 404);
    }

    // 2. Get first mentor
    const mentorRecord = await db
      .select({
        teacherId: halaqahMentors.teacherId,
        fullName: teachers.fullName,
      })
      .from(halaqahMentors)
      .leftJoin(teachers, eq(halaqahMentors.teacherId, teachers.id))
      .where(eq(halaqahMentors.halaqahId, Number(halaqahId)))
      .orderBy(sql`${halaqahMentors.id} ASC`)
      .limit(1);

    // 3. Get members of this halaqah
    let membersQuery = db
      .select({
        studentId: halaqahMembers.studentId,
        fullName: students.fullName,
        nis: students.nis,
        gender: students.gender,
        classId: students.classId,
        className: classes.name,
      })
      .from(halaqahMembers)
      .leftJoin(students, eq(halaqahMembers.studentId, students.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(
        and(
          eq(halaqahMembers.halaqahId, Number(halaqahId)),
          eq(halaqahMembers.status, "active"),
        ),
      );

    const members = await membersQuery;

    // Filter by gender and/or class if provided
    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const effectiveGender = genderScope || gender;
    const filteredMembers = members.filter((m) => {
      if (effectiveGender && m.gender !== effectiveGender) return false;
      if (classId && String(m.classId) !== String(classId)) return false;
      return true;
    });

    // 4. For each member, get deposits in date range
    const memberData = await Promise.all(
      filteredMembers.map(async (member) => {
        const deposits = await db
          .select()
          .from(tahfidzDeposits)
          .where(
            and(
              eq(tahfidzDeposits.studentId, member.studentId),
              gte(tahfidzDeposits.depositDate, new Date(startDate)),
              lte(tahfidzDeposits.depositDate, new Date(endDate)),
            ),
          );

        // Count attendance
        const attendance = {
          izin: deposits.filter((d) => d.type === "izin").length,
          alpha: deposits.filter((d) => d.type === "alpha").length,
          sakit: deposits.filter((d) => d.type === "sakit").length,
          terlambat: deposits.filter((d) => d.isLate).length,
          tidakSetor: deposits.filter((d) => d.type === "tidak_setor").length,
        };

        // Get page numbers
        const actualDeposits = deposits.filter((d) => d.type === "ziyadah");

        // Calculate pages (Hybrid: New Fields + Legacy)
        let totalPagesSum = 0;
        const depositRanges: { start: number; end: number }[] = [];

        actualDeposits.forEach((d) => {
          // Amount
          if (d.totalPages) {
            totalPagesSum += Number(d.totalPages);
          } else if (d.pageNumber) {
            totalPagesSum += 1; // Assume 1 page for legacy
          }

          // Range Collection
          const start = d.startPage || d.pageNumber;
          const end = d.endPage || d.pageNumber;
          if (start && end) {
            depositRanges.push({ start, end });
          }
        });

        // Merge Ranges
        depositRanges.sort((a, b) => a.start - b.start);
        const mergedRanges: { start: number; end: number }[] = [];

        depositRanges.forEach((r) => {
          const last = mergedRanges[mergedRanges.length - 1];
          if (last && r.start <= last.end + 1) {
            // Contiguous or Overlap
            if (r.end > last.end) last.end = r.end;
          } else {
            mergedRanges.push({ ...r });
          }
        });

        const hafalanRanges =
          mergedRanges.length > 0
            ? mergedRanges
                .map((r) =>
                  r.start === r.end
                    ? `Hal. ${r.start}`
                    : `Hal. ${r.start}-${r.end}`,
                )
                .join(", ")
            : "-";

        const awalHalaman =
          mergedRanges.length > 0 ? mergedRanges[0]!.start : null;
        const akhirHalaman =
          mergedRanges.length > 0
            ? mergedRanges[mergedRanges.length - 1]!.end
            : null;
        const jumlahHalaman = Number(totalPagesSum.toFixed(2));

        return {
          studentId: member.studentId,
          fullName: member.fullName,
          nis: member.nis,
          classId: member.classId,
          className: member.className,
          attendance,
          awalHalaman,
          akhirHalaman,
          jumlahHalaman,
          hafalanRanges,
          totalDeposits: actualDeposits.length,
        };
      }),
    );

    return c.json({
      success: true,
      data: {
        halaqah: halaqah, // Pass full object including targetLevel
        mentor: mentorRecord[0] || null,
        dateRange: { start: startDate, end: endDate },
        members: memberData,
      },
    });
  } catch (e: any) {
    console.error("Halaqah report error:", e);
    return c.json(
      { success: false, message: e.message || "Internal Error" },
      500,
    );
  }
});

// --- TARGET SETTINGS CRUD ---
const targetSchema = z.object({
  level: z.string().min(1),
  targetPages: z.number().min(1),
  targetJuz: z.number().optional().nullable(),
  description: z.string().nullable().optional(),
});

// GET /targets - List all
app.get("/targets", async (c) => {
  try {
    const targets = await db
      .select()
      .from(tahfidzTargets)
      .orderBy(tahfidzTargets.level);
    return c.json({ success: true, data: targets });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// POST /targets - Create
app.post("/targets", zValidator("json", targetSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    await db.insert(tahfidzTargets).values({
      ...body,
      targetJuz:
        body.targetJuz !== null && body.targetJuz !== undefined
          ? String(body.targetJuz)
          : null,
    });
    return c.json({ success: true, message: "Target created" });
  } catch (e: any) {
    if (e.code === "ER_DUP_ENTRY") {
      return c.json({ success: false, message: "Level already exists" }, 400);
    }
    return c.json({ success: false, message: e.message }, 500);
  }
});

// PUT /targets/:id - Update
app.put("/targets/:id", zValidator("json", targetSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = c.req.valid("json");
  try {
    await db
      .update(tahfidzTargets)
      .set({
        ...body,
        targetJuz:
          body.targetJuz !== null && body.targetJuz !== undefined
            ? String(body.targetJuz)
            : null,
      })
      .where(eq(tahfidzTargets.id, id));
    return c.json({ success: true, message: "Target updated" });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// DELETE /targets/:id - Delete
app.delete("/targets/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  try {
    await db.delete(tahfidzTargets).where(eq(tahfidzTargets.id, id));
    return c.json({ success: true, message: "Target deleted" });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// --- EXAM TYPES CRUD ---
const examTypeSchema = z.object({
  name: z.string().min(1),
  category: z
    .enum(["UPK", "UKJ", "UA", "Suluk", "Jilsah", "Sertifikasi", "Other"])
    .default("Other"),
  description: z.string().nullable().optional(),
});

// GET /exam-types - List all
app.get("/exam-types", async (c) => {
  try {
    const types = await db.query.tahfidzExamTypes.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    return c.json({ success: true, data: types });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// POST /exam-types - Create
app.post("/exam-types", zValidator("json", examTypeSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    await db.insert(tahfidzExamTypes).values(body);
    return c.json({ success: true, message: "Jenis ujian berhasil dibuat" });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// PUT /exam-types/:id - Update
app.put("/exam-types/:id", zValidator("json", examTypeSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = c.req.valid("json");
  try {
    await db
      .update(tahfidzExamTypes)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(tahfidzExamTypes.id, id));
    return c.json({
      success: true,
      message: "Jenis ujian berhasil diperbarui",
    });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// DELETE /exam-types/:id - Delete
app.delete("/exam-types/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  try {
    await db.delete(tahfidzExamTypes).where(eq(tahfidzExamTypes.id, id));
    return c.json({ success: true, message: "Jenis ujian berhasil dihapus" });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

export default app;

// --- SETTINGS & REPORT CARD ---

// Settings Schema
const settingsSchema = z.object({
  institutionName: z.string().min(1),
  institutionAddress: z.string().nullable().optional(),
  institutionLogo: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  headmasterName: z.string().nullable().optional(),
  tahfidzHeadName: z.string().nullable().optional(),
  tahfidzHeadNameAkhwat: z.string().nullable().optional(), // Ketua Tahfidz Akhwat (optional)
  cityDate: z.string().nullable().optional(),
});

// GET /settings
app.get("/settings", async (c) => {
  try {
    const settings = await db.select().from(tahfidzReportSettings).limit(1);
    return c.json({ success: true, data: settings[0] || {} });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// PUT /settings
app.put("/settings", zValidator("json", settingsSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const existing = await db
      .select({ id: tahfidzReportSettings.id })
      .from(tahfidzReportSettings)
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(tahfidzReportSettings)
        .set(body)
        .where(eq(tahfidzReportSettings.id, existing[0]!.id));
    } else {
      await db.insert(tahfidzReportSettings).values(body);
    }
    return c.json({ success: true, message: "Pengaturan berhasil disimpan" });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// GET /report-card/:studentId
app.get("/report-card/:studentId", async (c) => {
  const studentId = parseInt(c.req.param("studentId"));
  const academicYear = c.req.query("academicYear") || "2025-2026"; // Default or calculated
  const semester = c.req.query("semester"); // 1 or 2 (Ganjil/Genap)

  try {
    // 1. Get Student Info with Class & Halaqah
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
      with: {
        class: true,
      },
    });

    if (!student) {
      return c.json({ success: false, message: "Santri tidak ditemukan" }, 404);
    }

    const denied = await requireStudentGenderAccess(c, student.gender);
    if (denied) return denied;

    // Get Active Halaqah
    const halaqahMember = await db.query.halaqahMembers.findFirst({
      where: and(
        eq(halaqahMembers.studentId, studentId),
        eq(halaqahMembers.status, "active"),
      ),
      with: {
        halaqah: true,
      },
    });

    // 1b. Get Homeroom Teacher
    let homeroomTeacherName = "-";
    if (student.classId) {
      const waliQuery = await db
        .select({ name: teachers.fullName })
        .from(classHomeroomTeachers)
        .innerJoin(teachers, eq(classHomeroomTeachers.teacherId, teachers.id))
        .where(
          and(
            eq(classHomeroomTeachers.classId, student.classId),
            eq(classHomeroomTeachers.role, "wali_kelas"),
          ),
        )
        .limit(1);
      if (waliQuery.length > 0) {
        homeroomTeacherName = waliQuery[0]?.name || "-";
      }
    }

    // 2. Get Exams (Semester Specific - For Report Details)
    const examConditions = [eq(tahfidzExams.studentId, studentId)];
    if (academicYear) {
      examConditions.push(eq(tahfidzExams.academicYear, academicYear));
    }
    if (semester) {
      examConditions.push(eq(tahfidzExams.semester, semester as any));
    }

    const exams = await db
      .select()
      .from(tahfidzExams)
      .where(and(...examConditions))
      .orderBy(asc(tahfidzExams.examDate));

    // 2b. Cumulative UKJ Count (Passed Juz - All Time)
    // We want total juz student has passed UKJ for, regardless of semester
    const passedUKJ = await db
      .select({ juz: tahfidzExams.juz })
      .from(tahfidzExams)
      .where(
        and(
          eq(tahfidzExams.studentId, studentId),
          eq(tahfidzExams.examCategory, "UKJ"),
          eq(tahfidzExams.verdict, "pass"),
        ),
      );
    const uniqueJuzUKJ = new Set(
      passedUKJ.map((e) => e.juz).filter((j) => j != null),
    );
    const totalJuzUKJ = uniqueJuzUKJ.size;

    // 3. Get Attendance Stats (Calculated from Deposits)
    const deposits = await db
      .select({ type: tahfidzDeposits.type })
      .from(tahfidzDeposits)
      .where(eq(tahfidzDeposits.studentId, studentId));

    const attendance = {
      sakit: deposits.filter((d) => d.type?.toLowerCase() === "sakit").length,
      izin: deposits.filter((d) => d.type?.toLowerCase() === "izin").length,
      alpha: deposits.filter((d) => d.type?.toLowerCase() === "alpha").length,
      tidakSetor: deposits.filter((d) => d.type?.toLowerCase() === "tidak_setor").length,
    };

    // 4. Get Cumulative Hafalan (Total Pages) - Filtered by Semester Date Range
    const years = academicYear.split(/[-/]/).map(Number);
    let startDate: Date;
    let endDate: Date;
    const isGenap =
      String(semester).toLowerCase().includes("2") ||
      String(semester).toLowerCase().includes("genap");

    if (isGenap) {
      const startYear = years[0] || new Date().getFullYear();
      const year = years[1] || startYear + 1;
      startDate = new Date(`${year}-01-01`);
      endDate = new Date(`${year}-06-30`);
    } else {
      const year = years[0];
      startDate = new Date(`${year}-07-01`);
      endDate = new Date(`${year}-12-31`);
    }

    const ziyadah = await db
      .select()
      .from(tahfidzDeposits)
      .where(
        and(
          eq(tahfidzDeposits.studentId, studentId),
          eq(tahfidzDeposits.type, "ziyadah"),
          gte(tahfidzDeposits.depositDate, startDate),
          lte(tahfidzDeposits.depositDate, endDate),
        ),
      );

    let totalPages = 0;
    ziyadah.forEach((d) => {
      if (d.totalPages) totalPages += Number(d.totalPages);
      else if (d.pageNumber) totalPages += 1;
    });

    // 5. Get Settings
    const tahfidzSettings = await db.query.tahfidzReportSettings.findFirst();

    // 5b. Get city name
    let cityName = "";
    const regencySetting = await db.query.settings.findFirst({
      where: eq(settings.key, "institution_regency"),
    });
    if (regencySetting?.value) {
      try {
        const regencyData = JSON.parse(regencySetting.value);
        if (regencyData?.name) {
          cityName = regencyData.name
            .replace(/^KABUPATEN\s+/i, "")
            .replace(/^KOTA\s+/i, "");
        }
      } catch (e) {
        console.error("Failed to parse institution_regency:", e);
      }
    }

    // 6. Get Target based on Halaqah Level or Class Grade
    const allTargets = await db.select().from(tahfidzTargets);
    let target = null; // Start null to track if found

    // Priority 1: Check Halaqah Target Level Link
    if (
      halaqahMember?.halaqah &&
      (halaqahMember.halaqah as any).targetLevelId
    ) {
      const tId = (halaqahMember.halaqah as any).targetLevelId;
      target = allTargets.find((t) => t.id === tId) || null;
    }

    // Priority 2: Fallback to Class/Grade Matching
    if (!target && student.class?.name) {
      const className = student.class.name.toUpperCase();
      const exactMatch = allTargets.find((t) =>
        className.includes(t.level.toUpperCase()),
      );
      if (exactMatch) target = exactMatch;
      else if (
        className.includes("SMP") ||
        className.includes("7") ||
        className.includes("8") ||
        className.includes("9")
      ) {
        let match = allTargets.find((t) => t.level === "SMP");
        if (!match && className.includes("7"))
          match = allTargets.find((t) => t.level === "1");
        if (!match && className.includes("8"))
          match = allTargets.find((t) => t.level === "2");
        if (!match && className.includes("9"))
          match = allTargets.find((t) => t.level === "3");
        target = match || target;
      } else if (
        className.includes("SMA") ||
        className.includes("ALIYAH") ||
        className.includes("10") ||
        className.includes("11") ||
        className.includes("12")
      ) {
        let match = allTargets.find((t) => t.level === "SMA");
        if (!match && className.includes("10"))
          match = allTargets.find((t) => t.level === "1"); // Use generic levels if SMA not found
        target = match || target;
      }
    }

    // Default if still not found
    if (!target)
      target = allTargets[0] || { targetPages: 50, level: "Default" };

    // 7. Calculate Mading Data & Targets
    // We reuse logic from previous implementation for mading data (monthly breakdown)
    // But since Ziyadah above is already filtered by date range, we can use it directly?
    // Wait, the Ziyadah query inside 4 uses logic for TotalPages.
    // The previous implementation used 'ziyadah' variable without date filtering for TotalPages logic?
    // Ah, wait. In previous code (Line 1220), ziyadah query had NO date filter.
    // But here I added date filter `gte(startDate), lte(endDate)` to calculate semester pages correctly.
    // This is CORRECT for "Total Hafalan This Semester".

    // Process Mading Data
    const madingMap = new Map();
    ziyadah.forEach((d) => {
      const date = new Date(d.depositDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!madingMap.has(key)) {
        madingMap.set(key, {
          month: date.getMonth(),
          year: date.getFullYear(),
          pages: 0,
          juzSet: new Set(),
        });
      }
      const entry = madingMap.get(key);
      let p = 0;
      if (d.totalPages) p = Number(d.totalPages);
      else if (d.pageNumber) p = 1;
      entry.pages += p;

      if (d.juz) entry.juzSet.add(d.juz);
    });

    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const formatJuzRanges = (juzSet: Set<number>) => {
      if (juzSet.size === 0) return "-";
      const sorted = Array.from(juzSet).sort((a, b) => a - b);
      return sorted.join(", "); // Simple join for now
    };

    const madingData = Array.from(madingMap.values())
      .map((m) => ({
        bulan: monthNames[m.month],
        halaman: Number(m.pages.toFixed(2)),
        juz: formatJuzRanges(m.juzSet),
      }))
      .reverse();

    // Target Calculation
    let baseTarget = target ? target.targetPages : 50;
    // Determine active months in semester (usually 6, or based on data presence?)
    // Report usually implies full semester target. 6 months * monthly target.
    // Or based on actual active months?
    // Previous code: `const monthCount = Math.max(1, madingData.length);`
    // This made target depend on how many months had data.
    // If student was lazy (0 data), target was 1 * baseTarget. Too low?
    // Assuming 6 months target is standard for semester report.
    const monthCount = 6;
    const finalTargetPages = baseTarget * monthCount;

    // 8. Calculate Final Score (Components: UPK, UKJ, UA, Suluk)

    // a. UPK Average
    const upkExams = exams.filter(
      (e) => e.examCategory === "UPK" && e.finalScore != null,
    );
    const avgUPK =
      upkExams.length > 0
        ? upkExams.reduce((sum, e) => sum + Number(e.finalScore), 0) /
          upkExams.length
        : 0;

    // b. UKJ Average
    const ukjExams = exams.filter(
      (e) => e.examCategory === "UKJ" && e.finalScore != null,
    );
    const avgUKJ =
      ukjExams.length > 0
        ? ukjExams.reduce((sum, e) => sum + Number(e.finalScore), 0) /
          ukjExams.length
        : 0;

    // c. Suluk Score (Avg of scoreAdab)
    // Note: Frontend uses exams with valid scoreAdab.
    // Usually Suluk exam category has scoreAdab, but check all.
    const sulukExams = exams.filter(
      (e) => e.scoreAdab != null && e.scoreAdab > 0,
    );
    const avgSuluk =
      sulukExams.length > 0
        ? sulukExams.reduce((sum, e) => sum + Number(e.scoreAdab), 0) /
          sulukExams.length
        : 0;

    // d. UA Score
    const uaExam = exams.find(
      (e) =>
        e.examCategory === "UA" ||
        e.examType === "Ujian Akhir" ||
        e.examType === "UA",
    );
    const uaScore = uaExam ? Number(uaExam.finalScore) : 0;

    // e. Final Calculation
    // Logic: (UPK + UKJ + UA + Suluk) / 4
    // Filter out zero components?? Frontend says: "filter(v => v > 0)" then avg.
    // Wait, frontend logic: `const components = [upk, ukj, ua, suluk].filter((v) => v > 0);`
    // Then `return ((upk + ukj + ua + suluk) / 4).toFixed(2);`
    // Actually the Frontend implementation I saw earlier was:
    // `return ((upk + ukj + ua + suluk) / 4).toFixed(2);`
    // The filter line `const components = ...` was commented out or unused in the return statement in my memory?
    // Let's re-read the snippet I viewed in Step 1306.
    // Line 1060: `return ((upk + ukj + ua + suluk) / 4).toFixed(2);`
    // It divides by 4 regardless of whether they exist (as long as they are 0 if missing).
    // Let's stick to the divisor 4.

    const finalScoreVal = (avgUPK + avgUKJ + avgSuluk + uaScore) / 4;
    const finalScore = finalScoreVal > 0 ? finalScoreVal.toFixed(2) : "-";

    // 5c. Calculate Ziyadah Juz (Total Pages / 20)
    // Formula: Total Ziyadah Pages in Semester / 20
    const totalZiyadahPages = ziyadah.reduce((sum, d) => {
      let p = 0;
      if (d.totalPages) p = Number(d.totalPages);
      else if (d.pageNumber) p = 1;
      return sum + p;
    }, 0);
    // Convert to Juz (2 decimal places) but as number for comparison
    const ziyadahJuz = Number((totalZiyadahPages / 20).toFixed(2));

    let keterangan = "Di Bawah Target";
    const totalPagesVal = Number(totalPages.toFixed(2));

    // Note: totalPagesVal is SAME as totalZiyadahPages if only Ziyadah is counted above in Step 4.
    // In Step 4, we query type='ziyadah' so yes, totalPages = totalZiyadahPages.

    // Recalculate Keterangan using JUZ if targetJuz is available
    if (target && target.targetJuz && Number(target.targetJuz) > 0) {
      // Compare by Juz
      const targetJuzVal = Number(target.targetJuz);
      if (ziyadahJuz >= targetJuzVal) {
        keterangan =
          ziyadahJuz > targetJuzVal ? "Melebihi Target" : "Sesuai Target";
      } else {
        keterangan = "Di Bawah Target";
      }
    } else {
      // Compare by Pages
      if (totalPagesVal >= finalTargetPages) {
        keterangan =
          totalPagesVal > finalTargetPages
            ? "Melebihi Target"
            : "Sesuai Target";
      }
    }

    return c.json({
      success: true,
      data: {
        student: {
          ...student,
          halaqah: (halaqahMember?.halaqah as any)?.name || "-",
          className: student.class?.name || "-",
          homeroomTeacher: homeroomTeacherName,
        },
        exams,
        attendance,
        totalHafalan: totalPages.toFixed(2),
        totalJuzUKJ: ziyadahJuz, // Replaced UKJ count with Ziyadah Juz Calculation
        finalScore: finalScore || "-",
        keterangan, // ST/MT/DT text
        settings: { ...(tahfidzSettings || {}), cityName },
        mading: madingData,
        target: {
          ...(target || { level: "Default", targetPages: 50 }),
          targetPages: finalTargetPages,
        },
      },
    });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// POST /report-card/:studentId/publish - freeze tahfidz report card snapshot
app.post(
  "/report-card/:studentId/publish",
  zValidator("json", reportCardPublishSchema),
  async (c) => {
    const studentId = parseInt(c.req.param("studentId"));
    const body = c.req.valid("json");
    const semester = String(normalizeSemester(body.semester) || 1) as "1" | "2";

    try {
      const user = c.get("user");

      await assertAcademicPeriodWritable(
        body.academicYear,
        semester,
        "publish rapor tahfidz",
      );

      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });

      if (!student) {
        return c.json({ success: false, message: "Santri tidak ditemukan" }, 404);
      }

      const existing = await db.query.tahfidzReportCards.findFirst({
        where: and(
          eq(tahfidzReportCards.studentId, studentId),
          eq(tahfidzReportCards.academicYear, body.academicYear),
          eq(tahfidzReportCards.semester, semester),
        ),
      });

      const reportPayload = {
        studentId,
        academicYear: body.academicYear,
        semester,
        notes: body.notes ?? null,
        result: body.result ?? null,
        sickCount: body.sickCount ?? 0,
        permissionCount: body.permissionCount ?? 0,
        alphaCount: body.alphaCount ?? 0,
        generatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(tahfidzReportCards)
          .set(reportPayload)
          .where(eq(tahfidzReportCards.id, existing.id));
      } else {
        await db.insert(tahfidzReportCards).values(reportPayload);
      }

      const savedReportCard = await db.query.tahfidzReportCards.findFirst({
        where: and(
          eq(tahfidzReportCards.studentId, studentId),
          eq(tahfidzReportCards.academicYear, body.academicYear),
          eq(tahfidzReportCards.semester, semester),
        ),
      });

      const payload = await buildTahfidzReportSnapshotPayload({
        studentId,
        academicYear: body.academicYear,
        semester,
      });

      const snapshot = await createOrUpdateReportSnapshot({
        reportType: "tahfidz",
        studentId,
        classId: student.classId,
        reportId: null,
        academicYear: body.academicYear,
        semester,
        status: "published",
        payload,
        publishedBy: user?.userId || null,
      });

      await writeAuditLog({
        actorUserId: user?.userId || null,
        entityType: "tahfidz_report_card",
        entityId: savedReportCard?.id,
        action: "publish_snapshot",
        beforeJson: existing,
        afterJson: { reportCard: savedReportCard, snapshot },
        ipAddress: c.req.header("x-forwarded-for") || null,
        userAgent: c.req.header("user-agent") || null,
      });

      return c.json({
        success: true,
        message: "Rapor tahfidz berhasil dipublish dan disnapshot",
        data: savedReportCard,
        snapshot,
      });
    } catch (e: any) {
      const guardResponse = academicPeriodGuardErrorResponse(c, e);
      if (guardResponse) return guardResponse;

      return c.json(
        { success: false, message: e.message || "Gagal publish rapor tahfidz" },
        500,
      );
    }
  },
);

// GET /exams/template - Download Template Import
app.get("/exams/template", async (c) => {
  const category = c.req.query("category") || "Other"; // UPK, UKJ, UA, Suluk
  const filterType = c.req.query("filterType"); // class | halaqah
  const filterId = c.req.query("filterId");
  const year = c.req.query("year") || "";
  const semester = c.req.query("semester") || "";

  if (!filterType || !filterId) {
    return c.json(
      { success: false, message: "Filter (Class/Halaqah) required" },
      400,
    );
  }

  try {
    // 1. Fetch Students
    let studentList: { id: number; nis: string; name: string }[] = [];

    if (filterType === "class") {
      const results = await db
        .select({
          id: students.id,
          nis: students.nis,
          name: students.fullName,
        })
        .from(students)
        .where(
          and(
            eq(students.classId, Number(filterId)),
            eq(students.status, "active"),
          ),
        )
        .orderBy(asc(students.fullName));
      studentList = results;
    } else if (filterType === "halaqah") {
      const results = await db
        .select({
          id: students.id,
          nis: students.nis,
          name: students.fullName,
        })
        .from(halaqahMembers)
        .innerJoin(students, eq(halaqahMembers.studentId, students.id))
        .where(
          and(
            eq(halaqahMembers.halaqahId, Number(filterId)),
            eq(halaqahMembers.status, "active"),
          ),
        )
        .orderBy(asc(students.fullName));
      studentList = results;
    }

    if (studentList.length === 0) {
      return c.json(
        { success: false, message: "Tidak ada siswa dalam filter ini" },
        404,
      );
    }

    // 2. Prepare Columns based on Category
    // Common: No, NIS, Nama Santri
    const headers = ["No", "NIS", "Nama Santri"];
    const keys = ["no", "nis", "name"];

    // Category specific
    if (category === "UPK") {
      headers.push(
        "Juz (Angka)",
        "Halaman Mulai",
        "Halaman Akhir",
        "Kelancaran (0-100)",
        "Tajwid (0-100)",
        "Makhraj (0-100)",
        "Adab (0-100)",
        "Catatan",
      );
      keys.push(
        "juz",
        "startPage",
        "endPage",
        "scoreFluency",
        "scoreTajwid",
        "scoreMakhraj",
        "scoreAdab",
        "notes",
      );
    } else if (category === "UKJ") {
      headers.push(
        "Juz (Angka)",
        "Kelancaran (0-100)",
        "Tajwid (0-100)",
        "Makhraj (0-100)",
        "Adab (0-100)",
        "Catatan",
      );
      keys.push(
        "juz",
        "scoreFluency",
        "scoreTajwid",
        "scoreMakhraj",
        "scoreAdab",
        "notes",
      );
    } else {
      // UA, Suluk, Other
      headers.push(
        "Nilai Akhir (0-100)",
        "Keterangan (Lulus/Tidak/Bersyarat)",
        "Catatan",
      );
      keys.push("finalScore", "verdict", "notes");
    }

    // 3. Create Data Rows
    const data = studentList.map((s, idx) => {
      const row: any = {
        no: idx + 1,
        nis: s.nis,
        name: s.name,
      };
      // Fill empty slots for users to fill
      // Using generic logic? ExcelJS is easier for this, but XLSX requires array of arrays or objects.
      // Array of arrays is best for ordering.
      return row;
    });

    // Convert to AOA for XLSX
    const wsData = [
      [`Template Import Ujian Tahfidz - ${category}`], // Title
      [`Tahun: ${year}, Semester: ${semester}`], // Metadata
      [], // Spacer
      headers,
    ];

    data.forEach((row) => {
      const r = [row.no, row.nis, row.name];
      // Empty cells for the rest
      for (let i = 3; i < headers.length; i++) {
        r.push("");
      }
      wsData.push(r);
    });

    // 4. Generate Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set Column Widths (Optional)
    const wscols = [
      { wch: 5 }, // No
      { wch: 15 }, // NIS
      { wch: 30 }, // Name
      { wch: 10 }, // Juz/Score
      { wch: 10 }, // Page/..
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 30 }, // Notes
    ];
    ws["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Template");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    c.header(
      "Content-Disposition",
      `attachment; filename="Template_Exams_${category}_${year.replace(
        /[^a-zA-Z0-9]/g,
        "",
      )}_${semester}.xlsx"`,
    );
    c.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    return c.body(buf);
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// POST /exams/import - Import Excel
app.post("/exams/import", async (c) => {
  try {
    const dryRun = c.req.query("dryRun") === "true";
    const body = await c.req.parseBody();
    const file = body["file"]; // File param
    const academicYear = (body["academicYear"] as string) || "";
    const semester = (body["semester"] || "1") as
      | "1"
      | "2"
      | "ganjil"
      | "genap";
    const examinerId = parseInt((body["examinerId"] as string) || "0");
    const examDateStr = (body["examDate"] as string) || "";
    const category = (body["category"] as string) || "Other";

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: "File is required" }, 400);
    }

    if (!dryRun && (!examinerId || !examDateStr)) {
      // For preview, we might be lenient or just validate strictness same as import
      // But let's enforce strictness for simplicity
      return c.json(
        { success: false, message: "Examiner and Date required" },
        400,
      );
    }

    // 1. Read File
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return c.json(
        { success: false, message: "File Excel kosong atau tidak valid" },
        400,
      );
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return c.json({ success: false, message: "Worksheet tidak valid" }, 400);
    }

    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 3 });

    let successCount = 0;
    let failCount = 0;
    const errors: { row: number; error: string; nis?: string }[] = [];
    const validData: any[] = []; // For preview

    const examDate = new Date(examDateStr);

    // 2. Process Rows
    // Using for loop with index to track row number (jsonData index + 4 + 1 for user friendly row number or just + 5)
    // Header is row 4 (idx 3). So data starts at row 5 (idx 4).
    const startRowOffset = 5;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + startRowOffset;
      const nis = row["NIS"];

      if (!nis) {
        // Skip empty rows or log error?
        // errors.push({ row: rowNum, error: "NIS kosong" });
        continue;
      }

      try {
        const student = await db.query.students.findFirst({
          where: eq(students.nis, String(nis).trim()),
        });

        if (!student) {
          failCount++;
          errors.push({
            row: rowNum,
            error: `NIS ${nis} tidak ditemukan`,
            nis,
          });
          continue;
        }

        const payload: any = {
          studentId: student.id,
          examinerId,
          examDate,
          examCategory: category as any,
          examType: `${category} Import`,
          academicYear,
          semester: semester as any,
        };

        let calculatedFinalScore = 0;

        if (category === "UPK") {
          payload.juz = row["Juz (Angka)"];
          payload.startPage = row["Halaman Mulai"];
          payload.endPage = row["Halaman Akhir"];
          payload.scoreFluency = row["Kelancaran (0-100)"];
          payload.scoreTajwid = row["Tajwid (0-100)"];
          payload.scoreMakhraj = row["Makhraj (0-100)"];
          payload.scoreAdab = row["Adab (0-100)"];
          payload.notes = row["Catatan"];

          const scores = [
            payload.scoreFluency,
            payload.scoreTajwid,
            payload.scoreMakhraj,
            payload.scoreAdab,
          ].map((v) => Number(v) || 0);

          calculatedFinalScore = Math.round(
            scores.reduce((a, b) => a + b, 0) / 4,
          );
        } else if (category === "UKJ") {
          payload.juz = row["Juz (Angka)"];
          payload.scoreFluency = row["Kelancaran (0-100)"];
          payload.scoreTajwid = row["Tajwid (0-100)"];
          payload.scoreMakhraj = row["Makhraj (0-100)"];
          payload.scoreAdab = row["Adab (0-100)"];
          payload.notes = row["Catatan"];

          const scores = [
            payload.scoreFluency,
            payload.scoreTajwid,
            payload.scoreMakhraj,
            payload.scoreAdab,
          ].map((v) => Number(v) || 0);
          calculatedFinalScore = Math.round(
            scores.reduce((a, b) => a + b, 0) / 4,
          );
        } else {
          calculatedFinalScore = Number(row["Nilai Akhir (0-100)"]) || 0;

          let rawVerdict =
            (row["Keterangan (Lulus/Tidak/Bersyarat)"] as string) || "";
          rawVerdict = rawVerdict.toLowerCase().trim();

          let verdictValue = "fail"; // Default
          if (rawVerdict.includes("lulus") && !rawVerdict.includes("tidak")) {
            verdictValue = "pass";
          } else if (
            rawVerdict.includes("tidak") ||
            rawVerdict.includes("gagal")
          ) {
            verdictValue = "fail";
          } else if (rawVerdict.includes("bersyarat")) {
            verdictValue = "conditional";
          } else {
            // Fallback auto verdict logic if text is unknown/empty
            verdictValue = calculatedFinalScore >= 75 ? "pass" : "fail";
          }

          payload.verdict = verdictValue;
          payload.notes = row["Catatan"];
        }

        payload.finalScore = calculatedFinalScore;
        if (category === "UPK" || category === "UKJ") {
          payload.verdict = calculatedFinalScore >= 75 ? "pass" : "fail";
        }

        // For Suluk and UA, check for duplicate (one per student per semester per academic year)
        // This applies to both preview and actual import
        if (category === "Suluk" || category === "UA") {
          const existing = await db.query.tahfidzExams.findFirst({
            where: and(
              eq(tahfidzExams.studentId, student.id),
              eq(tahfidzExams.examCategory, category as any),
              eq(tahfidzExams.academicYear, String(academicYear).trim()),
              eq(tahfidzExams.semester, String(semester).trim() as any),
            ),
          });

          if (existing) {
            failCount++;
            const categoryLabel =
              category === "Suluk" ? "Suluk" : "Ujian Akhir";
            errors.push({
              row: rowNum,
              error: `Data ${categoryLabel} sudah ada untuk siswa ini di semester ini`,
              nis: String(nis),
            });
            continue;
          }
        }

        // Preview Optimization: Include basic student info in payload for display
        if (dryRun) {
          validData.push({
            ...payload,
            studentName: student.fullName,
            nis: student.nis,
            row: rowNum,
          });
        } else {
          await db.insert(tahfidzExams).values(payload);
        }
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push({ row: rowNum, error: err.message, nis });
      }
    }

    if (dryRun) {
      return c.json({
        success: true,
        data: {
          totalRows: jsonData.length,
          validRows: successCount,
          invalidRows: failCount,
          validData,
          errors,
        },
      });
    }

    return c.json({
      success: true,
      message: `Import selesai. Sukses: ${successCount}, Gagal: ${failCount}`,
      errors,
    });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});
