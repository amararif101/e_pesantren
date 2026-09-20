import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, or, sql, inArray, gte, lte } from "drizzle-orm";
import { db } from "../db";
import {
  studentAttendances,
  teacherAttendances,
} from "../db/schema/attendance";
import { students } from "../db/schema/students";
import { teachers } from "../db/schema/teachers";
import { teacherDivisions, divisions } from "../db/schema/divisions";
import { settings } from "../db/schema/settings";
import { authMiddleware, requirePermission } from "../middleware/auth";
import { getStudentGenderScope, getAllowedStudentIds } from "../utils/gender-scope";
import {
  createStudentAttendanceSchema,
  bulkStudentAttendanceSchema,
  createTeacherAttendanceSchema,
  teacherCheckInSchema,
  teacherCheckOutSchema,
  teacherClaimSchema,
} from "../validators/attendance";

const attendanceRoute = new Hono();

// Apply auth to all routes
attendanceRoute.use("*", authMiddleware);

// Helper: Haversine Formula for distance calculation
function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371e3; // Radius of the earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Helper: Validate Location with Smart Tolerance
// accuracy: GPS accuracy in meters (optional, from device)
async function validateLocation(lat: number, lng: number, accuracy?: number, teacherId?: number) {
  const settingsList = await db.query.settings.findMany({
    where: inArray(settings.key, [
      "attendance_latitude",
      "attendance_longitude",
      "attendance_radius",
      "attendance_accuracy_tolerance",
    ]),
  });

  const settingsMap = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string | null>);

  let centerLat = parseFloat(settingsMap["attendance_latitude"] || "");
  let centerLng = parseFloat(settingsMap["attendance_longitude"] || "");
  let radius = parseFloat(settingsMap["attendance_radius"] || "100");
  const maxAccuracyTolerance = parseFloat(
    settingsMap["attendance_accuracy_tolerance"] || "50"
  );

  // If teacher has a division and that division has custom location, use it
  if (teacherId) {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.id, teacherId),
    });
    if (teacher && teacher.divisionId) {
      const division = await db.query.divisions.findFirst({
        where: eq(divisions.id, teacher.divisionId),
      });
      if (division && division.latitude != null && division.longitude != null) {
        centerLat = parseFloat(division.latitude);
        centerLng = parseFloat(division.longitude);
        if (division.radius != null) {
          radius = parseFloat(String(division.radius));
        }
      }
    }
  }

  // Check if settings are properly configured (use isNaN instead of truthy check)
  if (isNaN(centerLat) || isNaN(centerLng)) {
    console.warn("Attendance location settings not configured!");
    return {
      valid: false,
      distance: 0,
      error: "Pengaturan lokasi belum dikonfigurasi",
    };
  }

  // Check if GPS accuracy is too poor (exceeds tolerance)
  if (accuracy !== undefined && accuracy > maxAccuracyTolerance) {
    return {
      valid: false,
      distance: 0,
      error: `Akurasi GPS terlalu rendah (±${Math.round(
        accuracy
      )}m). Maksimum: ±${maxAccuracyTolerance}m. Coba pindah ke area terbuka.`,
    };
  }

  const distance = getDistanceFromLatLonInMeters(
    lat,
    lng,
    centerLat,
    centerLng
  );

  // Apply smart tolerance if accuracy is provided
  let effectiveDistance = distance;
  if (accuracy !== undefined && accuracy > 0) {
    const tolerance = Math.min(accuracy, maxAccuracyTolerance);
    effectiveDistance = Math.max(0, distance - tolerance);
  }

  return {
    valid: effectiveDistance <= radius,
    distance,
    effectiveDistance,
    radius,
    accuracy,
  };
}

import { studentClasses } from "../db/schema/academic";

// ============ STUDENT ATTENDANCE ============

