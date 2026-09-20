import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  rewardsPunishments,
  pointImages,
} from "../db/schema/rewards-punishments";
import { authMiddleware, requirePermission } from "../middleware/auth";
import {
  createRewardPunishmentSchema,
  updateRewardPunishmentSchema,
} from "../validators/rewards";
import {
  getStudentGenderScope,
  getAllowedStudentIds,
  requireStudentGenderAccess,
} from "../utils/gender-scope";

const punishmentsRoute = new Hono();

// Apply auth to all routes
punishmentsRoute.use("*", authMiddleware);

// Get all punishments
punishmentsRoute.get("/", async (c) => {
  try {
    const studentId = c.req.query("studentId");

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const allowedIds = await getAllowedStudentIds(genderScope);
    if (allowedIds && allowedIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const conditions = [eq(rewardsPunishments.type, "punishment")];
    if (studentId) {
      conditions.push(eq(rewardsPunishments.studentId, parseInt(studentId)));
    }
    if (allowedIds) {
      conditions.push(inArray(rewardsPunishments.studentId, allowedIds));
    }
    const records = await db.query.rewardsPunishments.findMany({
      where: and(...conditions),
    });

    return c.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Get punishments error:", error);
    return c.json(
      { success: false, message: "Failed to get punishments" },
      500
    );
  }
});

// Get punishments by student ID
punishmentsRoute.get("/student/:studentId", async (c) => {
  try {
    const studentId = parseInt(c.req.param("studentId"));

    const denied = await requireStudentGenderAccess(c, studentId);
    if (denied) return denied;

    const records = await db.query.rewardsPunishments.findMany({
      where: and(
        eq(rewardsPunishments.type, "punishment"),
        eq(rewardsPunishments.studentId, studentId)
      ),
    });

    // Calculate summary
    const summary = {
      totalPoints: records.reduce((sum, r) => sum + Math.abs(r.points || 0), 0),
      count: records.length,
    };

    return c.json({
      success: true,
      data: {
        records,
        summary,
      },
    });
  } catch (error) {
    console.error("Get student punishments error:", error);
    return c.json(
      { success: false, message: "Failed to get punishments" },
      500
    );
  }
});

// Get punishment by ID
punishmentsRoute.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const record = await db.query.rewardsPunishments.findFirst({
      where: and(
        eq(rewardsPunishments.id, id),
        eq(rewardsPunishments.type, "punishment")
      ),
    });

    if (!record) {
      return c.json({ success: false, message: "Punishment not found" }, 404);
    }

    const denied = await requireStudentGenderAccess(c, record.studentId);
    if (denied) return denied;

    return c.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Get punishment error:", error);
    return c.json({ success: false, message: "Failed to get punishment" }, 500);
  }
});

// Create punishment
punishmentsRoute.post(
  "/",
  requirePermission("/apps/rewards/reports"),
  zValidator("json", createRewardPunishmentSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const user = c.get("user");

      // For punishment, make points negative
      const points = -Math.abs(data.points || 0);

      const result = await db.insert(rewardsPunishments).values({
        studentId: data.studentId,
        type: "punishment",
        category: data.category,
        title: data.title,
        description: data.description,
        points,
        date: data.date ? new Date(data.date) : new Date(),
        givenBy: user.userId,
        notes: data.notes,
        ruleId: data.ruleId,
      });

      const newId = Number(result[0].insertId);

      // Insert images if present
      if (data.images && data.images.length > 0) {
        await db.insert(pointImages).values(
          data.images.map((url) => ({
            pointId: newId,
            imageUrl: url,
          }))
        );
      }

      const newRecord = await db.query.rewardsPunishments.findFirst({
        where: eq(rewardsPunishments.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Punishment added successfully",
        data: newRecord,
      });
    } catch (error) {
      console.error("Create punishment error:", error);
      return c.json(
        { success: false, message: "Failed to add punishment" },
        500
      );
    }
  }
);

// Update punishment
punishmentsRoute.put(
  "/:id",
  requirePermission("/apps/rewards/reports"),
  zValidator("json", updateRewardPunishmentSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.rewardsPunishments.findFirst({
        where: and(
          eq(rewardsPunishments.id, id),
          eq(rewardsPunishments.type, "punishment")
        ),
      });

      if (!existing) {
        return c.json({ success: false, message: "Punishment not found" }, 404);
      }

      await db
        .update(rewardsPunishments)
        .set({
          ...data,
          type: "punishment", // Ensure type stays as punishment
          points: data.points ? -Math.abs(data.points) : undefined,
          date: data.date ? new Date(data.date) : undefined,
        })
        .where(eq(rewardsPunishments.id, id));

      const updated = await db.query.rewardsPunishments.findFirst({
        where: eq(rewardsPunishments.id, id),
      });

      return c.json({
        success: true,
        message: "Punishment updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update punishment error:", error);
      return c.json(
        { success: false, message: "Failed to update punishment" },
        500
      );
    }
  }
);

// Delete punishment
punishmentsRoute.delete("/:id", requirePermission("/apps/rewards/reports"), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const existing = await db.query.rewardsPunishments.findFirst({
      where: and(
        eq(rewardsPunishments.id, id),
        eq(rewardsPunishments.type, "punishment")
      ),
    });

    if (!existing) {
      return c.json({ success: false, message: "Punishment not found" }, 404);
    }

    await db.delete(rewardsPunishments).where(eq(rewardsPunishments.id, id));

    return c.json({
      success: true,
      message: "Punishment deleted successfully",
    });
  } catch (error) {
    console.error("Delete punishment error:", error);
    return c.json(
      { success: false, message: "Failed to delete punishment" },
      500
    );
  }
});

export default punishmentsRoute;
