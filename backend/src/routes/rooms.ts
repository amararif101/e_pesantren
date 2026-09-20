import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { rooms, roomSupervisors } from "../db/schema/rooms";
import { students } from "../db/schema/students";
import { teachers } from "../db/schema/teachers";
import { authMiddleware, requirePermission } from "../middleware/auth";
import {
  createRoomSchema,
  updateRoomSchema,
  addSupervisorSchema,
  updateSupervisorSchema,
  assignStudentRoomSchema,
} from "../validators/rooms";
import { getStudentGenderScope } from "../utils/gender-scope";

const roomsRoute = new Hono();

// Apply auth to all routes
roomsRoute.use("*", authMiddleware);

// ============ ROOMS ============

// Get all rooms
roomsRoute.get("/", async (c) => {
  try {
    const status = c.req.query("status");
    const building = c.req.query("building");

    let allRooms = await db.query.rooms.findMany();

    if (status) {
      allRooms = allRooms.filter((r) => r.status === status);
    }
    if (building) {
      allRooms = allRooms.filter((r) => r.building === building);
    }

    return c.json({
      success: true,
      data: allRooms,
    });
  } catch (error) {
    console.error("Get rooms error:", error);
    return c.json({ success: false, message: "Failed to get rooms" }, 500);
  }
});

// Get room by ID with students and supervisors
roomsRoute.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, id),
    });

    if (!room) {
      return c.json({ success: false, message: "Room not found" }, 404);
    }

    // Get students in this room
    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const roomStudents = await db.query.students.findMany({
      where: genderScope
        ? and(eq(students.roomId, id), eq(students.gender, genderScope))
        : eq(students.roomId, id),
    });

    // Get supervisors
    const supervisors = await db.query.roomSupervisors.findMany({
      where: eq(roomSupervisors.roomId, id),
    });

    // Get teacher details for supervisors
    const supervisorsWithDetails = await Promise.all(
      supervisors.map(async (sup) => {
        const teacher = await db.query.teachers.findFirst({
          where: eq(teachers.id, sup.teacherId),
        });
        return {
          ...sup,
          teacher,
        };
      }),
    );

    return c.json({
      success: true,
      data: {
        ...room,
        students: roomStudents,
        supervisors: supervisorsWithDetails,
      },
    });
  } catch (error) {
    console.error("Get room error:", error);
    return c.json({ success: false, message: "Failed to get room" }, 500);
  }
});

// Create room
roomsRoute.post(
  "/",
  requirePermission("/apps/rooms"),
  zValidator("json", createRoomSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      const result = await db.insert(rooms).values(data);

      const newRoom = await db.query.rooms.findFirst({
        where: eq(rooms.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Room created successfully",
        data: newRoom,
      });
    } catch (error) {
      console.error("Create room error:", error);
      return c.json({ success: false, message: "Failed to create room" }, 500);
    }
  },
);

// Update room
roomsRoute.put(
  "/:id",
  requirePermission("/apps/rooms"),
  zValidator("json", updateRoomSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.rooms.findFirst({
        where: eq(rooms.id, id),
      });

      if (!existing) {
        return c.json({ success: false, message: "Room not found" }, 404);
      }

      await db.update(rooms).set(data).where(eq(rooms.id, id));

      const updated = await db.query.rooms.findFirst({
        where: eq(rooms.id, id),
      });

      return c.json({
        success: true,
        message: "Room updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update room error:", error);
      return c.json({ success: false, message: "Failed to update room" }, 500);
    }
  },
);

// Delete room
roomsRoute.delete("/:id", requirePermission("/apps/rooms"), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const existing = await db.query.rooms.findFirst({
      where: eq(rooms.id, id),
    });

    if (!existing) {
      return c.json({ success: false, message: "Room not found" }, 404);
    }

    // Check if room has students
    const roomStudents = await db.query.students.findMany({
      where: eq(students.roomId, id),
    });

    if (roomStudents.length > 0) {
      return c.json(
        {
          success: false,
          message:
            "Cannot delete room with students. Please reassign students first.",
        },
        400,
      );
    }

    // Delete supervisors first
    await db.delete(roomSupervisors).where(eq(roomSupervisors.roomId, id));
    await db.delete(rooms).where(eq(rooms.id, id));

    return c.json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Delete room error:", error);
    return c.json({ success: false, message: "Failed to delete room" }, 500);
  }
});