// Get student attendances
attendanceRoute.get("/students", async (c) => {
  try {
    const date = c.req.query("date");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const studentId = c.req.query("studentId");
    const classId = c.req.query("classId");

    console.log("GET /students params:", {
      date,
      startDate,
      endDate,
      studentId,
      classId,
    });

    let conditions: any[] = [];
    if (date) conditions.push(sql`${studentAttendances.date} = ${date}`);
    if (startDate)
      conditions.push(sql`${studentAttendances.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${studentAttendances.date} <= ${endDate}`);

    if (studentId)
      conditions.push(eq(studentAttendances.studentId, parseInt(studentId)));

    // Filter by Class using students.classId (consistent with other features)
    if (classId) {
      console.log("Fetching students for classId:", classId);
      try {
        const classStudents = await db.query.students.findMany({
          where: eq(students.classId, parseInt(classId)),
          columns: { id: true },
        });
        console.log("Class students found:", classStudents.length);

        const studentIds = classStudents.map((s) => s.id);

        if (studentIds.length > 0) {
          conditions.push(inArray(studentAttendances.studentId, studentIds));
        } else {
          // Class has no students, return empty list immediately
          return c.json({ success: true, data: [] });
        }
      } catch (classError) {
        console.error("Error fetching class students:", classError);
        throw classError;
      }
    }

    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    if (genderScope) {
      const allowedIds = await getAllowedStudentIds(genderScope);
      if (!allowedIds || allowedIds.length === 0) {
        return c.json({ success: true, data: [] });
      }
      conditions.push(inArray(studentAttendances.studentId, allowedIds));
    }

    console.log("Fetching attendances with conditions:", conditions.length);
    const attendances =
      conditions.length > 0
        ? await db.query.studentAttendances.findMany({
            where: and(...conditions),
            with: {
              student: true,
            },
            limit: 100,
          })
        : await db.query.studentAttendances.findMany({
            limit: 100,
            with: {
              student: true,
            },
          });

    console.log("Attendances found:", attendances.length);
    return c.json({
      success: true,
      message: "Student attendance retrieved successfully",
      data: attendances,
    });
  } catch (error) {
    console.error("Get student attendances error:", error);
    return c.json(
      { success: false, message: "Failed to get attendances" },
      500
    );
  }
});

// Create student attendance
attendanceRoute.post(
  "/students",
  requirePermission("/apps/attendance"),
  zValidator("json", createStudentAttendanceSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const user = c.get("user");

      // Check if attendance already exists for this student on this date
      const existing = await db.query.studentAttendances.findFirst({
        where: and(
          eq(studentAttendances.studentId, data.studentId),
          sql`${studentAttendances.date} = ${data.date}`
        ),
      });

      if (existing) {
        // Update existing
        await db
          .update(studentAttendances)
          .set({
            status: data.status,
            notes: data.notes,
          })
          .where(eq(studentAttendances.id, existing.id));

        const updated = await db.query.studentAttendances.findFirst({
          where: eq(studentAttendances.id, existing.id),
        });

        return c.json({
          success: true,
          message: "Attendance updated successfully",
          data: updated,
        });
      }

      const result = await db.insert(studentAttendances).values({
        studentId: data.studentId,
        date: new Date(data.date), // Wrap in Date to match schema type
        status: data.status,
        notes: data.notes,
        createdBy: user.userId,
      });

      const newAttendance = await db.query.studentAttendances.findFirst({
        where: eq(studentAttendances.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Attendance recorded successfully",
        data: newAttendance,
      });
    } catch (error) {
      console.error("Create student attendance error:", error);
      return c.json(
        { success: false, message: "Failed to record attendance" },
        500
      );
    }
  }
);

