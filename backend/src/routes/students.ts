import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { db } from "../db";
import { students, parents } from "../db/schema/students";
import { studentParents } from "../db/schema/student-parents";
import { users } from "../db/schema/users";
import { authMiddleware, requirePermission } from "../middleware/auth";
import { hashPassword } from "../utils/password";
import {
  createStudentSchema,
  updateStudentSchema,
} from "../validators/students";
import { halaqahMembers, halaqahGroups } from "../db/schema/halaqah";
import { rooms } from "../db/schema/rooms";
import {
  classes,
  grades,
  reports,
  subjects,
  studentClasses,
  homeroomNotes,
} from "../db/schema/academic";
import {
  reportSnapshots,
  studentRoomHistory,
  studentStatusHistory,
} from "../db/schema/long-term-foundation";
import {
  tahfidzDeposits,
  tahfidzExams,
  tahfidzReportCards,
} from "../db/schema/tahfidz";
import {
  clinicPatients,
  healthExaminations,
  inpatients,
} from "../db/schema/clinic";
import { studentAttendances } from "../db/schema/attendance";
import {
  rewardsPunishments,
  studentWarnings,
} from "../db/schema/rewards-punishments";
import { teachers } from "../db/schema/teachers";
import { getStudentGenderScope, requireStudentGenderAccess } from "../utils/gender-scope";

const studentsRoute = new Hono();

// Apply auth to all routes
studentsRoute.use("*", authMiddleware);