// ============ ROOM STUDENTS ============

// Get students in room
roomsRoute.get("/:id/students", async (c) => {
  try {
    const roomId = parseInt(c.req.param("id"));

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const roomStudents = await db.query.students.findMany({
      where: genderScope
        ? and(eq(students.roomId, roomId), eq(students.gender, genderScope))
        : eq(students.roomId, roomId),
    });

    return c.json({
      success: true,
      data: roomStudents,
    });
  } catch (error) {
    console.error("Get room students error:", error);
    return c.json({ success: false, message: "Failed to get students" }, 500);
  }
});

// Assign student to room
roomsRoute.post(
  "/:id/students/:studentId",
  requirePermission("/apps/rooms"),
  async (c) => {
    try {
      const roomId = parseInt(c.req.param("id"));
      const studentId = parseInt(c.req.param("studentId"));
      const body = await c.req.json().catch(() => ({}));
      const force = body.force === true;

      // Check if room exists
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId),
      });

      if (!room) {
        return c.json({ success: false, message: "Room not found" }, 404);
      }

      // Check if student exists
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });

      if (!student) {
        return c.json({ success: false, message: "Student not found" }, 404);
      }

      // Check if student is already in THIS room
      if (student.roomId === roomId) {
        return c.json(
          { success: false, message: "Santri sudah ada di kamar ini" },
          400,
        );
      }

      // Check if student is already in ANOTHER room
      if (student.roomId && student.roomId !== roomId && !force) {
        // Get existing room name
        const existingRoom = await db.query.rooms.findFirst({
          where: eq(rooms.id, student.roomId),
        });

        return c.json({
          success: false,
          message: `Santri sudah terdaftar di kamar "${
            existingRoom?.name || "lain"
          }"`,
          requiresConfirm: true,
          existingRoom: {
            id: existingRoom?.id,
            name: existingRoom?.name || "Kamar Lain",
          },
        });
      }

      // Check room capacity
      if (room.capacity) {
        const currentStudents = await db.query.students.findMany({
          where: eq(students.roomId, roomId),
        });
        if (currentStudents.length >= room.capacity) {
          return c.json({ success: false, message: "Kamar sudah penuh" }, 400);
        }
      }

      // Update student's room
      await db
        .update(students)
        .set({ roomId })
        .where(eq(students.id, studentId));

      const updated = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });

      return c.json({
        success: true,
        message: force
          ? "Santri berhasil dipindahkan ke kamar ini"
          : "Santri berhasil ditambahkan ke kamar",
        data: updated,
      });
    } catch (error) {
      console.error("Assign student to room error:", error);
      return c.json(
        { success: false, message: "Gagal menambahkan santri" },
        500,
      );
    }
  },
);

// Remove student from room
roomsRoute.delete(
  "/:id/students/:studentId",
  requirePermission("/apps/rooms"),
  async (c) => {
    try {
      const roomId = parseInt(c.req.param("id"));
      const studentId = parseInt(c.req.param("studentId"));

      const student = await db.query.students.findFirst({
        where: and(eq(students.id, studentId), eq(students.roomId, roomId)),
      });

      if (!student) {
        return c.json(
          { success: false, message: "Student not found in this room" },
          404,
        );
      }

      // Remove student from room (set roomId to null)
      await db
        .update(students)
        .set({ roomId: null })
        .where(eq(students.id, studentId));

      return c.json({
        success: true,
        message: "Student removed from room successfully",
      });
    } catch (error) {
      console.error("Remove student from room error:", error);
      return c.json(
        { success: false, message: "Failed to remove student" },
        500,
      );
    }
  },
);

// ============ ROOM SUPERVISORS ============