// Bulk create student attendance
attendanceRoute.post(
  "/students/bulk",
  requirePermission("/apps/attendance"),
  zValidator("json", bulkStudentAttendanceSchema),
  async (c) => {
    try {
      const { date, attendances } = c.req.valid("json");
      const user = c.get("user");

      const results = [];

      for (const attendance of attendances) {
        // Check if attendance already exists
        const existing = await db.query.studentAttendances.findFirst({
          where: and(
            eq(studentAttendances.studentId, attendance.studentId),
            sql`${studentAttendances.date} = ${date}`
          ),
        });

        if (existing) {
          // Update existing
          await db
            .update(studentAttendances)
            .set({
              status: attendance.status,
              notes: attendance.notes,
            })
            .where(eq(studentAttendances.id, existing.id));

          const updated = await db.query.studentAttendances.findFirst({
            where: eq(studentAttendances.id, existing.id),
          });
          results.push(updated);
        } else {
          // Create new
          const result = await db.insert(studentAttendances).values({
            studentId: attendance.studentId,
            date: new Date(date), // Wrap in Date to match schema type
            status: attendance.status,
            notes: attendance.notes,
            createdBy: user.userId,
          });

          const newAttendance = await db.query.studentAttendances.findFirst({
            where: eq(studentAttendances.id, Number(result[0].insertId)),
          });
          results.push(newAttendance);
        }
      }

      return c.json({
        success: true,
        message: "Bulk attendance recorded successfully",
        data: results,
      });
    } catch (error) {
      console.error("Bulk attendance error:", error);
      return c.json(
        { success: false, message: "Failed to record bulk attendance" },
        500
      );
    }
  }
);

// Delete student attendance
attendanceRoute.delete(
  "/students/:id",
  requirePermission("/apps/attendance"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"), 10);

      await db.delete(studentAttendances).where(eq(studentAttendances.id, id));

      return c.json({
        success: true,
        message: "Attendance deleted successfully",
      });
    } catch (error) {
      console.error("Delete attendance error:", error);
      return c.json(
        { success: false, message: "Failed to delete attendance" },
        500
      );
    }
  }
);

// ============ TEACHER ATTENDANCE ============

// Get teacher attendances
attendanceRoute.get("/teachers", async (c) => {
  try {
    const date = c.req.query("date");
    const teacherId = c.req.query("teacherId");

    let conditions: any[] = [];
    if (date) conditions.push(sql`${teacherAttendances.date} = ${date}`);
    if (teacherId)
      conditions.push(eq(teacherAttendances.teacherId, parseInt(teacherId)));

    const attendances =
      conditions.length > 0
        ? await db.query.teacherAttendances.findMany({
            where: and(...conditions),
          })
        : await db.query.teacherAttendances.findMany();

    return c.json({
      success: true,
      data: attendances,
    });
  } catch (error) {
    console.error("Get teacher attendances error:", error);
    return c.json(
      { success: false, message: "Failed to get attendances" },
      500
    );
  }
});

// Create teacher attendance
attendanceRoute.post(
  "/teachers",
  requirePermission("/apps/attendance-recap"),
  zValidator("json", createTeacherAttendanceSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      const result = await db.insert(teacherAttendances).values({
        teacherId: data.teacherId,
        date: new Date(data.date),
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        checkInLatitude: data.checkInLatitude?.toString(),
        checkInLongitude: data.checkInLongitude?.toString(),
        checkOutLatitude: data.checkOutLatitude?.toString(),
        checkOutLongitude: data.checkOutLongitude?.toString(),
        status: data.status,
        notes: data.notes,
      });

      const newAttendance = await db.query.teacherAttendances.findFirst({
        where: eq(teacherAttendances.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Attendance recorded successfully",
        data: newAttendance,
      });
    } catch (error) {
      console.error("Create teacher attendance error:", error);
      return c.json(
        { success: false, message: "Failed to record attendance" },
        500
      );
    }
  }
);

