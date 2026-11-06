import { Hono } from "hono";
import { db } from "../db";
import {
  studentLeaves,
  studentLeaveItems,
  students,
  parents,
  classes,
  rooms,
  studentAttendances,
  tahfidzDeposits,
  halaqahMembers,
  healthExaminations,
  pointRules,
  rewardsPunishments,
  settings,
} from "../db/schema";
import { eq, and, gte, lte, inArray, sql, or, like, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getStudentGenderScope, getAllowedStudentIds } from "../utils/gender-scope";

const studentLeavesRoute = new Hono();

// ============ AUTO-ENSURE SCHEMA COLUMNS ============
let schemaEnsured = false;
export async function ensureStudentLeavesSchema() {
  if (schemaEnsured) return;
  const alterStatements = [
    "ALTER TABLE `student_leaves` ADD `leave_number` varchar(80)",
    "ALTER TABLE `student_leaves` ADD `qr_token` varchar(100)",
    "ALTER TABLE `student_leaves` ADD `leave_category` varchar(50) DEFAULT 'pulang'",
    "ALTER TABLE `student_leaves` ADD `start_time` varchar(10) DEFAULT '08:00'",
    "ALTER TABLE `student_leaves` ADD `end_time` varchar(10) DEFAULT '17:00'",
    "ALTER TABLE `student_leaves` ADD `destination` varchar(255)",
    "ALTER TABLE `student_leaves` ADD `pickup_name` varchar(150)",
    "ALTER TABLE `student_leaves` ADD `pickup_relation` varchar(100)",
    "ALTER TABLE `student_leaves` ADD `pickup_phone` varchar(50)",
    "ALTER TABLE `student_leaves` ADD `requested_by_role` varchar(30) DEFAULT 'staff'",
    "ALTER TABLE `student_leaves` ADD `status` varchar(30) NOT NULL DEFAULT 'approved'",
    "ALTER TABLE `student_leaves` ADD `rejection_reason` text",
    "ALTER TABLE `student_leaves` ADD `approved_by` int",
    "ALTER TABLE `student_leaves` ADD `approved_at` timestamp NULL",
    "ALTER TABLE `student_leaves` ADD `checked_out_at` timestamp NULL",
    "ALTER TABLE `student_leaves` ADD `checked_out_by` int",
    "ALTER TABLE `student_leaves` ADD `checked_in_at` timestamp NULL",
    "ALTER TABLE `student_leaves` ADD `checked_in_by` int",
    "ALTER TABLE `student_leaves` ADD `late_minutes` int DEFAULT 0",
    "ALTER TABLE `student_leaves` ADD `late_handling` varchar(30)",
    "ALTER TABLE `student_leaves` ADD `late_notes` text",
    "ALTER TABLE `student_leaves` ADD `punishment_id` int",
  ];

  for (const stmt of alterStatements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: any) {
      const msg = `${err.message || ""} ${err.cause?.message || ""} ${err.cause?.sqlMessage || ""}`;
      if (
        !msg.includes("Duplicate column") &&
        err.code !== "ER_DUP_FIELDNAME" &&
        err.cause?.code !== "ER_DUP_FIELDNAME"
      ) {
        console.warn("Notice on ensureStudentLeavesSchema:", msg.slice(0, 120));
      }
    }
  }

  // Backfill qr_token & leave_number for older rows that don't have one
  try {
    const missingRows = await db.query.studentLeaves.findMany({
      where: sql`${studentLeaves.qrToken} IS NULL OR ${studentLeaves.qrToken} = ''`,
    });
    for (const row of missingRows) {
      const createdDate = row.createdAt ? new Date(row.createdAt) : new Date();
      const token = generateQrToken(row.id, createdDate);
      const number = row.leaveNumber || generateLeaveNumber(row.id, createdDate);
      await db
        .update(studentLeaves)
        .set({ qrToken: token, leaveNumber: number })
        .where(eq(studentLeaves.id, row.id));
    }
  } catch (e) {
    console.warn("Backfill student_leaves tokens warning:", e);
  }

  schemaEnsured = true;
}

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function generateQrToken(leaveId: number, dateObj: Date = new Date()): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SLV-${y}${m}${d}-${String(leaveId).padStart(4, "0")}-${suffix}`;
}

export function generateLeaveNumber(leaveId: number, dateObj: Date = new Date()): string {
  const romanMonth = ROMAN_MONTHS[dateObj.getMonth()] || "I";
  const year = dateObj.getFullYear();
  return `${String(leaveId).padStart(3, "0")}/SIJ-KSN/${romanMonth}/${year}`;
}

export function formatDateOnly(d: Date | string): string {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dateObj = new Date(d);
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeDeadlineDate(endDate: Date | string, endTime?: string | null): Date {
  const dateStr = formatDateOnly(endDate);
  const timeStr = endTime && /^\d{2}:\d{2}/.test(endTime) ? endTime.slice(0, 5) : "17:00";
  // Parse in WIB (+07:00)
  return new Date(`${dateStr}T${timeStr}:00+07:00`);
}

export function computeLateMinutes(
  endDate: Date | string,
  endTime?: string | null,
  referenceDate: Date = new Date()
): number {
  const deadline = computeDeadlineDate(endDate, endTime);
  const diffMs = referenceDate.getTime() - deadline.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 60000);
}

export function formatDurationMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 menit";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} menit`);
  return parts.join(" ");
}