function toDateKey(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function resolveEventDate(...values: unknown[]): string {
  for (const value of values) {
    const key = toDateKey(value);
    if (key) return key;
  }
  return new Date(0).toISOString().slice(0, 10);
}

function semesterLabel(semester: number | string | null | undefined) {
  if (!semester) return null;
  const raw = String(semester).toLowerCase();
  if (raw === "ganjil" || raw === "1") return "Semester 1";
  if (raw === "genap" || raw === "2") return "Semester 2";
  return `Semester ${semester}`;
}

function makeTimelineEvent(params: {
  date?: unknown;
  fallbackDate?: unknown;
  category: string;
  title: string;
  description?: string | null;
  meta?: Record<string, unknown>;
}) {
  return {
    date: resolveEventDate(params.date, params.fallbackDate),
    category: params.category,
    title: params.title,
    description: params.description || null,
    meta: params.meta || {},
  };
}

// ============ STUDENTS ============

// Get all students (with search, filter, and pagination)
studentsRoute.get("/", async (c) => {
  try {
    const query = c.req.query();
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "20");
    const fullName = query.fullName || "";
    const gender = query.gender || "";
    const status = query.status || "";

    // Build where conditions
    const conditions: any[] = [];

    if (fullName) {
      conditions.push(sql`${students.fullName} LIKE ${`%${fullName}%`}`);
    }
    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    if (genderScope) {
      // Guru only sees their own gender, regardless of the requested filter
      conditions.push(eq(students.gender, genderScope));
    } else if (gender) {
      conditions.push(eq(students.gender, gender as "male" | "female"));
    }
    if (status) {
      conditions.push(
        eq(
          students.status,
          status as "active" | "graduated" | "transferred" | "dropped",
        ),
      );
    }

    // Get total count first
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(students)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count || 0);
    const offset = (page - 1) * limit;

    // Get paginated students
    let allStudents;
    if (limit === 0) {
      // No limit/pagination
      if (conditions.length > 0) {
        allStudents = await db.query.students.findMany({
          where: and(...conditions),
          orderBy: (students, { asc }) => [asc(students.id)],
        });
      } else {
        allStudents = await db.query.students.findMany({
          orderBy: (students, { asc }) => [asc(students.id)],
        });
      }
    } else {
      // Normal pagination
      if (conditions.length > 0) {
        allStudents = await db.query.students.findMany({
          where: and(...conditions),
          limit: limit,
          offset: offset,
          orderBy: (students, { asc }) => [asc(students.id)],
        });
      } else {
        allStudents = await db.query.students.findMany({
          limit: limit,
          offset: offset,
          orderBy: (students, { asc }) => [asc(students.id)],
        });
      }
    }

    // Enrich students with halaqah, room, and class info
    const enrichedStudents = await Promise.all(
      allStudents.map(async (student) => {
        // Get halaqah membership
        const halaqahMember = await db.query.halaqahMembers.findFirst({
          where: eq(halaqahMembers.studentId, student.id),
        });
        let halaqah = null;
        if (halaqahMember) {
          halaqah = await db.query.halaqahGroups.findFirst({
            where: eq(halaqahGroups.id, halaqahMember.halaqahId),
          });
        }

        // Get room info
        let room = null;
        if (student.roomId) {
          room = await db.query.rooms.findFirst({
            where: eq(rooms.id, student.roomId),
          });
        }

        // Get class info
        let classInfo = null;
        if (student.classId) {
          classInfo = await db.query.classes.findFirst({
            where: eq(classes.id, student.classId),
          });
        }

        return {
          ...student,
          halaqah: halaqah ? { id: halaqah.id, name: halaqah.name } : null,
          room: room ? { id: room.id, name: room.name } : null,
          class: classInfo ? { id: classInfo.id, name: classInfo.name } : null,
        };
      }),
    );

    return c.json({
      success: true,
      data: enrichedStudents,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    return c.json({ success: false, message: "Failed to get students" }, 500);
  }
});

// Preview import students from Excel (validation only, no database insert)
studentsRoute.post(
  "/import/preview",
  requirePermission("/apps/students"),
  async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return c.json({ success: false, message: "No file uploaded" }, 400);
      }

      // Check file type
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (
        !allowedTypes.includes(file.type) &&
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls")
      ) {
        return c.json(
          {
            success: false,
            message:
              "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
          },
          400,
        );
      }

      // Parse Excel file
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return c.json(
          { success: false, message: "Excel file has no sheets" },
          400,
        );
      }
      const worksheet = workbook.Sheets[sheetName]!;
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (!data || data.length === 0) {
        return c.json(
          {
            success: false,
            message: "Excel file is empty or has no data rows",
          },
          400,
        );
      }

      // Map Excel columns to database fields
      const columnMapping: { [key: string]: string } = {
        NIS: "nis",
        NISN: "nisn",
        "NIS Santri": "nisSantri",
        "Nama Lengkap": "fullName",
        Nama: "fullName",
        "Nama Arab": "fullNameAr",
        "Jenis Kelamin": "gender",
        Gender: "gender",
        "Tanggal Lahir": "birthDate",
        "Tempat Lahir": "birthPlace",
        // Alamat removed
        Telepon: "phone",
        Phone: "phone",
        Status: "status",
        // New Address Fields
        Provinsi: "province",
        "Kabupaten/Kota": "regency",
        Kecamatan: "district",
        "Desa/Kelurahan": "village",
        "Detail Alamat": "addressDetail",
        "Kode Pos": "postalCode",
      };

      // Parent column mappings
      const parentColumnMapping: { [key: string]: string } = {
        "Nama Ayah": "fatherName",
        "Nama Ibu": "motherName",
        "Pekerjaan Ayah": "fatherOccupation",
        "Pekerjaan Ibu": "motherOccupation",
        "Telepon Orang Tua": "parentPhone",
        "Alamat Orang Tua": "parentAddress",
        "Email Orang Tua": "parentEmail",
        "Password Orang Tua": "parentPassword",
      };

      const genderMapping: { [key: string]: string } = {
        "Laki-laki": "male",
        Ikhwan: "male",
        L: "male",
        Male: "male",
        Perempuan: "female",
        Akhwat: "female",
        P: "female",
        Female: "female",
      };

      const statusMapping: { [key: string]: string } = {
        Aktif: "active",
        Active: "active",
        Lulus: "graduated",
        Graduated: "graduated",
        Pindah: "transferred",
        Transferred: "transferred",
        Keluar: "dropped",
        Dropped: "dropped",
      };

      const preview = {
        totalRows: data.length,
        validRows: 0,
        invalidRows: 0,
        duplicateNIS: 0,
        newParents: 0,
        existingParents: 0,
        errors: [] as { row: number; nis: string; error: string }[],
        validData: [] as any[],
      };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2;

        try {
          // Map row data to student object
          const studentData: any = {};
          for (const [excelCol, dbField] of Object.entries(columnMapping)) {
            if (
              row[excelCol] !== undefined &&
              row[excelCol] !== null &&
              row[excelCol] !== ""
            ) {
              studentData[dbField] = row[excelCol];
            }
          }

          // Map row data to parent object
          const parentData: any = {};
          for (const [excelCol, dbField] of Object.entries(
            parentColumnMapping,
          )) {
            if (
              row[excelCol] !== undefined &&
              row[excelCol] !== null &&
              row[excelCol] !== ""
            ) {
              parentData[dbField] = row[excelCol];
            }
          }

          // Validate required fields
          if (!studentData.nis) {
            preview.invalidRows++;
            preview.errors.push({
              row: rowNumber,
              nis: "-",
              error: "NIS wajib diisi",
            });
            continue;
          }
          if (!studentData.fullName) {
            preview.invalidRows++;
            preview.errors.push({
              row: rowNumber,
              nis: studentData.nis,
              error: "Nama wajib diisi",
            });
            continue;
          }

          // Convert gender
          if (studentData.gender) {
            studentData.gender =
              genderMapping[studentData.gender] ||
              studentData.gender.toLowerCase();
          } else {
            studentData.gender = "male";
          }

          // Convert status
          if (studentData.status) {
            studentData.status = statusMapping[studentData.status] || "active";
          } else {
            studentData.status = "active";
          }

          // Check if NIS already exists in database
          const existing = await db.query.students.findFirst({
            where: eq(students.nis, String(studentData.nis)),
          });

          if (existing) {
            preview.invalidRows++;
            preview.duplicateNIS++;
            preview.errors.push({
              row: rowNumber,
              nis: studentData.nis,
              error: "NIS sudah ada di database",
            });
            continue;
          }

          // Check parent data
          const hasParentData =
            parentData.fatherName ||
            parentData.motherName ||
            parentData.parentPhone;
          if (hasParentData && parentData.parentPhone) {
            const existingParent = await db.query.parents.findFirst({
              where: eq(parents.phone, String(parentData.parentPhone)),
            });
            if (existingParent) {
              preview.existingParents++;
            } else {
              preview.newParents++;
            }
          } else if (hasParentData) {
            preview.newParents++;
          }

          preview.validRows++;
          preview.validData.push({
            row: rowNumber,
            nis: studentData.nis,
            fullName: studentData.fullName,
            gender: studentData.gender,
            status: studentData.status,
            hasParent: hasParentData,
            parentPhone: parentData.parentPhone || null,
          });
        } catch (err: any) {
          preview.invalidRows++;
          preview.errors.push({
            row: rowNumber,
            nis: row.NIS || "-",
            error: err.message || "Unknown error",
          });
        }
      }

      return c.json({
        success: true,
        message: "Preview selesai",
        data: preview,
      });
    } catch (error: any) {
      console.error("Preview import error:", error);
      return c.json(
        {
          success: false,
          message: "Failed to preview import",
          error: error?.message,
        },
        500,
      );
    }
  },
);