// Get supervisors of room
roomsRoute.get("/:id/supervisors", async (c) => {
  try {
    const roomId = parseInt(c.req.param("id"));

    const supervisors = await db.query.roomSupervisors.findMany({
      where: eq(roomSupervisors.roomId, roomId),
    });

    // Get teacher details
    const supervisorsWithDetails = await Promise.all(
      supervisors.map(async (sup) => {
        const teacher = await db.query.teachers.findFirst({
          where: eq(teachers.id, sup.teacherId),
        });
        return {
          ...sup,
          teacher,
        };
      }),
    );

    return c.json({
      success: true,
      data: supervisorsWithDetails,
    });
  } catch (error) {
    console.error("Get room supervisors error:", error);
    return c.json(
      { success: false, message: "Failed to get supervisors" },
      500,
    );
  }
});

// Add supervisor to room
roomsRoute.post(
  "/:id/supervisors",
  requirePermission("/apps/rooms"),
  zValidator("json", addSupervisorSchema),
  async (c) => {
    try {
      const roomId = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      // Check if room exists
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId),
      });

      if (!room) {
        return c.json({ success: false, message: "Room not found" }, 404);
      }

      // Check if teacher exists
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, data.teacherId),
      });

      if (!teacher) {
        return c.json({ success: false, message: "Teacher not found" }, 404);
      }

      // Check if already supervisor
      const existing = await db.query.roomSupervisors.findFirst({
        where: and(
          eq(roomSupervisors.roomId, roomId),
          eq(roomSupervisors.teacherId, data.teacherId),
        ),
      });

      if (existing) {
        return c.json(
          { success: false, message: "Teacher is already a supervisor" },
          400,
        );
      }

      const result = await db.insert(roomSupervisors).values({
        roomId,
        teacherId: data.teacherId,
        role: data.role || "assistant",
      });

      const newSupervisor = await db.query.roomSupervisors.findFirst({
        where: eq(roomSupervisors.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Supervisor added successfully",
        data: newSupervisor,
      });
    } catch (error) {
      console.error("Add room supervisor error:", error);
      return c.json(
        { success: false, message: "Failed to add supervisor" },
        500,
      );
    }
  },
);

// Update supervisor role
roomsRoute.put(
  "/:id/supervisors/:teacherId",
  requirePermission("/apps/rooms"),
  zValidator("json", updateSupervisorSchema),
  async (c) => {
    try {
      const roomId = parseInt(c.req.param("id"));
      const teacherId = parseInt(c.req.param("teacherId"));
      const data = c.req.valid("json");

      const supervisor = await db.query.roomSupervisors.findFirst({
        where: and(
          eq(roomSupervisors.roomId, roomId),
          eq(roomSupervisors.teacherId, teacherId),
        ),
      });

      if (!supervisor) {
        return c.json({ success: false, message: "Supervisor not found" }, 404);
      }

      await db
        .update(roomSupervisors)
        .set(data)
        .where(eq(roomSupervisors.id, supervisor.id));

      const updated = await db.query.roomSupervisors.findFirst({
        where: eq(roomSupervisors.id, supervisor.id),
      });

      return c.json({
        success: true,
        message: "Supervisor updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update room supervisor error:", error);
      return c.json(
        { success: false, message: "Failed to update supervisor" },
        500,
      );
    }
  },
);

// Remove supervisor from room
roomsRoute.delete(
  "/:id/supervisors/:teacherId",
  requirePermission("/apps/rooms"),
  async (c) => {
    try {
      const roomId = parseInt(c.req.param("id"));
      const teacherId = parseInt(c.req.param("teacherId"));

      const supervisor = await db.query.roomSupervisors.findFirst({
        where: and(
          eq(roomSupervisors.roomId, roomId),
          eq(roomSupervisors.teacherId, teacherId),
        ),
      });

      if (!supervisor) {
        return c.json({ success: false, message: "Supervisor not found" }, 404);
      }

      await db
        .delete(roomSupervisors)
        .where(eq(roomSupervisors.id, supervisor.id));

      return c.json({
        success: true,
        message: "Supervisor removed successfully",
      });
    } catch (error) {
      console.error("Remove room supervisor error:", error);
      return c.json(
        { success: false, message: "Failed to remove supervisor" },
        500,
      );
    }
  },
);

export default roomsRoute;