// Helper: Sync Attendance & Mutabaah for a leave
export async function syncLeaveAttendanceAndMutabaah(
  tx: any,
  params: {
    type: "sick" | "permit";
    startDate: string | Date;
    endDate: string | Date;
    reason: string;
    studentIds: number[];
    userId: number;
  }
) {
  const start = new Date(formatDateOnly(params.startDate));
  const end = new Date(formatDateOnly(params.endDate));
  const notes = `${params.reason} (Otomatis dari Izin Pulang)`;

  for (const studentId of params.studentIds) {
    const mentorMember = await tx.query.halaqahMembers.findFirst({
      where: eq(halaqahMembers.studentId, studentId),
      with: {
        halaqah: { with: { mentors: true } },
      },
    });
    const teacherId =
      mentorMember?.halaqah?.mentors?.find((m: any) => m.role === "lead")?.teacherId ||
      mentorMember?.halaqah?.mentors?.[0]?.teacherId;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split("T")[0] as string;
      const attendStatus = params.type === "sick" ? "sick" : "permitted";

      const existingAtt = await tx.query.studentAttendances.findFirst({
        where: and(
          eq(studentAttendances.studentId, studentId),
          sql`DATE(${studentAttendances.date}) = ${dateString}`
        ),
      });

      if (existingAtt) {
        await tx
          .update(studentAttendances)
          .set({ status: attendStatus, notes })
          .where(eq(studentAttendances.id, existingAtt.id));
      } else {
        await tx.insert(studentAttendances).values({
          studentId,
          date: new Date(dateString),
          status: attendStatus,
          notes,
          createdBy: params.userId,
        });
      }

      if (teacherId) {
        const mutabaahType = params.type === "sick" ? "sakit" : "izin";
        const existingDep = await tx.query.tahfidzDeposits.findFirst({
          where: and(
            eq(tahfidzDeposits.studentId, studentId),
            sql`DATE(${tahfidzDeposits.depositDate}) = ${dateString}`
          ),
        });

        if (existingDep) {
          await tx
            .update(tahfidzDeposits)
            .set({ type: mutabaahType, notes, teacherId })
            .where(eq(tahfidzDeposits.id, existingDep.id));
        } else {
          await tx.insert(tahfidzDeposits).values({
            studentId,
            teacherId,
            depositDate: new Date(dateString),
            type: mutabaahType,
            notes,
          });
        }
      }
    }
  }
}

export async function cleanupLeaveAttendanceAndMutabaah(tx: any, oldLeave: any) {
  if (!oldLeave?.items?.length) return;
  const oldStart = new Date(formatDateOnly(oldLeave.startDate));
  const oldEnd = new Date(formatDateOnly(oldLeave.endDate));
  for (const item of oldLeave.items) {
    for (let d = new Date(oldStart); d <= oldEnd; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split("T")[0] as string;
      await tx.delete(studentAttendances).where(
        and(
          eq(studentAttendances.studentId, item.studentId),
          sql`DATE(${studentAttendances.date}) = ${dateString}`,
          like(studentAttendances.notes, "%Otomatis dari Izin Pulang%")
        )
      );
      await tx.delete(tahfidzDeposits).where(
        and(
          eq(tahfidzDeposits.studentId, item.studentId),
          sql`DATE(${tahfidzDeposits.depositDate}) = ${dateString}`,
          like(tahfidzDeposits.notes, "%Otomatis dari Izin Pulang%")
        )
      );
    }
  }
}