// Import students from Excel
studentsRoute.post("/import", requirePermission("/apps/students"), async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ success: false, message: "No file uploaded" }, 400);
    }

    // Check file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      return c.json(
        {
          success: false,
          message:
            "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
        },
        400,
      );
    }

    // Parse Excel file
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return c.json(
        { success: false, message: "Excel file has no sheets" },
        400,
      );
    }
    const worksheet = workbook.Sheets[sheetName]!;
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (!data || data.length === 0) {
      return c.json(
        { success: false, message: "Excel file is empty or has no data rows" },
        400,
      );
    }

    // Map Excel columns to database fields
    const columnMapping: { [key: string]: string } = {
      NIS: "nis",
      NISN: "nisn",
      "NIS Santri": "nisSantri",
      "Nama Lengkap": "fullName",
      Nama: "fullName",
      "Nama Arab": "fullNameAr",
      "Jenis Kelamin": "gender",
      Gender: "gender",
      "Tanggal Lahir": "birthDate",
      "Tempat Lahir": "birthPlace",
      // Alamat removed
      Telepon: "phone",
      Phone: "phone",
      Status: "status",
      // New Address Fields
      Provinsi: "province",
      "Kabupaten/Kota": "regency",
      Kecamatan: "district",
      "Desa/Kelurahan": "village",
      "Detail Alamat": "addressDetail",
      "Kode Pos": "postalCode",
    };

    // Parent column mappings
    const parentColumnMapping: { [key: string]: string } = {
      "Nama Ayah": "fatherName",
      "Nama Ibu": "motherName",
      "Pekerjaan Ayah": "fatherOccupation",
      "Pekerjaan Ibu": "motherOccupation",
      "Telepon Orang Tua": "parentPhone",
      "Alamat Orang Tua": "parentAddress",
      "Email Orang Tua": "parentEmail",
      "Password Orang Tua": "parentPassword",
    };

    const genderMapping: { [key: string]: string } = {
      "Laki-laki": "male",
      Ikhwan: "male",
      L: "male",
      Male: "male",
      Perempuan: "female",
      Akhwat: "female",
      P: "female",
      Female: "female",
    };

    const statusMapping: { [key: string]: string } = {
      Aktif: "active",
      Active: "active",
      Lulus: "graduated",
      Graduated: "graduated",
      Pindah: "transferred",
      Transferred: "transferred",
      Keluar: "dropped",
      Dropped: "dropped",
    };

    const results = {
      success: 0,
      failed: 0,
      parentsCreated: 0,
      parentsLinked: 0,
      errors: [] as { row: number; nis: string; error: string }[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and has header row

      try {
        // Map row data to student object
        const studentData: any = {};
        for (const [excelCol, dbField] of Object.entries(columnMapping)) {
          if (
            row[excelCol] !== undefined &&
            row[excelCol] !== null &&
            row[excelCol] !== ""
          ) {
            studentData[dbField] = row[excelCol];
          }
        }

        // Map row data to parent object
        const parentData: any = {};
        for (const [excelCol, dbField] of Object.entries(parentColumnMapping)) {
          if (
            row[excelCol] !== undefined &&
            row[excelCol] !== null &&
            row[excelCol] !== ""
          ) {
            parentData[dbField] = row[excelCol];
          }
        }

        // Validate required fields
        if (!studentData.nis) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            nis: "-",
            error: "NIS wajib diisi",
          });
          continue;
        }
        if (!studentData.fullName) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            nis: studentData.nis,
            error: "Nama wajib diisi",
          });
          continue;
        }

        // Convert gender
        if (studentData.gender) {
          studentData.gender =
            genderMapping[studentData.gender] ||
            studentData.gender.toLowerCase();
        } else {
          studentData.gender = "male"; // default
        }

        // Convert status
        if (studentData.status) {
          studentData.status = statusMapping[studentData.status] || "active";
        } else {
          studentData.status = "active"; // default
        }

        // Parse date if exists
        if (studentData.birthDate) {
          // Handle Excel date serial number
          if (typeof studentData.birthDate === "number") {
            const date = XLSX.SSF.parse_date_code(studentData.birthDate);
            studentData.birthDate = new Date(date.y, date.m - 1, date.d);
          } else if (typeof studentData.birthDate === "string") {
            studentData.birthDate = new Date(studentData.birthDate);
          }
        }

        // Check if NIS already exists
        const existing = await db.query.students.findFirst({
          where: eq(students.nis, String(studentData.nis)),
        });

        if (existing) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            nis: studentData.nis,
            error: "NIS sudah ada",
          });
          continue;
        }

        // Process parent data if available
        let parentId: number | undefined;
        const hasParentData =
          parentData.fatherName ||
          parentData.motherName ||
          parentData.parentPhone;

        if (hasParentData) {
          // Check if parent with same phone already exists
          let existingParent = null;
          if (parentData.parentPhone) {
            existingParent = await db.query.parents.findFirst({
              where: eq(parents.phone, String(parentData.parentPhone)),
            });
          }

          if (existingParent) {
            // Link to existing parent
            parentId = existingParent.id;
            results.parentsLinked++;
          } else {
            // Create new parent with user account
            let parentUserId: number | undefined;

            // Create user account if email and password provided
            if (parentData.parentEmail && parentData.parentPassword) {
              // Check if email already exists
              const existingUser = await db.query.users.findFirst({
                where: eq(users.email, parentData.parentEmail),
              });

              if (!existingUser) {
                const hashedPassword = await hashPassword(
                  parentData.parentPassword,
                );
                const userResult = await db.insert(users).values({
                  email: parentData.parentEmail,
                  password: hashedPassword,
                  name: parentData.fatherName || parentData.motherName,
                  role: "parent",
                });
                parentUserId = Number(userResult[0].insertId);
              } else {
                // Use existing user if email matches
                parentUserId = existingUser.id;
              }
            }

            // Create parent record
            const parentResult = await db.insert(parents).values({
              userId: parentUserId,
              fatherName: parentData.fatherName,
              motherName: parentData.motherName,
              fatherOccupation: parentData.fatherOccupation,
              motherOccupation: parentData.motherOccupation,
              phone: parentData.parentPhone
                ? String(parentData.parentPhone)
                : undefined,
              address: parentData.parentAddress || studentData.address,
            });
            parentId = Number(parentResult[0].insertId);
            results.parentsCreated++;
          }
        }

        // Format Address Fields to JSON structure
        const formatRegion = (name: any) =>
          name ? JSON.stringify({ code: null, name: String(name) }) : undefined;

        // Auto-generate plain text address
        const generatedAddress = [
          studentData.addressDetail,
          studentData.village,
          studentData.district,
          studentData.regency,
          studentData.province,
          studentData.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        // Insert student
        const studentResult = await db.insert(students).values({
          nis: String(studentData.nis),
          nisn: studentData.nisn ? String(studentData.nisn) : undefined,
          nisSantri: studentData.nisSantri
            ? String(studentData.nisSantri)
            : undefined,
          fullName: studentData.fullName,
          fullNameAr: studentData.fullNameAr || undefined,
          gender: studentData.gender,
          birthDate: studentData.birthDate || undefined,
          birthPlace: studentData.birthPlace || undefined,
          address: studentData.address || generatedAddress || undefined,
          // Detailed address fields
          province: formatRegion(studentData.province),
          regency: formatRegion(studentData.regency),
          district: formatRegion(studentData.district),
          village: formatRegion(studentData.village),
          addressDetail: studentData.addressDetail,
          postalCode: studentData.postalCode
            ? String(studentData.postalCode)
            : undefined,

          phone: studentData.phone ? String(studentData.phone) : undefined,
          status: studentData.status,
        });

        const newStudentId = Number(studentResult[0].insertId);

        // Link student to parent if parent was created/found
        if (parentId) {
          await db.insert(studentParents).values({
            studentId: newStudentId,
            parentId: parentId,
            isPrimary: true,
          });
        }

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          nis: row.NIS || "-",
          error: err.message || "Unknown error",
        });
      }
    }

    return c.json({
      success: true,
      message: `Import selesai: ${results.success} santri berhasil, ${results.failed} gagal. Orang tua: ${results.parentsCreated} baru, ${results.parentsLinked} terhubung ke data yang ada.`,
      data: results,
    });
  } catch (error: any) {
    console.error("Import students error:", error);
    return c.json(
      {
        success: false,
        message: "Failed to import students",
        error: error?.message,
      },
      500,
    );
  }
});

