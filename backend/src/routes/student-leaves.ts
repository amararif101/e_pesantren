import { Hono } from "hono";
import { db } from "../db";
import { 
  studentLeaves, 
  studentLeaveItems, 
  students, 
  studentAttendances, 
  tahfidzDeposits, 
  halaqahMembers, 
  halaqahMentors, 
  healthExaminations 
} from "../db/schema";
import { eq, and, gte, lte, inArray, sql, or, like, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getStudentGenderScope, getAllowedStudentIds } from "../utils/gender-scope";

const studentLeavesRoute = new Hono();

studentLeavesRoute.use("*", authMiddleware);

// GET / - List leave requests
studentLeavesRoute.get("/", async (c) => {
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const q = c.req.query("q") || "";

  const user = c.get("user");
  const genderScope = await getStudentGenderScope(user.userId, user.role);
  const allowedIds = await getAllowedStudentIds(genderScope);

  const results = await db.query.studentLeaves.findMany({
    where: and(
      startDate ? gte(studentLeaves.startDate, new Date(startDate)) : undefined,
      endDate ? lte(studentLeaves.endDate, new Date(endDate)) : undefined,
      q ? like(studentLeaves.reason, `%${q}%`) : undefined
    ),
    with: {
      items: {
        where: allowedIds ? inArray(studentLeaveItems.studentId, allowedIds) : undefined,
        with: {
          student: true
        }
      }
    },
    orderBy: [desc(studentLeaves.createdAt)]
  });

  // A guru's own-gender-only view drops all items from a mixed-gender leave
  // header; hide headers that end up with nothing left to show.
  const filtered = allowedIds ? results.filter((r) => r.items.length > 0) : results;

  return c.json({ success: true, data: filtered });
});


// GET /students/search - Search with higher limit
studentLeavesRoute.get("/students/search", async (c) => {
  const q = c.req.query("q") || "";
  const user = c.get("user");
  const genderScope = await getStudentGenderScope(user.userId, user.role);
  const nameOrNis = or(
    like(students.fullName, `%${q}%`),
    like(students.nis, `%${q}%`)
  );
  const results = await db.query.students.findMany({
    where: genderScope ? and(nameOrNis, eq(students.gender, genderScope)) : nameOrNis,
    limit: 500, // Higher limit as requested
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
    .where(and(
      inArray(healthExaminations.patientId, studentIds),
      eq(healthExaminations.patientType, "student"),
      sql`${healthExaminations.examinationDate} >= ${startDate}`,
      sql`${healthExaminations.examinationDate} <= ${endDate}`,
      genderScope ? eq(students.gender, genderScope) : undefined,
    ))
    .orderBy(desc(healthExaminations.examinationDate));

  return c.json({ success: true, data: exams });
});

// POST / - Create leave
studentLeavesRoute.post("/", zValidator("json", z.object({
  type: z.enum(["sick", "permit"]),
  studentIds: z.array(z.number()),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  attachment: z.string().optional(),
  clinicExamIds: z.record(z.string(), z.number().nullable()).optional(),
})), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  try {
    await db.transaction(async (tx) => {
      // 1. Insert Group Leave
      const [leaveRes] = await tx.insert(studentLeaves).values({
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
        attachment: body.attachment || null,
        createdBy: user.userId,
      });
      const leaveId = Number(leaveRes.insertId);

      // 2. Loop students
      for (const studentId of body.studentIds) {
        const examId = body.clinicExamIds?.[String(studentId)] || null;
        
        // Insert Item
        await tx.insert(studentLeaveItems).values({
          leaveId,
          studentId,
          clinicExamId: examId,
        });

        // 3. Integration: Attendance & Mutabaah
        const start = new Date(body.startDate);
        const end = new Date(body.endDate);

        // Find mentor for mutabaah
        const mentorMember = await tx.query.halaqahMembers.findFirst({
          where: eq(halaqahMembers.studentId, studentId),
          with: {
            halaqah: { with: { mentors: true } }
          }
        });
        const teacherId = mentorMember?.halaqah?.mentors?.find((m: any) => m.role === 'lead')?.teacherId 
          || mentorMember?.halaqah?.mentors?.[0]?.teacherId;

        // Loop dates
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateString = d.toISOString().split("T")[0] as string;

          // Attendance
          const attendStatus = body.type === "sick" ? "sick" : "permitted";
          const existingAtt = await tx.query.studentAttendances.findFirst({
            where: and(
              eq(studentAttendances.studentId, studentId),
              sql`DATE(${studentAttendances.date}) = ${dateString}`
            )
          });

          const notes = `${body.reason} (Otomatis dari Izin Pulang)`;

          if (existingAtt) {
            await tx.update(studentAttendances)
              .set({ status: attendStatus, notes })
              .where(eq(studentAttendances.id, existingAtt.id));
          } else {
            await tx.insert(studentAttendances).values({
              studentId,
              date: new Date(dateString),
              status: attendStatus,
              notes,
              createdBy: user.userId
            });
          }

          // Mutabaah
          if (teacherId) {
            const mutabaahType = body.type === "sick" ? "sakit" : "izin";
            const existingDep = await tx.query.tahfidzDeposits.findFirst({
              where: and(
                eq(tahfidzDeposits.studentId, studentId),
                sql`DATE(${tahfidzDeposits.depositDate}) = ${dateString}`
              )
            });

            if (existingDep) {
              await tx.update(tahfidzDeposits)
                .set({ type: mutabaahType, notes, teacherId })
                .where(eq(tahfidzDeposits.id, existingDep.id));
            } else {
              await tx.insert(tahfidzDeposits).values({
                studentId,
                teacherId,
                depositDate: new Date(dateString),
                type: mutabaahType,
                notes
              });
            }
          }
        }
      }
    });

    return c.json({ success: true, message: "Data izin pulang berhasil disimpan." });
  } catch (e: any) {
    console.error(e);
    return c.json({ success: false, message: "Gagal menyimpan data: " + e.message }, 500);
  }
});