export async function enrichLeaveRecords(leaves: any[]) {
  if (!leaves.length) return [];

  // Gather classIds, roomIds, parentIds, punishmentIds
  const classIds = new Set<number>();
  const roomIds = new Set<number>();
  const parentIds = new Set<number>();
  const punishmentIds = new Set<number>();

  for (const l of leaves) {
    if (l.punishmentId) punishmentIds.add(l.punishmentId);
    for (const item of l.items || []) {
      if (item.student?.classId) classIds.add(item.student.classId);
      if (item.student?.roomId) roomIds.add(item.student.roomId);
      if (item.student?.parentId) parentIds.add(item.student.parentId);
    }
  }

  const [classRows, roomRows, parentRows, punishmentRows] = await Promise.all([
    classIds.size > 0
      ? db.select().from(classes).where(inArray(classes.id, Array.from(classIds)))
      : Promise.resolve([]),
    roomIds.size > 0
      ? db.select().from(rooms).where(inArray(rooms.id, Array.from(roomIds)))
      : Promise.resolve([]),
    parentIds.size > 0
      ? db.select().from(parents).where(inArray(parents.id, Array.from(parentIds)))
      : Promise.resolve([]),
    punishmentIds.size > 0
      ? db
          .select()
          .from(rewardsPunishments)
          .where(inArray(rewardsPunishments.id, Array.from(punishmentIds)))
      : Promise.resolve([]),
  ]);

  const classMap = new Map(classRows.map((c) => [c.id, c.name]));
  const roomMap = new Map(roomRows.map((r) => [r.id, r.name]));
  const parentMap = new Map(parentRows.map((p) => [p.id, p]));
  const punishmentMap = new Map(punishmentRows.map((p) => [p.id, p]));

  const now = new Date();

  return leaves.map((l) => {
    const liveLateMinutes =
      l.status === "checked_out"
        ? computeLateMinutes(l.endDate, l.endTime, now)
        : l.status === "returned_late"
        ? l.lateMinutes || 0
        : 0;
    const isOverdue = l.status === "checked_out" && liveLateMinutes > 0;

    return {
      ...l,
      isOverdue,
      currentOverdueMinutes: liveLateMinutes,
      overdueDurationText: liveLateMinutes > 0 ? formatDurationMinutes(liveLateMinutes) : null,
      punishment: l.punishmentId ? punishmentMap.get(l.punishmentId) || null : null,
      items: (l.items || []).map((item: any) => {
        const s = item.student;
        const p = s?.parentId ? parentMap.get(s.parentId) : null;
        return {
          ...item,
          student: s
            ? {
                ...s,
                className: s.classId ? classMap.get(s.classId) || null : null,
                roomName: s.roomId ? roomMap.get(s.roomId) || null : null,
                fatherName: p?.fatherName || null,
                motherName: p?.motherName || null,
                parentPhone: p?.phone || null,
              }
            : null,
        };
      }),
    };
  });
}

studentLeavesRoute.use("*", authMiddleware);
studentLeavesRoute.use("*", async (c, next) => {
  await ensureStudentLeavesSchema();
  await next();
});

// GET / - List leave requests
studentLeavesRoute.get("/", async (c) => {
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const status = c.req.query("status");
  const q = c.req.query("q") || "";

  const user = c.get("user");
  const genderScope = await getStudentGenderScope(user.userId, user.role);
  const allowedIds = await getAllowedStudentIds(genderScope);

  const results = await db.query.studentLeaves.findMany({
    where: and(
      startDate ? gte(studentLeaves.startDate, new Date(startDate)) : undefined,
      endDate ? lte(studentLeaves.endDate, new Date(endDate)) : undefined,
      status ? eq(studentLeaves.status, status) : undefined,
      q
        ? or(
            like(studentLeaves.reason, `%${q}%`),
            like(studentLeaves.qrToken, `%${q}%`),
            like(studentLeaves.leaveNumber, `%${q}%`),
            like(studentLeaves.pickupName, `%${q}%`)
          )
        : undefined
    ),
    with: {
      items: {
        where: allowedIds ? inArray(studentLeaveItems.studentId, allowedIds) : undefined,
        with: {
          student: true,
          clinicExam: true,
        },
      },
    },
    orderBy: [desc(studentLeaves.createdAt)],
  });

  const filtered = allowedIds ? results.filter((r) => r.items.length > 0) : results;
  const enriched = await enrichLeaveRecords(filtered);

  return c.json({ success: true, data: enriched });
});