// Get longitudinal student timeline/profile history
studentsRoute.get("/:id/timeline", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const student = await db.query.students.findFirst({
      where: eq(students.id, id),
    });

    if (!student) {
      return c.json({ success: false, message: "Student not found" }, 404);
    }

    const denied = await requireStudentGenderAccess(c, student.gender);
    if (denied) return denied;

    const [
      currentClass,
      currentRoom,
      classAssignments,
      roomAssignments,
      statusHistory,
      halaqahAssignments,
      academicGrades,
      academicReports,
      snapshots,
      notes,
      attendances,
      deposits,
      exams,
      tahfidzCards,
      clinicPatient,
      rewardsAndPunishments,
      warnings,
    ] = await Promise.all([
      student.classId
        ? db.query.classes.findFirst({ where: eq(classes.id, student.classId) })
        : Promise.resolve(null),
      student.roomId
        ? db.query.rooms.findFirst({ where: eq(rooms.id, student.roomId) })
        : Promise.resolve(null),
      db.query.studentClasses.findMany({
        where: eq(studentClasses.studentId, id),
        orderBy: [desc(studentClasses.academicYear), desc(studentClasses.semester)],
      }),
      db.query.studentRoomHistory.findMany({
        where: eq(studentRoomHistory.studentId, id),
        orderBy: [desc(studentRoomHistory.effectiveFrom)],
      }),
      db.query.studentStatusHistory.findMany({
        where: eq(studentStatusHistory.studentId, id),
        orderBy: [desc(studentStatusHistory.effectiveFrom)],
      }),
      db.query.halaqahMembers.findMany({
        where: eq(halaqahMembers.studentId, id),
        orderBy: [desc(halaqahMembers.joinedAt)],
      }),
      db.query.grades.findMany({
        where: eq(grades.studentId, id),
        orderBy: [desc(grades.academicYear), desc(grades.semester)],
      }),
      db.query.reports.findMany({
        where: eq(reports.studentId, id),
        orderBy: [desc(reports.academicYear), desc(reports.semester)],
      }),
      db.query.reportSnapshots.findMany({
        where: eq(reportSnapshots.studentId, id),
        orderBy: [desc(reportSnapshots.academicYear), desc(reportSnapshots.semester)],
      }),
      db.query.homeroomNotes.findMany({
        where: eq(homeroomNotes.studentId, id),
        orderBy: [desc(homeroomNotes.academicYear), desc(homeroomNotes.semester)],
      }),
      db.query.studentAttendances.findMany({
        where: eq(studentAttendances.studentId, id),
        orderBy: [desc(studentAttendances.date)],
      }),
      db.query.tahfidzDeposits.findMany({
        where: eq(tahfidzDeposits.studentId, id),
        orderBy: [desc(tahfidzDeposits.depositDate)],
      }),
      db.query.tahfidzExams.findMany({
        where: eq(tahfidzExams.studentId, id),
        orderBy: [desc(tahfidzExams.examDate)],
      }),
      db.query.tahfidzReportCards.findMany({
        where: eq(tahfidzReportCards.studentId, id),
        orderBy: [desc(tahfidzReportCards.academicYear), desc(tahfidzReportCards.semester)],
      }),
      db.query.clinicPatients.findFirst({
        where: and(eq(clinicPatients.type, "student"), eq(clinicPatients.refId, id)),
      }),
      db.query.rewardsPunishments.findMany({
        where: eq(rewardsPunishments.studentId, id),
        orderBy: [desc(rewardsPunishments.date)],
      }),
      db.query.studentWarnings.findMany({
        where: eq(studentWarnings.studentId, id),
        orderBy: [desc(studentWarnings.issueDate)],
      }),
    ]);

    const classIds = Array.from(
      new Set(
        [
          ...classAssignments.map((item) => item.classId),
          ...academicGrades.map((item) => item.classId),
          ...academicReports.map((item) => item.classId),
        ].filter(Boolean) as number[],
      ),
    );
    const roomIds = Array.from(
      new Set(roomAssignments.map((item) => item.roomId).filter(Boolean) as number[]),
    );
    const halaqahIds = Array.from(
      new Set(halaqahAssignments.map((item) => item.halaqahId).filter(Boolean) as number[]),
    );
    const subjectIds = Array.from(
      new Set(academicGrades.map((item) => item.subjectId).filter(Boolean) as number[]),
    );
    const teacherIds = Array.from(
      new Set(
        [
          ...deposits.map((item) => item.teacherId),
          ...exams.map((item) => item.examinerId),
        ].filter(Boolean) as number[],
      ),
    );

    const [classRows, roomRows, halaqahRows, subjectRows, teacherRows] =
      await Promise.all([
        classIds.length
          ? Promise.all(
              classIds.map((classId) =>
                db.query.classes.findFirst({ where: eq(classes.id, classId) }),
              ),
            )
          : Promise.resolve([]),
        roomIds.length
          ? Promise.all(
              roomIds.map((roomId) =>
                db.query.rooms.findFirst({ where: eq(rooms.id, roomId) }),
              ),
            )
          : Promise.resolve([]),
        halaqahIds.length
          ? Promise.all(
              halaqahIds.map((halaqahId) =>
                db.query.halaqahGroups.findFirst({
                  where: eq(halaqahGroups.id, halaqahId),
                }),
              ),
            )
          : Promise.resolve([]),
        subjectIds.length
          ? Promise.all(
              subjectIds.map((subjectId) =>
                db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) }),
              ),
            )
          : Promise.resolve([]),
        teacherIds.length
          ? Promise.all(
              teacherIds.map((teacherId) =>
                db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) }),
              ),
            )
          : Promise.resolve([]),
      ]);

    const classById = new Map(classRows.filter(Boolean).map((row: any) => [row.id, row]));
    const roomById = new Map(roomRows.filter(Boolean).map((row: any) => [row.id, row]));
    const halaqahById = new Map(halaqahRows.filter(Boolean).map((row: any) => [row.id, row]));
    const subjectById = new Map(subjectRows.filter(Boolean).map((row: any) => [row.id, row]));
    const teacherById = new Map(teacherRows.filter(Boolean).map((row: any) => [row.id, row]));

    const clinicConditions = clinicPatient
      ? or(
          eq(healthExaminations.clinicPatientId, clinicPatient.id),
          and(
            eq(healthExaminations.patientType, "student"),
            eq(healthExaminations.patientId, id),
          ),
        )
      : and(
          eq(healthExaminations.patientType, "student"),
          eq(healthExaminations.patientId, id),
        );

    const inpatientConditions = clinicPatient
      ? or(
          eq(inpatients.clinicPatientId, clinicPatient.id),
          and(eq(inpatients.patientType, "student"), eq(inpatients.patientId, id)),
        )
      : and(eq(inpatients.patientType, "student"), eq(inpatients.patientId, id));

    const [healthRows, inpatientRows] = await Promise.all([
      db.query.healthExaminations.findMany({
        where: clinicConditions,
        orderBy: [desc(healthExaminations.examinationDate)],
      }),
      db.query.inpatients.findMany({
        where: inpatientConditions,
        orderBy: [desc(inpatients.admissionDate)],
      }),
    ]);

    const enrichedClassHistory = classAssignments.map((assignment) => ({
      ...assignment,
      class: assignment.classId ? classById.get(assignment.classId) || null : null,
    }));

    const enrichedRoomHistory = roomAssignments.map((assignment) => ({
      ...assignment,
      room: assignment.roomId ? roomById.get(assignment.roomId) || null : null,
    }));

    const enrichedHalaqahHistory = halaqahAssignments.map((assignment) => ({
      ...assignment,
      halaqah: assignment.halaqahId
        ? halaqahById.get(assignment.halaqahId) || null
        : null,
    }));

    const enrichedGrades = academicGrades.map((grade) => ({
      ...grade,
      subject: grade.subjectId ? subjectById.get(grade.subjectId) || null : null,
      class: grade.classId ? classById.get(grade.classId) || null : null,
    }));

    const enrichedReports = academicReports.map((report) => ({
      ...report,
      class: report.classId ? classById.get(report.classId) || null : null,
    }));

    const enrichedDeposits = deposits.map((deposit) => ({
      ...deposit,
      teacher: deposit.teacherId ? teacherById.get(deposit.teacherId) || null : null,
    }));

    const enrichedExams = exams.map((exam) => ({
      ...exam,
      examiner: exam.examinerId ? teacherById.get(exam.examinerId) || null : null,
    }));

    const attendanceSummary = attendances.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      {},
    );

    const gradePeriods = new Map<string, any>();
    for (const grade of enrichedGrades) {
      const key = `${grade.academicYear || "-"}__${grade.semester || "-"}`;
      if (!gradePeriods.has(key)) {
        gradePeriods.set(key, {
          academicYear: grade.academicYear,
          semester: grade.semester,
          label: [grade.academicYear, semesterLabel(grade.semester)]
            .filter(Boolean)
            .join(" • "),
          grades: [],
          averageScore: null,
        });
      }
      gradePeriods.get(key).grades.push(grade);
    }
    for (const period of gradePeriods.values()) {
      const scores = period.grades
        .map((grade: any) => Number(grade.averageScore || grade.finalScore || 0))
        .filter((score: number) => score > 0);
      period.averageScore = scores.length
        ? Number((scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length).toFixed(2))
        : null;
    }

    const timeline = [
      makeTimelineEvent({
        date: student.enrollmentDate,
        fallbackDate: student.createdAt,
        category: "identity",
        title: "Santri terdaftar",
        description: `${student.fullName} mulai tercatat sebagai santri.`,
        meta: { status: student.status, nis: student.nis },
      }),
      ...enrichedClassHistory.map((item) =>
        makeTimelineEvent({
          date: item.effectiveFrom,
          fallbackDate: item.createdAt,
          category: "academic",
          title: `Masuk kelas ${item.class?.name || `#${item.classId}`}`,
          description: [item.academicYear, semesterLabel(item.semester), item.status]
            .filter(Boolean)
            .join(" • "),
          meta: item,
        }),
      ),
      ...enrichedRoomHistory.map((item) =>
        makeTimelineEvent({
          date: item.effectiveFrom,
          fallbackDate: item.createdAt,
          category: "dormitory",
          title: `Penempatan kamar ${item.room?.name || `#${item.roomId}`}`,
          description: [item.academicYear, item.bedLabel ? `Bed ${item.bedLabel}` : null, item.reason]
            .filter(Boolean)
            .join(" • "),
          meta: item,
        }),
      ),
      ...statusHistory.map((item) =>
        makeTimelineEvent({
          date: item.effectiveFrom,
          fallbackDate: item.createdAt,
          category: "status",
          title: `Status santri: ${item.status}`,
          description: item.reason,
          meta: item,
        }),
      ),
      ...enrichedHalaqahHistory.map((item) =>
        makeTimelineEvent({
          date: item.joinedAt,
          fallbackDate: item.createdAt,
          category: "halaqah",
          title: `Masuk halaqah ${item.halaqah?.name || `#${item.halaqahId}`}`,
          description: item.status,
          meta: item,
        }),
      ),
      ...enrichedReports.map((item) =>
        makeTimelineEvent({
          date: item.publishedAt,
          fallbackDate: item.generatedAt,
          category: "academic",
          title: `Rapor akademik ${item.academicYear} ${semesterLabel(item.semester) || ""}`.trim(),
          description: `Rata-rata ${item.averageScore || "-"}, ranking ${item.ranking || "-"}`,
          meta: item,
        }),
      ),
      ...snapshots.map((item) =>
        makeTimelineEvent({
          date: item.publishedAt,
          fallbackDate: item.createdAt,
          category: "snapshot",
          title: `Snapshot rapor ${item.reportType}`,
          description: `${item.academicYear} • ${semesterLabel(item.semester)} • ${item.status}`,
          meta: item,
        }),
      ),
      ...enrichedDeposits.map((item) =>
        makeTimelineEvent({
          date: item.depositDate,
          category: "tahfidz",
          title: `Setoran tahfidz ${item.type}`,
          description: [
            item.surahName,
            item.totalPages ? `${item.totalPages} halaman` : null,
            item.fluency,
            item.teacher?.fullName ? `Musyrif: ${item.teacher.fullName}` : null,
          ]
            .filter(Boolean)
            .join(" • "),
          meta: item,
        }),
      ),
      ...enrichedExams.map((item) =>
        makeTimelineEvent({
          date: item.examDate,
          category: "tahfidz",
          title: `Ujian tahfidz ${item.examType}`,
          description: `${item.examCategory || "Ujian"} • Nilai ${item.finalScore} • ${item.verdict}`,
          meta: item,
        }),
      ),
      ...healthRows.map((item) =>
        makeTimelineEvent({
          date: item.examinationDate,
          fallbackDate: item.createdAt,
          category: "health",
          title: item.diagnosis || "Pemeriksaan klinik",
          description: [item.symptoms, item.treatment].filter(Boolean).join(" • "),
          meta: item,
        }),
      ),
      ...inpatientRows.map((item) =>
        makeTimelineEvent({
          date: item.admissionDate,
          fallbackDate: item.createdAt,
          category: "health",
          title: "Rawat inap",
          description: [item.diagnosis, item.roomNumber, item.status].filter(Boolean).join(" • "),
          meta: item,
        }),
      ),
      ...rewardsAndPunishments.map((item) =>
        makeTimelineEvent({
          date: item.date,
          fallbackDate: item.createdAt,
          category: item.type === "reward" ? "reward" : "discipline",
          title: item.title,
          description: `${item.category} • ${item.points || 0} poin`,
          meta: item,
        }),
      ),
      ...warnings.map((item) =>
        makeTimelineEvent({
          date: item.issueDate,
          fallbackDate: item.createdAt,
          category: "discipline",
          title: `Surat peringatan level ${item.spLevel}`,
          description: item.reason,
          meta: item,
        }),
      ),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return c.json({
      success: true,
      data: {
        student: {
          ...student,
          class: currentClass ? { id: currentClass.id, name: currentClass.name } : null,
          room: currentRoom ? { id: currentRoom.id, name: currentRoom.name } : null,
        },
        summary: {
          currentClass: currentClass
            ? { id: currentClass.id, name: currentClass.name, academicYear: currentClass.academicYear }
            : null,
          currentRoom: currentRoom
            ? { id: currentRoom.id, name: currentRoom.name, building: currentRoom.building }
            : null,
          currentHalaqah:
            enrichedHalaqahHistory.find((item) => item.status === "active")?.halaqah || null,
          totals: {
            classHistory: enrichedClassHistory.length,
            roomHistory: enrichedRoomHistory.length,
            halaqahHistory: enrichedHalaqahHistory.length,
            grades: enrichedGrades.length,
            reports: enrichedReports.length,
            tahfidzDeposits: enrichedDeposits.length,
            tahfidzExams: enrichedExams.length,
            healthExaminations: healthRows.length,
            inpatients: inpatientRows.length,
            rewards: rewardsAndPunishments.filter((item) => item.type === "reward").length,
            punishments: rewardsAndPunishments.filter((item) => item.type === "punishment").length,
            warnings: warnings.length,
            timeline: timeline.length,
          },
        },
        academic: {
          classHistory: enrichedClassHistory,
          grades: enrichedGrades,
          gradePeriods: Array.from(gradePeriods.values()),
          reports: enrichedReports,
          reportSnapshots: snapshots,
          homeroomNotes: notes,
          attendance: {
            summary: attendanceSummary,
            records: attendances,
          },
        },
        tahfidz: {
          deposits: enrichedDeposits,
          exams: enrichedExams,
          reportCards: tahfidzCards,
        },
        dormitory: {
          roomHistory: enrichedRoomHistory,
        },
        halaqah: {
          memberships: enrichedHalaqahHistory,
        },
        health: {
          clinicPatient,
          examinations: healthRows,
          inpatients: inpatientRows,
        },
        discipline: {
          records: rewardsAndPunishments,
          warnings,
        },
        statusHistory,
        timeline,
      },
    });
  } catch (error: any) {
    console.error("Get student timeline error:", error);
    return c.json(
      {
        success: false,
        message: "Failed to get student timeline",
        error: error?.message || String(error),
      },
      500,
    );
  }
});