// Teacher check-in
attendanceRoute.post(
  "/teachers/check-in",
  zValidator("json", teacherCheckInSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      // FIX: Use Asia/Jakarta timezone
      const now = new Date();
      const today = now.toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      }); // YYYY-MM-DD
      const currentTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Jakarta",
      }); // HH:MM:SS

      const user = c.get("user");
      // Security: Verify teacherId belongs to authenticated user
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, data.teacherId),
      });

      if (!teacher || teacher.userId !== user.userId) {
        return c.json(
          { success: false, message: "Unauthorized: Invalid teacher ID" },
          403
        );
      }

      // Validate Location with smart tolerance
      if (data.latitude && data.longitude) {
        const result = await validateLocation(
          data.latitude,
          data.longitude,
          data.accuracy, // GPS accuracy from device
          data.teacherId
        );

        if (result.error) {
          return c.json({ success: false, message: result.error }, 400);
        }

        if (!result.valid) {
          return c.json(
            {
              success: false,
              message: `Anda berada di luar jangkauan absensi. Jarak: ${Math.round(
                result.distance
              )}m, Max: ${result.radius}m`,
            },
            400
          );
        }
      } else {
        return c.json(
          {
            success: false,
            message: "Lokasi tidak terdeteksi. Pastikan GPS aktif.",
          },
          400
        );
      }

      // Check for existing active session (checked in but not checked out)
      const existing = await db.query.teacherAttendances.findFirst({
        where: and(
          eq(teacherAttendances.teacherId, data.teacherId),
          sql`${teacherAttendances.date} = ${today}`
        ),
        orderBy: (attendances, { desc }) => [desc(attendances.id)],
      });

      if (existing && !existing.checkOut) {
        return c.json(
          {
            success: false,
            message: "Already checked in today. Please check out first.",
            data: existing,
          },
          400
        );
      }
      // If existing checkOut is present, we allow creating a NEW session.

      // Fetch teacher info (already fetched for validation above)
      // const teacher = await db.query.teachers.findFirst({
      //   where: eq(teachers.id, data.teacherId),
      // });

      const result = await db.insert(teacherAttendances).values({
        teacherId: data.teacherId,
        teacherName: teacher?.fullName || null,
        teacherDivision: teacher?.department || null,
        divisionId: teacher?.divisionId?.toString() || null,
        date: new Date(today),
        checkIn: currentTime,
        checkInLatitude: data.latitude?.toString(),
        checkInLongitude: data.longitude?.toString(),
        status: "present",
        activity: data.activity,
        notes: data.notes,
      });

      const attendance = await db.query.teacherAttendances.findFirst({
        where: eq(teacherAttendances.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Check-in successful",
        data: attendance,
      });
    } catch (error) {
      console.error("Check-in error:", error);
      return c.json({ success: false, message: "Failed to check in" }, 500);
    }
  }
);

// Teacher check-out
attendanceRoute.post(
  "/teachers/check-out",
  zValidator("json", teacherCheckOutSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      // FIX: Use Asia/Jakarta timezone
      const now = new Date();
      const today = now.toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      }); // YYYY-MM-DD
      const currentTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Jakarta",
      }); // HH:MM:SS

      const user = c.get("user");
      // Security: Verify teacherId belongs to authenticated user
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, data.teacherId),
      });

      if (!teacher || teacher.userId !== user.userId) {
        return c.json(
          { success: false, message: "Unauthorized: Invalid teacher ID" },
          403
        );
      }

      // Validate Location with smart tolerance
      if (data.latitude && data.longitude) {
        const result = await validateLocation(
          data.latitude,
          data.longitude,
          data.accuracy, // GPS accuracy from device
          data.teacherId
        );

        if (result.error) {
          return c.json({ success: false, message: result.error }, 400);
        }

        if (!result.valid) {
          return c.json(
            {
              success: false,
              message: `Anda berada di luar jangkauan absensi. Jarak: ${Math.round(
                result.distance
              )}m, Max: ${result.radius}m`,
            },
            400
          );
        }
      } else {
        return c.json(
          {
            success: false,
            message: "Lokasi tidak terdeteksi. Pastikan GPS aktif.",
          },
          400
        );
      }

      // Find today's latest attendance
      const existing = await db.query.teacherAttendances.findFirst({
        where: and(
          eq(teacherAttendances.teacherId, data.teacherId),
          sql`${teacherAttendances.date} = ${today}`
        ),
        orderBy: (attendances, { desc }) => [desc(attendances.id)],
      });

      if (!existing) {
        return c.json(
          {
            success: false,
            message: "No check-in record found for today",
          },
          400
        );
      }

      if (existing.checkOut) {
        return c.json(
          {
            success: false,
            message:
              "Already checked out. Please check in manually to start new session.",
            data: existing,
          },
          400
        );
      }

      await db
        .update(teacherAttendances)
        .set({
          checkOut: currentTime,
          checkOutLatitude: data.latitude?.toString(),
          checkOutLongitude: data.longitude?.toString(),
          notes: data.notes || existing.notes,
        })
        .where(eq(teacherAttendances.id, existing.id));

      const updated = await db.query.teacherAttendances.findFirst({
        where: eq(teacherAttendances.id, existing.id),
      });

      return c.json({
        success: true,
        message: "Check-out successful",
        data: updated,
      });
    } catch (error) {
      console.error("Check-out error:", error);
      return c.json({ success: false, message: "Failed to check out" }, 500);
    }
  }
);