// GET /point-rules - Punishment rules for late return handling
studentLeavesRoute.get("/point-rules", async (c) => {
  try {
    const rules = await db.query.pointRules.findMany({
      where: eq(pointRules.type, "punishment"),
      orderBy: (r, { asc }) => [asc(r.category), asc(r.name)],
    });
    return c.json({ success: true, data: rules });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// GET /header-logo - Get active letterhead logo (Cascading: Kesantrian -> Academic)
studentLeavesRoute.get("/header-logo", async (c) => {
  try {
    const rows = await db.query.settings.findMany({
      where: inArray(settings.key, [
        "kesantrian_report_header_logo",
        "academic_report_header_logo",
      ]),
    });
    const map = rows.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const kesantrianLogo = map["kesantrian_report_header_logo"] || "";
    const academicLogo = map["academic_report_header_logo"] || "";
    const activeLogo = kesantrianLogo || academicLogo || "";

    return c.json({
      success: true,
      data: {
        kesantrianLogo,
        academicLogo,
        activeLogo,
        isCustomKesantrian: !!kesantrianLogo,
      },
    });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// PUT /header-logo - Update dedicated Kesantrian letterhead logo
studentLeavesRoute.put("/header-logo", async (c) => {
  try {
    const user = c.get("user");
    if (!["admin", "superadmin", "kesantrian"].includes(user.role)) {
      return c.json({ success: false, message: "Hanya admin/kesantrian yang berwenang" }, 403);
    }
    const body = await c.req.json();
    const logo = typeof body.logo === "string" ? body.logo.trim() : "";

    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, "kesantrian_report_header_logo"),
    });

    if (existing) {
      await db
        .update(settings)
        .set({ value: logo })
        .where(eq(settings.key, "kesantrian_report_header_logo"));
    } else {
      await db.insert(settings).values({
        key: "kesantrian_report_header_logo",
        value: logo,
        description: "Kop Surat Khusus Kesantrian / Asrama untuk Surat Izin Santri",
      });
    }

    return c.json({
      success: true,
      message: logo
        ? "Kop Surat Khusus Kesantrian berhasil disimpan"
        : "Kop Surat Khusus Kesantrian dihapus (otomatis kembali menggunakan Kop Akademik)",
    });
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500);
  }
});

// GET /scan/:qrToken - Lookup leave by QR Code token / leaveNumber
studentLeavesRoute.get("/scan/:qrToken", async (c) => {
  const rawToken = decodeURIComponent(c.req.param("qrToken")).trim();
  const user = c.get("user");
  const genderScope = await getStudentGenderScope(user.userId, user.role);
  const allowedIds = await getAllowedStudentIds(genderScope);

  const leave = await db.query.studentLeaves.findFirst({
    where: or(
      eq(studentLeaves.qrToken, rawToken),
      eq(studentLeaves.leaveNumber, rawToken),
      /^\d+$/.test(rawToken) ? eq(studentLeaves.id, Number(rawToken)) : undefined
    ),
    with: {
      items: {
        where: allowedIds ? inArray(studentLeaveItems.studentId, allowedIds) : undefined,
        with: {
          student: true,
          clinicExam: true,
        },
      },
    },
  });

  if (!leave || (allowedIds && leave.items.length === 0)) {
    return c.json(
      {
        success: false,
        message: "Data Surat Izin / QR Code tidak ditemukan atau di luar cakupan akses Anda.",
      },
      404
    );
  }

  const [enriched] = await enrichLeaveRecords([leave]);
  const now = new Date();
  const lateMinutes = computeLateMinutes(leave.endDate, leave.endTime, now);

  let nextAction: "approve" | "checkout" | "checkin" | "completed" | "rejected" = "checkout";
  if (leave.status === "pending") nextAction = "approve";
  else if (leave.status === "approved") nextAction = "checkout";
  else if (leave.status === "checked_out") nextAction = "checkin";
  else if (leave.status === "returned" || leave.status === "returned_late")
    nextAction = "completed";
  else if (leave.status === "rejected") nextAction = "rejected";

  return c.json({
    success: true,
    data: {
      ...enriched,
      nextAction,
      scanPreview: {
        scannedAt: now.toISOString(),
        isLate: lateMinutes > 0,
        lateMinutes,
        lateDurationText: formatDurationMinutes(lateMinutes),
        deadlineIso: computeDeadlineDate(leave.endDate, leave.endTime).toISOString(),
      },
    },
  });
});

// GET /students/search - Search with higher limit
studentLeavesRoute.get("/students/search", async (c) => {
  const q = c.req.query("q") || "";
  const user = c.get("user");
  const genderScope = await getStudentGenderScope(user.userId, user.role);
  const nameOrNis = or(like(students.fullName, `%${q}%`), like(students.nis, `%${q}%`));
  const results = await db.query.students.findMany({
    where: genderScope ? and(nameOrNis, eq(students.gender, genderScope)) : nameOrNis,
    limit: 500,
  });
  return c.json({ success: true, data: results });
});

// GET /clinic-data - Fetch clinic exams for students and date range
studentLeavesRoute.get("/clinic-data", async (c) => {
  const studentIds = c.req.query("studentIds")?.split(",").map(Number) || [];
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (studentIds.length === 0 || !startDate || !endDate) {
    return c.json({ success: true, data: [] });
  }

  const user = c.get("user");
  const genderScope = await getStudentGenderScope(user.userId, user.role);

  const exams = await db
    .select({
      id: healthExaminations.id,
      patientId: healthExaminations.patientId,
      patientName: students.fullName,
      examinationDate: healthExaminations.examinationDate,
      diagnosis: healthExaminations.diagnosis,
      treatment: healthExaminations.treatment,
    })
    .from(healthExaminations)
    .innerJoin(students, eq(healthExaminations.patientId, students.id))
    .where(
      and(
        inArray(healthExaminations.patientId, studentIds),
        eq(healthExaminations.patientType, "student"),
        sql`${healthExaminations.examinationDate} >= ${startDate}`,
        sql`${healthExaminations.examinationDate} <= ${endDate}`,
        genderScope ? eq(students.gender, genderScope) : undefined
      )
    )
    .orderBy(desc(healthExaminations.examinationDate));

  return c.json({ success: true, data: exams });
});

// POST / - Create leave (Kesantrian / Staff input)
studentLeavesRoute.post(
  "/",
  zValidator(
    "json",
    z.object({
      type: z.enum(["sick", "permit"]),
      leaveCategory: z.string().optional(),
      studentIds: z.array(z.number()).min(1),
      startDate: z.string(),
      endDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      reason: z.string(),
      destination: z.string().optional(),
      pickupName: z.string().optional(),
      pickupRelation: z.string().optional(),
      pickupPhone: z.string().optional(),
      attachment: z.string().optional(),
      clinicExamIds: z.record(z.string(), z.number().nullable()).optional(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");

    try {
      let createdLeaveId = 0;
      await db.transaction(async (tx) => {
        const now = new Date();
        const [leaveRes] = await tx.insert(studentLeaves).values({
          type: body.type,
          leaveCategory: body.leaveCategory || (body.type === "sick" ? "sakit" : "pulang"),
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          startTime: body.startTime || "08:00",
          endTime: body.endTime || "17:00",
          reason: body.reason,
          destination: body.destination || null,
          pickupName: body.pickupName || null,
          pickupRelation: body.pickupRelation || null,
          pickupPhone: body.pickupPhone || null,
          attachment: body.attachment || null,
          requestedByRole: "staff",
          status: "approved",
          approvedBy: user.userId,
          approvedAt: now,
          createdBy: user.userId,
        });
        const leaveId = Number(leaveRes.insertId);
        createdLeaveId = leaveId;

        const qrToken = generateQrToken(leaveId, now);
        const leaveNumber = generateLeaveNumber(leaveId, now);

        await tx
          .update(studentLeaves)
          .set({ qrToken, leaveNumber })
          .where(eq(studentLeaves.id, leaveId));

        for (const studentId of body.studentIds) {
          const examId = body.clinicExamIds?.[String(studentId)] || null;
          await tx.insert(studentLeaveItems).values({
            leaveId,
            studentId,
            clinicExamId: examId,
          });
        }

        await syncLeaveAttendanceAndMutabaah(tx, {
          type: body.type,
          startDate: body.startDate,
          endDate: body.endDate,
          reason: body.reason,
          studentIds: body.studentIds,
          userId: user.userId,
        });
      });

      return c.json({
        success: true,
        message: "Data izin pulang & Surat QR berhasil diterbitkan.",
        data: { id: createdLeaveId },
      });
    } catch (e: any) {
      console.error(e);
      return c.json({ success: false, message: "Gagal menyimpan data: " + e.message }, 500);
    }
  }
);

// POST /:id/approve - Approve pending parent request & issue QR letter
studentLeavesRoute.post(
  "/:id/approve",
  zValidator(
    "json",
    z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        reason: z.string().optional(),
        destination: z.string().optional(),
      })
      .optional()
  ),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json") || {};
    const user = c.get("user");

    try {
      await db.transaction(async (tx) => {
        const leave = await tx.query.studentLeaves.findFirst({
          where: eq(studentLeaves.id, id),
          with: { items: true },
        });
        if (!leave) throw new Error("Data pengajuan izin tidak ditemukan");

        const now = new Date();
        const qrToken = leave.qrToken || generateQrToken(id, now);
        const leaveNumber = leave.leaveNumber || generateLeaveNumber(id, now);

        const finalStartDate = body.startDate ? new Date(body.startDate) : leave.startDate;
        const finalEndDate = body.endDate ? new Date(body.endDate) : leave.endDate;
        const finalReason = body.reason || leave.reason;

        await tx
          .update(studentLeaves)
          .set({
            status: "approved",
            qrToken,
            leaveNumber,
            startDate: finalStartDate,
            endDate: finalEndDate,
            startTime: body.startTime || leave.startTime || "08:00",
            endTime: body.endTime || leave.endTime || "17:00",
            reason: finalReason,
            destination: body.destination !== undefined ? body.destination : leave.destination,
            approvedBy: user.userId,
            approvedAt: now,
            rejectionReason: null,
          })
          .where(eq(studentLeaves.id, id));

        // Sync Attendance & Mutabaah upon approval
        await syncLeaveAttendanceAndMutabaah(tx, {
          type: leave.type,
          startDate: finalStartDate,
          endDate: finalEndDate,
          reason: finalReason,
          studentIds: leave.items.map((i) => i.studentId),
          userId: user.userId,
        });
      });

      return c.json({
        success: true,
        message: "Pengajuan izin disetujui. Surat Izin & QR Code siap dicetak dan di-scan.",
      });
    } catch (e: any) {
      console.error(e);
      return c.json({ success: false, message: "Gagal menyetujui izin: " + e.message }, 500);
    }
  }
);

// POST /:id/reject - Reject pending parent request
studentLeavesRoute.post(
  "/:id/reject",
  zValidator(
    "json",
    z.object({
      rejectionReason: z.string().min(1, "Alasan penolakan wajib diisi"),
    })
  ),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");
    const user = c.get("user");

    try {
      await db.transaction(async (tx) => {
        const leave = await tx.query.studentLeaves.findFirst({
          where: eq(studentLeaves.id, id),
          with: { items: true },
        });
        if (!leave) throw new Error("Data pengajuan izin tidak ditemukan");

        await cleanupLeaveAttendanceAndMutabaah(tx, leave);

        await tx
          .update(studentLeaves)
          .set({
            status: "rejected",
            rejectionReason: body.rejectionReason,
            approvedBy: user.userId,
            approvedAt: new Date(),
          })
          .where(eq(studentLeaves.id, id));
      });

      return c.json({
        success: true,
        message: "Pengajuan izin telah ditolak.",
      });
    } catch (e: any) {
      console.error(e);
      return c.json({ success: false, message: "Gagal menolak izin: " + e.message }, 500);
    }
  }
);

// POST /:id/checkout - Scan 1: Confirm student leaves pesantren (Check-Out)
studentLeavesRoute.post(
  "/:id/checkout",
  zValidator(
    "json",
    z
      .object({
        pickupName: z.string().optional(),
        pickupRelation: z.string().optional(),
        pickupPhone: z.string().optional(),
        notes: z.string().optional(),
      })
      .optional()
  ),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json") || {};
    const user = c.get("user");

    try {
      await db.transaction(async (tx) => {
        const leave = await tx.query.studentLeaves.findFirst({
          where: eq(studentLeaves.id, id),
          with: { items: true },
        });
        if (!leave) throw new Error("Data surat izin tidak ditemukan");
        if (leave.status === "rejected") {
          throw new Error("Surat izin ini berstatus DITOLAK dan tidak dapat digunakan.");
        }
        if (leave.status === "checked_out") {
          throw new Error("Santri ini sudah di-scan keluar sebelumnya.");
        }
        if (leave.status === "returned" || leave.status === "returned_late") {
          throw new Error("Surat izin ini sudah selesai digunakan (santri sudah kembali).");
        }

        const now = new Date();
        const qrToken = leave.qrToken || generateQrToken(id, now);
        const leaveNumber = leave.leaveNumber || generateLeaveNumber(id, now);

        await tx
          .update(studentLeaves)
          .set({
            status: "checked_out",
            qrToken,
            leaveNumber,
            checkedOutAt: now,
            checkedOutBy: user.userId,
            approvedBy: leave.approvedBy || user.userId,
            approvedAt: leave.approvedAt || now,
            pickupName: body.pickupName !== undefined ? body.pickupName : leave.pickupName,
            pickupRelation:
              body.pickupRelation !== undefined ? body.pickupRelation : leave.pickupRelation,
            pickupPhone: body.pickupPhone !== undefined ? body.pickupPhone : leave.pickupPhone,
          })
          .where(eq(studentLeaves.id, id));

        // Ensure attendance & mutabaah synced
        await syncLeaveAttendanceAndMutabaah(tx, {
          type: leave.type,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          studentIds: leave.items.map((i) => i.studentId),
          userId: user.userId,
        });
      });

      return c.json({
        success: true,
        message: "Scan Keluar berhasil! Santri tercatat sedang berada di luar pondok.",
      });
    } catch (e: any) {
      console.error(e);
      return c.json({ success: false, message: e.message || "Gagal konfirmasi keluar" }, 400);
    }
  }
);