// PUT /:id - Update leave
studentLeavesRoute.put("/:id", zValidator("json", z.object({
  type: z.enum(["sick", "permit"]),
  studentIds: z.array(z.number()),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  attachment: z.string().optional(),
  clinicExamIds: z.record(z.string(), z.number().nullable()).optional(),
})), async (c) => {
  const id = Number(c.req.param("id"));
  const body = c.req.valid("json");
  const user = c.get("user");

  try {
    await db.transaction(async (tx) => {
      // 1. Get old data for cleanup
      const oldLeave = await tx.query.studentLeaves.findFirst({
        where: eq(studentLeaves.id, id),
        with: { items: true }
      });
      if (!oldLeave) throw new Error("Data izin tidak ditemukan");

      // 2. Cleanup OLD Attendance & Mutabaah
      const oldStart = new Date(oldLeave.startDate);
      const oldEnd = new Date(oldLeave.endDate);
      for (const item of oldLeave.items) {
        for (let d = new Date(oldStart); d <= oldEnd; d.setDate(d.getDate() + 1)) {
          const dateString = d.toISOString().split("T")[0] as string;
          await tx.delete(studentAttendances).where(and(
            eq(studentAttendances.studentId, item.studentId),
            sql`DATE(${studentAttendances.date}) = ${dateString}`,
            like(studentAttendances.notes, "%Otomatis dari Izin Pulang%")
          ));
          await tx.delete(tahfidzDeposits).where(and(
            eq(tahfidzDeposits.studentId, item.studentId),
            sql`DATE(${tahfidzDeposits.depositDate}) = ${dateString}`,
            like(tahfidzDeposits.notes, "%Otomatis dari Izin Pulang%")
          ));
        }
      }

      // 3. Update Leave Header
      await tx.update(studentLeaves).set({
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
        attachment: body.attachment || null,
      }).where(eq(studentLeaves.id, id));

      // 4. Update Items (Delete and Re-insert)
      await tx.delete(studentLeaveItems).where(eq(studentLeaveItems.leaveId, id));
      
      for (const studentId of body.studentIds) {
        const examId = body.clinicExamIds?.[String(studentId)] || null;
        await tx.insert(studentLeaveItems).values({
          leaveId: id,
          studentId,
          clinicExamId: examId,
        });

        // 5. Re-apply NEW Attendance & Mutabaah
        const start = new Date(body.startDate);
        const end = new Date(body.endDate);

        // Find mentor for mutabaah
        const mentorMember = await tx.query.halaqahMembers.findFirst({
          where: eq(halaqahMembers.studentId, studentId),
          with: { halaqah: { with: { mentors: true } } }
        });
        const teacherId = mentorMember?.halaqah?.mentors?.find((m: any) => m.role === 'lead')?.teacherId 
          || mentorMember?.halaqah?.mentors?.[0]?.teacherId;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateString = d.toISOString().split("T")[0] as string;
          
          const attendStatus = body.type === "sick" ? "sick" : "permitted";
          const notes = `${body.reason} (Otomatis dari Izin Pulang)`;

          await tx.insert(studentAttendances).values({
            studentId,
            date: new Date(dateString),
            status: attendStatus,
            notes,
            createdBy: user.userId
          });

          if (teacherId) {
            const mutabaahType = body.type === "sick" ? "sakit" : "izin";
            await tx.insert(tahfidzDeposits).values({
              studentId,
              teacherId,
              depositDate: new Date(dateString),
              type: mutabaahType,
              notes
            });
          }
        }
      }
    });

    return c.json({ success: true, message: "Data izin berhasil diperbarui." });
  } catch (e: any) {
    console.error(e);
    return c.json({ success: false, message: "Gagal memperbarui data: " + e.message }, 500);
  }
});

// DELETE /:id - Delete leave
studentLeavesRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const user = c.get("user");

  try {
    await db.transaction(async (tx) => {
      // 1. Get the leave details to know what to cleanup
      const leave = await tx.query.studentLeaves.findFirst({
        where: eq(studentLeaves.id, id),
        with: {
          items: true
        }
      });

      if (!leave) throw new Error("Data izin tidak ditemukan");

      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      // 2. Cleanup Attendance & Mutabaah
      for (const item of leave.items) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateString = d.toISOString().split("T")[0] as string;

          // Delete attendance if notes match
          await tx.delete(studentAttendances).where(and(
            eq(studentAttendances.studentId, item.studentId),
            sql`DATE(${studentAttendances.date}) = ${dateString}`,
            like(studentAttendances.notes, "%Otomatis dari Izin Pulang%")
          ));

          // Delete mutabaah if notes match
          await tx.delete(tahfidzDeposits).where(and(
            eq(tahfidzDeposits.studentId, item.studentId),
            sql`DATE(${tahfidzDeposits.depositDate}) = ${dateString}`,
            like(tahfidzDeposits.notes, "%Otomatis dari Izin Pulang%")
          ));
        }
      }

      // 3. Delete from student_leaves (cascade will handle student_leave_items)
      await tx.delete(studentLeaves).where(eq(studentLeaves.id, id));
    });

    return c.json({ success: true, message: "Data izin berhasil dihapus dan sinkronisasi dibatalkan." });
  } catch (e: any) {
    console.error(e);
    return c.json({ success: false, message: "Gagal menghapus data: " + e.message }, 500);
  }
});

export default studentLeavesRoute;
