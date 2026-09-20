import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { studentWarnings } from "../db/schema/rewards-punishments";
import { students } from "../db/schema/students";
import { authMiddleware, requirePermission } from "../middleware/auth";
import { z } from "zod";
import { getStudentGenderScope, getAllowedStudentIds } from "../utils/gender-scope";

const warningsRoute = new Hono();

// Schema
const createWarningSchema = z.object({
  studentId: z.number().min(1, "Student ID is required"),
  spLevel: z.number().int().min(1).max(3, "SP Level must be 1, 2, or 3"),
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

const updateWarningSchema = createWarningSchema.partial().extend({
  status: z.enum(["active", "resolved"]).optional(),
});

// Apply auth
warningsRoute.use("*", authMiddleware);

// Get all warnings
warningsRoute.get("/", async (c) => {
  try {
    const studentId = c.req.query("studentId");
    const status = c.req.query("status");

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const allowedIds = await getAllowedStudentIds(genderScope);
    if (allowedIds && allowedIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    let conditions: any[] = [];
    if (studentId)
      conditions.push(eq(studentWarnings.studentId, parseInt(studentId)));
    if (status && (status === "active" || status === "resolved"))
      conditions.push(eq(studentWarnings.status, status));
    if (allowedIds) conditions.push(inArray(studentWarnings.studentId, allowedIds));

    const records = await db.query.studentWarnings.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        student: {
          columns: {
            id: true,
            fullName: true,
            nis: true,
            classId: true,
          },
        },
      },
      orderBy: [desc(studentWarnings.issueDate)],
    });

    return c.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Get warnings error:", error);
    return c.json({ success: false, message: "Failed to get warnings" }, 500);
  }
});

// Create Warning (Issue SP)
warningsRoute.post(
  "/",
  requirePermission("/apps/rewards/warnings"), // Headmaster usually issues SP
  zValidator("json", createWarningSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const user = c.get("user");

      const result = await db.insert(studentWarnings).values({
        studentId: data.studentId,
        spLevel: data.spLevel,
        issueDate: new Date(data.issueDate),
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        reason: data.reason,
        notes: data.notes,
        issuedBy: user.userId,
        status: "active",
      });

      const newRecord = await db.query.studentWarnings.findFirst({
        where: eq(studentWarnings.id, Number(result[0].insertId)),
        with: {
          student: true,
        },
      });

      return c.json({
        success: true,
        message: `SP ${data.spLevel} issued successfully`,
        data: newRecord,
      });
    } catch (error) {
      console.error("Issue SP error:", error);
      return c.json({ success: false, message: "Failed to issue SP" }, 500);
    }
  }
);

// Update Warning
warningsRoute.put(
  "/:id",
  requirePermission("/apps/rewards/warnings"),
  zValidator("json", updateWarningSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.studentWarnings.findFirst({
        where: eq(studentWarnings.id, id),
      });

      if (!existing) {
        return c.json({ success: false, message: "Warning not found" }, 404);
      }

      await db
        .update(studentWarnings)
        .set({
          ...data,
          issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        })
        .where(eq(studentWarnings.id, id));

      const updated = await db.query.studentWarnings.findFirst({
        where: eq(studentWarnings.id, id),
        with: { student: true },
      });

      return c.json({
        success: true,
        message: "Warning updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update warning error:", error);
      return c.json(
        { success: false, message: "Failed to update warning" },
        500
      );
    }
  }
);

// Delete Warning
warningsRoute.delete("/:id", requirePermission("/apps/rewards/warnings"), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const existing = await db.query.studentWarnings.findFirst({
      where: eq(studentWarnings.id, id),
    });

    if (!existing) {
      return c.json({ success: false, message: "Warning not found" }, 404);
    }

    await db.delete(studentWarnings).where(eq(studentWarnings.id, id));

    return c.json({
      success: true,
      message: "Warning deleted successfully",
    });
  } catch (error) {
    console.error("Delete warning error:", error);
    return c.json({ success: false, message: "Failed to delete warning" }, 500);
  }
});

export default warningsRoute;