// Get student by ID
studentsRoute.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const student = await db.query.students.findFirst({
      where: eq(students.id, id),
    });

    if (!student) {
      return c.json({ success: false, message: "Student not found" }, 404);
    }

    const denied = await requireStudentGenderAccess(c, student.gender);
    if (denied) return denied;

    // Get enriched data (Halaqah, Room, Class)
    const { halaqahMembers, halaqahGroups } =
      await import("../db/schema/halaqah");
    const { rooms } = await import("../db/schema/rooms");
    const { classes } = await import("../db/schema/academic");

    // Get halaqah membership
    const halaqahMember = await db.query.halaqahMembers.findFirst({
      where: eq(halaqahMembers.studentId, student.id),
    });
    let halaqah = null;
    if (halaqahMember) {
      halaqah = await db.query.halaqahGroups.findFirst({
        where: eq(halaqahGroups.id, halaqahMember.halaqahId),
      });
    }

    // Get room info
    let room = null;
    if (student.roomId) {
      room = await db.query.rooms.findFirst({
        where: eq(rooms.id, student.roomId),
      });
    }

    // Get class info
    let classInfo = null;
    if (student.classId) {
      classInfo = await db.query.classes.findFirst({
        where: eq(classes.id, student.classId),
      });
    }

    // Get parents dari student_parents
    const { studentParents } = await import("../db/schema/student-parents");
    const parentRelations = await db.query.studentParents.findMany({
      where: eq(studentParents.studentId, id),
    });

    // Get parent details
    const parentsData = await Promise.all(
      parentRelations.map(async (rel) => {
        const parent = await db.query.parents.findFirst({
          where: eq(parents.id, rel.parentId),
        });
        return {
          ...parent,
          isPrimary: rel.isPrimary,
        };
      }),
    );

    return c.json({
      success: true,
      data: {
        ...student,
        halaqah: halaqah ? { id: halaqah.id, name: halaqah.name } : null,
        room: room ? { id: room.id, name: room.name } : null,
        class: classInfo ? { id: classInfo.id, name: classInfo.name } : null,
        parents: parentsData,
      },
    });
  } catch (error) {
    console.error("Get student error:", error);
    return c.json({ success: false, message: "Failed to get student" }, 500);
  }
});

