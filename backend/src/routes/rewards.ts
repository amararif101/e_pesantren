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

const rewardsRoute = new Hono();

// Apply auth to all routes
rewardsRoute.use("*", authMiddleware);

// ============ REWARDS ============

// Get all rewards only
rewardsRoute.get("/rewards", async (c) => {
  try {
    const studentId = c.req.query("studentId");

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const allowedIds = await getAllowedStudentIds(genderScope);
    if (allowedIds && allowedIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const conditions = [eq(rewardsPunishments.type, "reward")];
    if (studentId) {
      conditions.push(eq(rewardsPunishments.studentId, parseInt(studentId)));
    }
    if (allowedIds) {
      conditions.push(inArray(rewardsPunishments.studentId, allowedIds));
    }
    const records = await db.query.rewardsPunishments.findMany({
      where: and(...conditions),
      with: { student: { with: { class: true, room: true } } },
    });

    return c.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Get rewards error:", error);
    return c.json({ success: false, message: "Failed to get rewards" }, 500);
  }
});

// Get reward by ID
rewardsRoute.get("/rewards/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const record = await db.query.rewardsPunishments.findFirst({
      where: and(
        eq(rewardsPunishments.id, id),
        eq(rewardsPunishments.type, "reward")
      ),
    });

    if (!record) {
      return c.json({ success: false, message: "Reward not found" }, 404);
    }

    const denied = await requireStudentGenderAccess(c, record.studentId);
    if (denied) return denied;

    return c.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Get reward error:", error);
    return c.json({ success: false, message: "Failed to get reward" }, 500);
  }
});

// Create reward
rewardsRoute.post(
  "/rewards",
  requirePermission("/apps/rewards/entry"),
  zValidator("json", createRewardPunishmentSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const user = c.get("user");

      const result = await db.insert(rewardsPunishments).values({
        studentId: data.studentId,
        type: "reward",
        category: data.category,
        title: data.title,
        description: data.description,
        points: Math.abs(data.points || 0), // Always positive for rewards
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
        message: "Reward added successfully",
        data: newRecord,
      });
    } catch (error) {
      console.error("Create reward error:", error);
      return c.json({ success: false, message: "Failed to add reward" }, 500);
    }
  }
);

// Update reward
rewardsRoute.put(
  "/rewards/:id",
  requirePermission("/apps/rewards/entry"),
  zValidator("json", updateRewardPunishmentSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.rewardsPunishments.findFirst({
        where: and(
          eq(rewardsPunishments.id, id),
          eq(rewardsPunishments.type, "reward")
        ),
      });

      if (!existing) {
        return c.json({ success: false, message: "Reward not found" }, 404);
      }

      await db
        .update(rewardsPunishments)
        .set({
          ...data,
          type: "reward", // Ensure type stays as reward
          points: data.points ? Math.abs(data.points) : undefined,
          date: data.date ? new Date(data.date) : undefined,
        })
        .where(eq(rewardsPunishments.id, id));

      const updated = await db.query.rewardsPunishments.findFirst({
        where: eq(rewardsPunishments.id, id),
      });

      return c.json({
        success: true,
        message: "Reward updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update reward error:", error);
      return c.json(
        { success: false, message: "Failed to update reward" },
        500
      );
    }
  }
);

// Delete reward
rewardsRoute.delete(
  "/rewards/:id",
  requirePermission("/apps/rewards/entry"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      const existing = await db.query.rewardsPunishments.findFirst({
        where: and(
          eq(rewardsPunishments.id, id),
          eq(rewardsPunishments.type, "reward")
        ),
      });

      if (!existing) {
        return c.json({ success: false, message: "Reward not found" }, 404);
      }

      await db.delete(rewardsPunishments).where(eq(rewardsPunishments.id, id));

      return c.json({
        success: true,
        message: "Reward deleted successfully",
      });
    } catch (error) {
      console.error("Delete reward error:", error);
      return c.json(
        { success: false, message: "Failed to delete reward" },
        500
      );
    }
  }
);

// ============ PUNISHMENTS ============

// Get all punishments only
rewardsRoute.get("/punishments", async (c) => {
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
      with: { student: { with: { class: true, room: true } } },
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

// Get punishment by ID
rewardsRoute.get("/punishments/:id", async (c) => {
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
rewardsRoute.post(
  "/punishments",
  requirePermission("/apps/rewards/entry"),
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
rewardsRoute.put(
  "/punishments/:id",
  requirePermission("/apps/rewards/entry"),
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
rewardsRoute.delete(
  "/punishments/:id",
  requirePermission("/apps/rewards/entry"),
  async (c) => {
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
  }
);

// ============ COMBINED (for backward compatibility) ============

// Get all rewards/punishments
rewardsRoute.get("/", async (c) => {
  try {
    const type = c.req.query("type"); // filter by reward or punishment
    const studentId = c.req.query("studentId");

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const allowedIds = await getAllowedStudentIds(genderScope);
    if (allowedIds && allowedIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    let conditions: any[] = [];
    if (type) conditions.push(eq(rewardsPunishments.type, type as any));
    if (studentId)
      conditions.push(eq(rewardsPunishments.studentId, parseInt(studentId)));
    if (allowedIds) conditions.push(inArray(rewardsPunishments.studentId, allowedIds));

    const records =
      conditions.length > 0
        ? await db.query.rewardsPunishments.findMany({
            where: and(...conditions),
            with: { student: { with: { class: true, room: true } } },
          })
        : await db.query.rewardsPunishments.findMany({
            with: { student: { with: { class: true, room: true } } },
          });

    return c.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Get rewards/punishments error:", error);
    return c.json({ success: false, message: "Failed to get records" }, 500);
  }
});

// Get by student ID
rewardsRoute.get("/student/:studentId", async (c) => {
  try {
    const studentId = parseInt(c.req.param("studentId"));

    const denied = await requireStudentGenderAccess(c, studentId);
    if (denied) return denied;

    const records = await db.query.rewardsPunishments.findMany({
      where: eq(rewardsPunishments.studentId, studentId),
    });

    // Calculate points summary
    const summary = records.reduce(
      (acc, record) => {
        if (record.type === "reward") {
          acc.totalRewardPoints += record.points || 0;
          acc.rewardCount++;
        } else {
          acc.totalPunishmentPoints += Math.abs(record.points || 0);
          acc.punishmentCount++;
        }
        return acc;
      },
      {
        totalRewardPoints: 0,
        totalPunishmentPoints: 0,
        rewardCount: 0,
        punishmentCount: 0,
      }
    );

    return c.json({
      success: true,
      data: {
        records,
        summary,
      },
    });
  } catch (error) {
    console.error("Get student rewards/punishments error:", error);
    return c.json({ success: false, message: "Failed to get records" }, 500);
  }
});

// Generic Create (handles both based on type)
rewardsRoute.post(
  "/",
  requirePermission("/apps/rewards/entry"),
  zValidator("json", createRewardPunishmentSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const user = c.get("user");

      const type = data.type || "reward";
      // Ensure points polarity
      let points = data.points || 0;
      if (type === "reward") {
        points = Math.abs(points);
      } else {
        points = -Math.abs(points);
      }

      const result = await db.insert(rewardsPunishments).values({
        studentId: data.studentId,
        type: type as any,
        category: data.category,
        title: data.title,
        description: data.description,
        points: points,
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
        message: type === "reward" ? "Reward added" : "Punishment added",
        data: newRecord,
      });
    } catch (error) {
      console.error("Create reward/punishment error:", error);
      return c.json({ success: false, message: "Failed to save data" }, 500);
    }
  }
);

export default rewardsRoute;