// POST /:id/checkin - Scan 2: Confirm student returns to pesantren (Check-In + Late & Discipline Points)
studentLeavesRoute.post(
  "/:id/checkin",
  zValidator(
    "json",
    z.object({
      lateHandling: z.enum(["on_time", "punished", "excused"]).optional(),
      lateNotes: z.string().optional(),
      ruleId: z.number().nullable().optional(),
      points: z.number().optional(),
      punishmentTitle: z.string().optional(),
      punishmentCategory: z.string().optional(),
    })
  ),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");
    const user = c.get("user");

    try {
      let resultStatus = "returned";
      let calculatedLateMinutes = 0;
      let createdPunishmentIds: number[] = [];

      await db.transaction(async (tx) => {
        const leave = await tx.query.studentLeaves.findFirst({
          where: eq(studentLeaves.id, id),
          with: { items: { with: { student: true } } },
        });
        if (!leave) throw new Error("Data surat izin tidak ditemukan");
        if (leave.status === "returned" || leave.status === "returned_late") {
          throw new Error("Santri ini sudah di-scan kembali ke pondok sebelumnya.");
        }
        if (leave.status === "rejected" || leave.status === "pending") {
          throw new Error("Surat izin belum disetujui atau sudah ditolak.");
        }

        const now = new Date();
        calculatedLateMinutes = computeLateMinutes(leave.endDate, leave.endTime, now);
        const isLate = calculatedLateMinutes > 0;

        resultStatus = isLate ? "returned_late" : "returned";
        const handling = isLate ? body.lateHandling || "punished" : "on_time";

        let firstPunishmentId: number | null = null;

        if (isLate && handling === "punished") {
          // Determine rule / points
          let ruleRecord: any = null;
          if (body.ruleId) {
            ruleRecord = await tx.query.pointRules.findFirst({
              where: eq(pointRules.id, body.ruleId),
            });
          }

          const rawPoints =
            body.points !== undefined
              ? Math.abs(body.points)
              : ruleRecord?.defaultPoints
              ? Math.abs(ruleRecord.defaultPoints)
              : 10;
          const negativePoints = -Math.abs(rawPoints);

          const category = body.punishmentCategory || ruleRecord?.category || "Kedisiplinan / Perizinan";
          const title =
            body.punishmentTitle ||
            ruleRecord?.name ||
            "Terlambat Kembali dari Izin Pulang / Keluar";
          const durationText = formatDurationMinutes(calculatedLateMinutes);
          const deadlineStr = `${formatDateOnly(leave.endDate)} pukul ${leave.endTime || "17:00"}`;
          const description = `Terlambat kembali ke pondok selama ${durationText} dari batas jadwal izin (${deadlineStr}). No. Surat: ${
            leave.leaveNumber || leave.qrToken || leave.id
          }.${body.lateNotes ? ` Catatan: ${body.lateNotes}` : ""}`;

          for (const item of leave.items) {
            const [ins] = await tx.insert(rewardsPunishments).values({
              studentId: item.studentId,
              ruleId: ruleRecord?.id || null,
              type: "punishment",
              category,
              title,
              description,
              points: negativePoints,
              date: now,
              givenBy: user.userId,
              notes: body.lateNotes || `Otomatis dari Scan Kembali Izin Pulang (${leave.qrToken})`,
            });
            const pid = Number(ins.insertId);
            createdPunishmentIds.push(pid);
            if (!firstPunishmentId) firstPunishmentId = pid;
          }
        }

        await tx
          .update(studentLeaves)
          .set({
            status: resultStatus,
            checkedOutAt: leave.checkedOutAt || now,
            checkedOutBy: leave.checkedOutBy || user.userId,
            checkedInAt: now,
            checkedInBy: user.userId,
            lateMinutes: calculatedLateMinutes,
            lateHandling: handling,
            lateNotes: body.lateNotes || null,
            punishmentId: firstPunishmentId,
          })
          .where(eq(studentLeaves.id, id));
      });

      const msg =
        resultStatus === "returned_late"
          ? createdPunishmentIds.length > 0
            ? `Scan Kembali berhasil! Santri tercatat TERLAMBAT (${formatDurationMinutes(
                calculatedLateMinutes
              )}) dan poin pelanggaran telah dicatat ke Kedisiplinan.`
            : `Scan Kembali berhasil! Santri tercatat TERLAMBAT (${formatDurationMinutes(
                calculatedLateMinutes
              )}) dengan toleransi uzur (tanpa potong poin).`
          : "Scan Kembali berhasil! Santri kembali TEPAT WAKTU.";

      return c.json({
        success: true,
        message: msg,
        data: {
          status: resultStatus,
          lateMinutes: calculatedLateMinutes,
          punishmentIds: createdPunishmentIds,
        },
      });
    } catch (e: any) {
      console.error(e);
      return c.json({ success: false, message: e.message || "Gagal konfirmasi kembali" }, 400);
    }
  }
);