// Create student
studentsRoute.post(
  "/",
  requirePermission("/apps/students"),
  zValidator("json", createStudentSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      // Check if NIS already exists
      const existingStudent = await db.query.students.findFirst({
        where: eq(students.nis, data.nis),
      });

      if (existingStudent) {
        return c.json({ success: false, message: "NIS already exists" }, 400);
      }

      let userId: number | undefined;

      // Create user account if email and password provided
      if (data.email && data.password) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, data.email),
        });

        if (existingUser) {
          return c.json(
            { success: false, message: "Email already exists" },
            400,
          );
        }

        const hashedPassword = await hashPassword(data.password);
        const userResult = await db.insert(users).values({
          email: data.email,
          password: hashedPassword,
          role: "student",
        });
        userId = Number(userResult[0].insertId);
      }

      const result = await db.insert(students).values({
        userId,
        nis: data.nis,
        nisn: data.nisn,
        nisSantri: data.nisSantri,
        fullName: data.fullName,
        fullNameAr: data.fullNameAr,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        birthPlace: data.birthPlace,
        gender: data.gender,
        address: data.address,
        // Separate address fields
        province: data.province,
        regency: data.regency,
        district: data.district,
        village: data.village,
        addressDetail: data.addressDetail,
        postalCode: data.postalCode,
        phone: data.phone,
        parentId: data.parentId,
        classId: data.classId,
        enrollmentDate: data.enrollmentDate
          ? new Date(data.enrollmentDate)
          : undefined,
        status: data.status || "active",
        photo: data.photo,
      });

      const newStudent = await db.query.students.findFirst({
        where: eq(students.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Student created successfully",
        data: newStudent,
      });
    } catch (error) {
      console.error("Create student error:", error);
      return c.json(
        { success: false, message: "Failed to create student" },
        500,
      );
    }
  },
);