// Recap Endpoint
attendanceRoute.get(
  "/teachers/recap",
  requirePermission("/apps/attendance-recap"),
  async (c) => {
  try {
    const {
      month,
      year,
      startDate: customStart,
      endDate: customEnd,
      divisionId,
      gender,
    } = c.req.query();
    // FIX: Use Asia/Jakarta for default period
    const now = new Date();
    const jakartaDate = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );

    const targetMonth = parseInt(month || String(jakartaDate.getMonth() + 1));
    const targetYear = parseInt(year || String(jakartaDate.getFullYear()));

    // 1. Fetch Settings
    const allSettings = await db.query.settings.findMany({
      where: inArray(settings.key, [
        "attendance_period_start",
        "attendance_period_end",
        "attendance_period_type",
        "attendance_holidays",
      ]),
    });
    const sMap = allSettings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, any>);

    const holidays = JSON.parse(sMap["attendance_holidays"] || "[0]");

    // Helper to format YYYY-MM-DD locally (avoid UTC shift)
    const formatDateLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // 2. Calculate Date Range
    let startDate: Date;
    let endDate: Date;

    if (customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      const startDay = parseInt(sMap["attendance_period_start"] || "25");
      const endDay = parseInt(sMap["attendance_period_end"] || "25");
      const periodType = sMap["attendance_period_type"] || "cross_month";

      if (periodType === "same_month") {
        startDate = new Date(targetYear, targetMonth - 1, startDay);
        endDate = new Date(targetYear, targetMonth - 1, endDay);
      } else {
        // Cross Month: Start from prev month
        startDate = new Date(targetYear, targetMonth - 2, startDay);
        endDate = new Date(targetYear, targetMonth - 1, endDay);
      }
    }

    // Format YYYY-MM-DD using local time
    const isoStart = formatDateLocal(startDate);
    const isoEnd = formatDateLocal(endDate);

    // 3. Fetch Teachers
    const teacherConditions: any[] = [eq(teachers.status, "active")];
    if (divisionId) {
      const targetDivId = parseInt(divisionId);
      // Fetch teacher IDs associated with this division from pivot table
      const memberRows = await db
        .select({ teacherId: teacherDivisions.teacherId })
        .from(teacherDivisions)
        .where(eq(teacherDivisions.divisionId, targetDivId));
      
      const teacherIdsInPivot = memberRows.map((r) => r.teacherId);
      
      if (teacherIdsInPivot.length > 0) {
        teacherConditions.push(
          or(
            eq(teachers.divisionId, targetDivId),
            inArray(teachers.id, teacherIdsInPivot)
          )
        );
      } else {
        teacherConditions.push(eq(teachers.divisionId, targetDivId));
      }
    }
    if (gender) {
      teacherConditions.push(eq(teachers.gender, gender as any));
    }

    const allTeachers = await db.query.teachers.findMany({
      where: and(...teacherConditions),
      columns: {
        id: true,
        nip: true,
        fullName: true,
        department: true,
        gender: true,
      },
    });

    // Fetch related divisions for these teachers to display in the recap
    const allRelations = await db
      .select({
        teacherId: teacherDivisions.teacherId,
        divisionName: divisions.name,
      })
      .from(teacherDivisions)
      .innerJoin(divisions, eq(teacherDivisions.divisionId, divisions.id));

    // 4. Fetch Attendances
    const attendancesList = await db.query.teacherAttendances.findMany({
      where: and(
        sql`${teacherAttendances.date} >= ${isoStart}`,
        sql`${teacherAttendances.date} <= ${isoEnd}`
      ),
    });

    // 5. Build Result Map
    const result = allTeachers.map((t) => {
      // Filter distinct dates for this teacher
      const teacherAtts = attendancesList.filter((a) => a.teacherId === t.id);

      let totalHours = 0;
      let totalPresence = 0;

      // Map Map<DateString, { status, timeStr, hours }>
      const dailyMap: Record<string, any> = {};

      teacherAtts.forEach((att) => {
        // Handle Date object or String
        let dStr: string;
        if (att.date instanceof Date) {
          dStr = formatDateLocal(att.date);
        } else {
          dStr = String(att.date); // Assume YYYY-MM-DD string
        }

        if (!dailyMap[dStr]) {
          dailyMap[dStr] = {
            status: att.status,
            isClaim: att.isClaim || false,
            attendanceId: att.id, // Include ID for deletion/editing
            sessions: [], // Change times/activities to sessions
            totalMinutes: 0,
            notes: att.notes || null,
          };
        }

        // If newer (or any) record for same day, ensure ID is captured (logic usually matches first found or iterates)
        // Since we aggregate multiple checkins into one "day" map cell?
        // Wait, the code aggregates times: `dailyMap[dStr].times.push(...)`.
        // Be careful: if there are multiple attendances per day, which ID do we keep?
        // logic says: `if (!dailyMap[dStr]) { ... }`. So it keeps the ID of the FIRST one encountered.
        // `findMany` order is undefined unless specified.
        // For Claims, usually there's only one per day.
        // But if we want to be safe, we might need a list of IDs or just the "Main" one.
        // For "K" (Claim), it's a specific record.
        // If there are multiple, deleting one is correct action for that one.
        // But the UI shows 1 day box.
        // Let's assume for `isClaim`, it's the primary record we want to capture.
        if (att.isClaim) {
          dailyMap[dStr].attendanceId = att.id;
          dailyMap[dStr].isClaim = true;
          dailyMap[dStr].status = "present"; // Claim implies presence
        }

        // Aggregate Time & Activity into Sessions
        let timeStr = "";
        if (att.checkIn && att.checkOut) {
          const [h1, m1] = att.checkIn.split(":").map(Number);
          const [h2, m2] = att.checkOut.split(":").map(Number);

          if (
            h1 !== undefined &&
            m1 !== undefined &&
            h2 !== undefined &&
            m2 !== undefined
          ) {
            const mins = h2 * 60 + m2 - (h1 * 60 + m1);
            if (mins > 0) dailyMap[dStr].totalMinutes += mins;
          }
          timeStr = `${att.checkIn}-${att.checkOut}`;
        } else if (att.checkIn) {
          timeStr = `${att.checkIn}-?`;
        }

        if (timeStr || att.activity) {
          dailyMap[dStr].sessions.push({
            time: timeStr,
            activity: att.activity || null,
          });
        }

        // Status priority
        if (att.status === "present") {
          dailyMap[dStr].status = "present";
        }
      });

      // Calculate Totals based on dailyMap (unique days)
      let totalSickDeduct = 0;
      let totalSickNoDeduct = 0;
      let totalPermitDeduct = 0;
      let totalPermitNoDeduct = 0;
      let totalLeaveDeduct = 0;
      let totalLeaveNoDeduct = 0;

      Object.values(dailyMap).forEach((day: any) => {
        if (day.status === "present") totalPresence++;
        // Legacy permitted/sick (before salary deduction feature)
        if (day.status === "permitted" || day.status === "sick") {
          totalPermitDeduct++; // Treat legacy as deduct by default
        }
        // New salary deduction statuses
        if (day.status === "permit_deduct") totalPermitDeduct++;
        if (day.status === "sick_deduct") totalPermitDeduct++;
        if (day.status === "permit_no_deduct") totalPermitNoDeduct++;
        if (day.status === "sick_no_deduct") totalPermitNoDeduct++;
        if (day.status === "leave_deduct") totalLeaveDeduct++;
        if (day.status === "leave_no_deduct") totalLeaveNoDeduct++;
        totalHours += day.totalMinutes / 60;
      });

      return {
        id: t.id,
        nip: t.nip,
        name: t.fullName,
        division: allRelations
          .filter((r) => r.teacherId === t.id)
          .map((r) => r.divisionName)
          .join(", ") || t.department || "-",
        gender: t.gender,
        daily: dailyMap, // Frontend will iterate dates and lookup this map
        stats: {
          activeDays: 0,
          presence: totalPresence,
          hours: parseFloat(totalHours.toFixed(2)),
          permitDeduct: totalPermitDeduct,
          permitNoDeduct: totalPermitNoDeduct,
          leaveDeduct: totalLeaveDeduct,
          leaveNoDeduct: totalLeaveNoDeduct,
        },
      };
    });

    // Calculate Total Active Days (excluding holidays in range)
    let countActiveDays = 0;
    let loopDate = new Date(startDate);
    while (loopDate <= endDate) {
      if (!holidays.includes(loopDate.getDay())) {
        countActiveDays++;
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }

    // Apply active days to everyone (simplification)
    result.forEach((r) => (r.stats.activeDays = countActiveDays));

    return c.json({
      success: true,
      data: {
        period: { start: isoStart, end: isoEnd },
        teachers: result,
      },
    });
  } catch (error) {
    console.error("Recap error:", error);
    return c.json({ success: false, message: "Failed to fetch recap" }, 500);
  }
});

