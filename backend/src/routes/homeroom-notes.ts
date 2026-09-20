import { Hono } from "hono";
import { db } from "../db";
import { homeroomNotes, classes, students } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { getStudentGenderScope, requireStudentGenderAccess } from "../utils/gender-scope";

const app = new Hono();

app.use("*", authMiddleware);

// GET /homeroom-notes?classId=&semester=&academicYear=
app.get("/", async (c) => {
  try {
    const classId = c.req.query("classId");
    const semester = c.req.query("semester");
    const academicYear = c.req.query("academicYear");

    if (!classId) {
      return c.json({ success: false, message: "classId is required" }, 400);
    }

    // Get students in this class
    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const classStudents = await db.query.students.findMany({
      where: genderScope
        ? and(eq(students.classId, Number(classId)), eq(students.gender, genderScope))
        : eq(students.classId, Number(classId)),
      columns: {
        id: true,
        fullName: true,
        fullNameAr: true,
        nis: true,
      },
    });

    // Get notes for these students
    const studentIds = classStudents.map((s) => s.id);

    let notes: any[] = [];
    if (studentIds.length > 0 && semester && academicYear) {
      notes = await db.query.homeroomNotes.findMany({
        where: and(
          inArray(homeroomNotes.studentId, studentIds),
          eq(homeroomNotes.semester, Number(semester)),
          eq(homeroomNotes.academicYear, academicYear)
        ),
      });
    }

    // Merge students with their notes
    const data = classStudents.map((student) => {
      const note = notes.find((n) => n.studentId === student.id);
      return {
        studentId: student.id,
        fullName: student.fullName,
        fullNameAr: student.fullNameAr,
        nis: student.nis,
        noteId: note?.id || null,
        sickDays: note?.sickDays || 0,
        permissionDays: note?.permissionDays || 0,
        absentDays: note?.absentDays || 0,
        teacherNotes: note?.teacherNotes || "",
      };
    });

    return c.json({ success: true, data });
  } catch (e: any) {
    console.error("Error fetching homeroom notes:", e);
    return c.json({ success: false, message: e.message }, 500);
  }
});

// POST /homeroom-notes - Create or update note
const upsertNoteSchema = z.object({
  studentId: z.number(),
  classId: z.number().optional(),
  academicYear: z.string(),
  semester: z.number(),
  sickDays: z.number().default(0),
  permissionDays: z.number().default(0),
  absentDays: z.number().default(0),
  teacherNotes: z.string().optional(),
});

app.post("/", zValidator("json", upsertNoteSchema), async (c) => {
  try {
    const data = c.req.valid("json");

    // Check if note exists
    const existing = await db.query.homeroomNotes.findFirst({
      where: and(
        eq(homeroomNotes.studentId, data.studentId),
        eq(homeroomNotes.semester, data.semester),
        eq(homeroomNotes.academicYear, data.academicYear)
      ),
    });

    if (existing) {
      // Update
      await db
        .update(homeroomNotes)
        .set({
          sickDays: data.sickDays,
          permissionDays: data.permissionDays,
          absentDays: data.absentDays,
          teacherNotes: data.teacherNotes || null,
          classId: data.classId || existing.classId,
        })
        .where(eq(homeroomNotes.id, existing.id));

      return c.json({ success: true, message: "Catatan berhasil diperbarui" });
    } else {
      // Insert
      await db.insert(homeroomNotes).values({
        studentId: data.studentId,
        classId: data.classId || null,
        academicYear: data.academicYear,
        semester: data.semester,
        sickDays: data.sickDays,
        permissionDays: data.permissionDays,
        absentDays: data.absentDays,
        teacherNotes: data.teacherNotes || null,
      });

      return c.json({ success: true, message: "Catatan berhasil disimpan" });
    }
  } catch (e: any) {
    console.error("Error saving homeroom note:", e);
    return c.json({ success: false, message: e.message }, 500);
  }
});

// POST /homeroom-notes/bulk - Bulk save notes
const bulkSaveSchema = z.object({
  notes: z.array(upsertNoteSchema),
});

app.post("/bulk", zValidator("json", bulkSaveSchema), async (c) => {
  try {
    const { notes: notesData } = c.req.valid("json");

    for (const data of notesData) {
      const existing = await db.query.homeroomNotes.findFirst({
        where: and(
          eq(homeroomNotes.studentId, data.studentId),
          eq(homeroomNotes.semester, data.semester),
          eq(homeroomNotes.academicYear, data.academicYear)
        ),
      });

      if (existing) {
        await db
          .update(homeroomNotes)
          .set({
            sickDays: data.sickDays,
            permissionDays: data.permissionDays,
            absentDays: data.absentDays,
            teacherNotes: data.teacherNotes || null,
            classId: data.classId || existing.classId,
          })
          .where(eq(homeroomNotes.id, existing.id));
      } else {
        await db.insert(homeroomNotes).values({
          studentId: data.studentId,
          classId: data.classId || null,
          academicYear: data.academicYear,
          semester: data.semester,
          sickDays: data.sickDays,
          permissionDays: data.permissionDays,
          absentDays: data.absentDays,
          teacherNotes: data.teacherNotes || null,
        });
      }
    }

    return c.json({
      success: true,
      message: "Semua catatan berhasil disimpan",
    });
  } catch (e: any) {
    console.error("Error bulk saving homeroom notes:", e);
    return c.json({ success: false, message: e.message }, 500);
  }
});

// GET /homeroom-notes/:studentId - Get single student's note
app.get("/:studentId", async (c) => {
  try {
    const studentId = Number(c.req.param("studentId"));
    const semester = c.req.query("semester");
    const academicYear = c.req.query("academicYear");

    if (!semester || !academicYear) {
      return c.json(
        { success: false, message: "semester and academicYear are required" },
        400
      );
    }

    const denied = await requireStudentGenderAccess(c, studentId);
    if (denied) return denied;

    const note = await db.query.homeroomNotes.findFirst({
      where: and(
        eq(homeroomNotes.studentId, studentId),
        eq(homeroomNotes.semester, Number(semester)),
        eq(homeroomNotes.academicYear, academicYear)
      ),
    });

    return c.json({
      success: true,
      data: note || {
        studentId,
        sickDays: 0,
        permissionDays: 0,
        absentDays: 0,
        teacherNotes: "",
      },
    });
  } catch (e: any) {
    console.error("Error fetching student note:", e);
    return c.json({ success: false, message: e.message }, 500);
  }
});

export default app;