// Update student
studentsRoute.put(
  "/:id",
  requirePermission("/apps/students"),
  zValidator("json", updateStudentSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.students.findFirst({
        where: eq(students.id, id),
      });

      if (!existing) {
        return c.json({ success: false, message: "Student not found" }, 404);
      }

      // Check if new NIS conflicts
      if (data.nis && data.nis !== existing.nis) {
        const nisExists = await db.query.students.findFirst({
          where: eq(students.nis, data.nis),
        });
        if (nisExists) {
          return c.json({ success: false, message: "NIS already exists" }, 400);
        }
      }

      await db
        .update(students)
        .set({
          ...data,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          enrollmentDate: data.enrollmentDate
            ? new Date(data.enrollmentDate)
            : undefined,
        })
        .where(eq(students.id, id));

      const updated = await db.query.students.findFirst({
        where: eq(students.id, id),
      });

      return c.json({
        success: true,
        message: "Student updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update student error:", error);
      return c.json(
        { success: false, message: "Failed to update student" },
        500,
      );
    }
  },
);

// Delete student
studentsRoute.delete("/:id", requirePermission("/apps/students"), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const existing = await db.query.students.findFirst({
      where: eq(students.id, id),
    });

    if (!existing) {
      return c.json({ success: false, message: "Student not found" }, 404);
    }

    // Delete all related records first to avoid foreign key constraint errors
    // Import and delete from all related tables
    const { halaqahMembers } = await import("../db/schema/halaqah");
    const { studentAttendances } = await import("../db/schema/attendance");
    const { grades, reports } = await import("../db/schema/academic");
    const { quranMemorizations } =
      await import("../db/schema/quran-memorization");
    const { rewardsPunishments } =
      await import("../db/schema/rewards-punishments");

    // Delete related records (using try-catch for each to avoid crashes if tables are empty)
    try {
      await db.delete(studentParents).where(eq(studentParents.studentId, id));
    } catch {}
    try {
      await db.delete(halaqahMembers).where(eq(halaqahMembers.studentId, id));
    } catch {}
    try {
      await db
        .delete(studentAttendances)
        .where(eq(studentAttendances.studentId, id));
    } catch {}
    try {
      await db.delete(grades).where(eq(grades.studentId, id));
    } catch {}
    try {
      await db.delete(reports).where(eq(reports.studentId, id));
    } catch {}
    try {
      await db
        .delete(quranMemorizations)
        .where(eq(quranMemorizations.studentId, id));
    } catch {}
    try {
      await db
        .delete(rewardsPunishments)
        .where(eq(rewardsPunishments.studentId, id));
    } catch {}

    // Then delete the student
    await db.delete(students).where(eq(students.id, id));

    // Optionally delete associated user account
    if (existing.userId) {
      await db.delete(users).where(eq(users.id, existing.userId));
    }

    return c.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete student error:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return c.json(
      {
        success: false,
        message: "Failed to delete student",
        error: error?.message || String(error),
      },
      500,
    );
  }
});