// Delete Teacher Attendance (e.g. Claim)
attendanceRoute.delete(
  "/teachers/attendances/:id",
  requirePermission("/apps/attendance-recap"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      const existing = await db.query.teacherAttendances.findFirst({
        where: eq(teacherAttendances.id, id),
      });

      if (!existing) {
        return c.json({ success: false, message: "Attendance not found" }, 404);
      }

      await db.delete(teacherAttendances).where(eq(teacherAttendances.id, id));

      return c.json({
        success: true,
        message: "Data kehadiran berhasil dihapus",
      });
    } catch (error) {
      console.error("Delete attendance error:", error);
      return c.json(
        { success: false, message: "Gagal menghapus data kehadiran" },
        500
      );
    }
  }
);

// Teacher claim (manual attendance)
attendanceRoute.post(
  "/teachers/claim",
  zValidator("json", teacherClaimSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      // Check if duplicate for same date/activity?
      // User says "creates record in teacher_attendance table like normal".
      // We should allow basic duplicates if it's different times, but mainly we just insert.

      const user = c.get("user");
      // Security: Verify teacherId belongs to authenticated user
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, data.teacherId),
      });

      if (!teacher || teacher.userId !== user.userId) {
        return c.json(
          { success: false, message: "Unauthorized: Invalid teacher ID" },
          403
        );
      }

      const result = await db.insert(teacherAttendances).values({
        teacherId: data.teacherId,
        teacherName: teacher?.fullName || null,
        teacherDivision: teacher?.department || null,
        divisionId: teacher?.divisionId?.toString() || null,
        date: new Date(data.date), // Uses claimed date
        checkIn: data.checkIn ? data.checkIn + ":00" : null, // Append seconds
        checkOut: data.checkOut ? data.checkOut + ":00" : null,
        status: "present", // Claimed is considered present
        activity: data.activity,
        notes: data.notes,
        isClaim: true, // Mark as claim
      });

      const attendance = await db.query.teacherAttendances.findFirst({
        where: eq(teacherAttendances.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Klaim kehadiran berhasil",
        data: attendance,
      });
    } catch (error) {
      console.error("Claim error:", error);
      return c.json({ success: false, message: "Gagal mengajukan klaim" }, 500);
    }
  }
);

export default attendanceRoute;