// PUT /:id - Update leave
studentLeavesRoute.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      type: z.enum(["sick", "permit"]),
      leaveCategory: z.string().optional(),
      studentIds: z.array(z.number()),
      startDate: z.string(),
      endDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      reason: z.string(),
      destination: z.string().optional(),
      pickupName: z.string().optional(),
      pickupRelation: z.string().optional(),
      pickupPhone: z.string().optional(),
      attachment: z.string().optional(),
      clinicExamIds: z.record(z.string(), z.number().nullable()).optional(),
    })
  ),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");
    const user = c.get("user");

    try {
      await db.transaction(async (tx) => {
        const oldLeave = await tx.query.studentLeaves.findFirst({
          where: eq(studentLeaves.id, id),
          with: { items: true },
        });
        if (!oldLeave) throw new Error("Data izin tidak ditemukan");

        await cleanupLeaveAttendanceAndMutabaah(tx, oldLeave);

        await tx
          .update(studentLeaves)
          .set({
            type: body.type,
            leaveCategory:
              body.leaveCategory ||
              oldLeave.leaveCategory ||
              (body.type === "sick" ? "sakit" : "pulang"),
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            startTime: body.startTime || oldLeave.startTime || "08:00",
            endTime: body.endTime || oldLeave.endTime || "17:00",
            reason: body.reason,
            destination:
              body.destination !== undefined ? body.destination : oldLeave.destination,
            pickupName: body.pickupName !== undefined ? body.pickupName : oldLeave.pickupName,
            pickupRelation:
              body.pickupRelation !== undefined ? body.pickupRelation : oldLeave.pickupRelation,
            pickupPhone:
              body.pickupPhone !== undefined ? body.pickupPhone : oldLeave.pickupPhone,
            attachment: body.attachment || null,
          })
          .where(eq(studentLeaves.id, id));

        await tx.delete(studentLeaveItems).where(eq(studentLeaveItems.leaveId, id));

        for (const studentId of body.studentIds) {
          const examId = body.clinicExamIds?.[String(studentId)] || null;
          await tx.insert(studentLeaveItems).values({
            leaveId: id,
            studentId,
            clinicExamId: examId,
          });
        }

        if (oldLeave.status !== "pending" && oldLeave.status !== "rejected") {
          await syncLeaveAttendanceAndMutabaah(tx, {
            type: body.type,
            startDate: body.startDate,
            endDate: body.endDate,
            reason: body.reason,
            studentIds: body.studentIds,
            userId: user.userId,
          });
        }
      });

      return c.json({ success: true, message: "Data izin berhasil diperbarui." });
    } catch (e: any) {
      console.error(e);
      return c.json({ success: false, message: "Gagal memperbarui data: " + e.message }, 500);
    }
  }
);

// DELETE /:id - Delete leave
studentLeavesRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  try {
    await db.transaction(async (tx) => {
      const leave = await tx.query.studentLeaves.findFirst({
        where: eq(studentLeaves.id, id),
        with: {
          items: true,
        },
      });

      if (!leave) throw new Error("Data izin tidak ditemukan");

      await cleanupLeaveAttendanceAndMutabaah(tx, leave);

      await tx.delete(studentLeaves).where(eq(studentLeaves.id, id));
    });

    return c.json({
      success: true,
      message: "Data izin berhasil dihapus dan sinkronisasi dibatalkan.",
    });
  } catch (e: any) {
    console.error(e);
    return c.json({ success: false, message: "Gagal menghapus data: " + e.message }, 500);
  }
});

export default studentLeavesRoute;