// ============ STUDENT PARENTS ============

import {
  addStudentParentSchema,
  updateStudentParentSchema,
} from "../validators/student-parents";

// Get parents of student
studentsRoute.get("/:id/parents", async (c) => {
  try {
    const studentId = parseInt(c.req.param("id"));

    const denied = await requireStudentGenderAccess(c, studentId);
    if (denied) return denied;

    const relations = await db.query.studentParents.findMany({
      where: eq(studentParents.studentId, studentId),
    });

    // Get parent details
    const parentsWithDetails = await Promise.all(
      relations.map(async (rel) => {
        const parent = await db.query.parents.findFirst({
          where: eq(parents.id, rel.parentId),
        });
        return {
          ...rel,
          parent,
        };
      }),
    );

    return c.json({
      success: true,
      data: parentsWithDetails,
    });
  } catch (error) {
    console.error("Get student parents error:", error);
    return c.json({ success: false, message: "Failed to get parents" }, 500);
  }
});

// Add parent to student
studentsRoute.post(
  "/:id/parents",
  requirePermission("/apps/students"),
  zValidator("json", addStudentParentSchema),
  async (c) => {
    try {
      const studentId = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      // Check if student exists
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });

      if (!student) {
        return c.json({ success: false, message: "Student not found" }, 404);
      }

      // Check if parent exists
      const parent = await db.query.parents.findFirst({
        where: eq(parents.id, data.parentId),
      });

      if (!parent) {
        return c.json({ success: false, message: "Parent not found" }, 404);
      }

      // Check if relation already exists
      const existing = await db.query.studentParents.findFirst({
        where: and(
          eq(studentParents.studentId, studentId),
          eq(studentParents.parentId, data.parentId),
        ),
      });

      if (existing) {
        return c.json(
          {
            success: false,
            message: "Parent is already linked to this student",
          },
          400,
        );
      }

      const result = await db.insert(studentParents).values({
        studentId,
        parentId: data.parentId,
        isPrimary: data.isPrimary || false,
      });

      const newRelation = await db.query.studentParents.findFirst({
        where: eq(studentParents.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Parent linked successfully",
        data: newRelation,
      });
    } catch (error) {
      console.error("Add student parent error:", error);
      return c.json({ success: false, message: "Failed to link parent" }, 500);
    }
  },
);

// Update parent relation
studentsRoute.put(
  "/:id/parents/:parentId",
  requirePermission("/apps/students"),
  zValidator("json", updateStudentParentSchema),
  async (c) => {
    try {
      const studentId = parseInt(c.req.param("id"));
      const parentId = parseInt(c.req.param("parentId"));
      const data = c.req.valid("json");

      const relation = await db.query.studentParents.findFirst({
        where: and(
          eq(studentParents.studentId, studentId),
          eq(studentParents.parentId, parentId),
        ),
      });

      if (!relation) {
        return c.json({ success: false, message: "Relation not found" }, 404);
      }

      await db
        .update(studentParents)
        .set(data)
        .where(eq(studentParents.id, relation.id));

      const updated = await db.query.studentParents.findFirst({
        where: eq(studentParents.id, relation.id),
      });

      return c.json({
        success: true,
        message: "Relation updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update student parent error:", error);
      return c.json(
        { success: false, message: "Failed to update relation" },
        500,
      );
    }
  },
);

// Remove parent from student
studentsRoute.delete(
  "/:id/parents/:parentId",
  requirePermission("/apps/students"),
  async (c) => {
    try {
      const studentId = parseInt(c.req.param("id"));
      const parentId = parseInt(c.req.param("parentId"));

      const relation = await db.query.studentParents.findFirst({
        where: and(
          eq(studentParents.studentId, studentId),
          eq(studentParents.parentId, parentId),
        ),
      });

      if (!relation) {
        return c.json({ success: false, message: "Relation not found" }, 404);
      }

      await db.delete(studentParents).where(eq(studentParents.id, relation.id));

      return c.json({
        success: true,
        message: "Parent unlinked successfully",
      });
    } catch (error) {
      console.error("Remove student parent error:", error);
      return c.json(
        { success: false, message: "Failed to unlink parent" },
        500,
      );
    }
  },
);

export default studentsRoute;
