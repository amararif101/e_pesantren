import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, like, or, and, sql, desc, asc, getTableColumns } from "drizzle-orm";
import { db } from "../db";
import {
  medicines,
  inpatients,
  healthExaminations,
  clinicPatients,
  clinicRooms,
  medicineUsages,
  pharmacies,
  pharmacyPharmacists,
} from "../db/schema/clinic";
import { students } from "../db/schema/students";
import { teachers } from "../db/schema/teachers";
import { studentAttendances } from "../db/schema/attendance";
import { halaqahMembers, halaqahGroups, halaqahMentors } from "../db/schema/halaqah";
import { tahfidzDeposits } from "../db/schema/tahfidz";
import { rooms } from "../db/schema/rooms";
import { classes } from "../db/schema/academic";
import { users } from "../db/schema/users";
import { authMiddleware, requirePermission } from "../middleware/auth";
import {
  createMedicineSchema,
  updateMedicineSchema,
  adjustStockSchema,
  createInpatientSchema,
  updateInpatientSchema,
  dischargePatientSchema,
  createExaminationSchema,
  updateExaminationSchema,
  createPharmacySchema,
  updatePharmacySchema,
} from "../validators/clinic";
import { z } from "zod";
import { getStudentGenderScope, clinicStudentGenderSql } from "../utils/gender-scope";

const clinicRoute = new Hono();

// Apply auth to all routes
clinicRoute.use("*", authMiddleware);

// ============ PATIENTS (Unified) ============

// Search Patients (Students, Teachers, External)
clinicRoute.get("/patients/search", async (c) => {
  try {
    const q = c.req.query("q")?.toLowerCase() || "";
    const type = c.req.query("type"); // 'student', 'teacher', 'external', or empty for all

    if (!q && !type) {
      return c.json({ success: true, data: [] });
    }

    let results: any[] = [];

    // 1. Search Students
    if (!type || type === "student") {
      const user = c.get("user");
      const genderScope = await getStudentGenderScope(user.userId, user.role);
      const studentResults = await db
        .select({
          id: students.id,
          name: students.fullName,
          refId: students.id, // for frontend consistency
          identifier: students.nis,
          gender: students.gender,
          address: students.address,
          classId: students.classId,
        })
        .from(students)
        .where(
          and(
            or(like(students.fullName, `%${q}%`), like(students.nis, `%${q}%`)),
            genderScope ? eq(students.gender, genderScope) : undefined,
          ),
        )
        .limit(10);

      results.push(
        ...studentResults.map((s) => ({
          ...s,
          type: "student",
          source: "db_students",
        })),
      );
    }

    // 2. Search Teachers
    if (!type || type === "teacher") {
      const teacherResults = await db
        .select({
          id: teachers.id,
          name: teachers.fullName,
          refId: teachers.id,
          identifier: teachers.nip,
          gender: teachers.gender,
          address: teachers.address,
        })
        .from(teachers)
        .where(
          or(like(teachers.fullName, `%${q}%`), like(teachers.nip, `%${q}%`)),
        )
        .limit(10);

      results.push(
        ...teacherResults.map((t) => ({
          ...t,
          type: "teacher",
          source: "db_teachers",
        })),
      );
    }

    // 3. Search External / Existing Clinic Patients
    // We search the unified table. Note: Students/Teachers might ALREADY be here.
    // Ideally, frontend should handle "if student, select" -> backend checks if exists in clinic_patients.

    if (!type || type === "external") {
      const externalResults = await db
        .select()
        .from(clinicPatients)
        .where(
          and(
            eq(clinicPatients.type, "external"),
            like(clinicPatients.name, `%${q}%`),
          ),
        )
        .limit(10);

      results.push(
        ...externalResults.map((e) => ({
          id: e.id, // This is the REAL clinic_patient_id
          refId: null,
          name: e.name,
          identifier: "-",
          gender: e.gender,
          address: e.address,
          type: "external",
          source: "clinic_patients",
        })),
      );
    }

    // Check for existing linkage for students/teachers in results
    // This is optional but helpful: if a student is already in clinic_patients, we might want to know.
    // For now, simpler: Frontend sends selection. Backend getOrCreateClinicPatient.

    return c.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Search patients error:", error);
    return c.json(
      { success: false, message: "Failed to search patients" },
      500,
    );
  }
});

// Helper: Get or Create Clinic Patient
async function getOrCreateClinicPatient(data: {
  type: "student" | "teacher" | "external";
  refId?: number;
  name: string;
  gender?: "L" | "P";
  phone?: string;
  dob?: string;
  birthPlace?: string;
  bloodType?: string;
  // Address Fields
  address?: string; // Legacy/Display
  province?: any;
  regency?: any;
  district?: any;
  village?: any;
  addressDetail?: string;
  postalCode?: string;
  clinicPatientId?: number;
}) {
  // 0. If ID provided, use it (Prevent Duplicates for External)
  if (data.clinicPatientId) {
    const existing = await db.query.clinicPatients.findFirst({
      where: eq(clinicPatients.id, data.clinicPatientId),
    });
    if (existing) {
      // Allow updating clinical info if provided
      if (
        data.bloodType !== undefined &&
        existing.bloodType !== data.bloodType
      ) {
        await db
          .update(clinicPatients)
          .set({ bloodType: data.bloodType })
          .where(eq(clinicPatients.id, existing.id));
        existing.bloodType = data.bloodType;
      }
      return existing;
    }
  }

  // 1. If linked (student/teacher), check if exists
  if (data.type !== "external" && data.refId) {
    const existing = await db.query.clinicPatients.findFirst({
      where: and(
        eq(clinicPatients.type, data.type),
        eq(clinicPatients.refId, data.refId),
      ),
    });

    // Update existing record if bloodType provided (Syncing clinical data)
    if (existing) {
      if (data.bloodType && existing.bloodType !== data.bloodType) {
        await db
          .update(clinicPatients)
          .set({ bloodType: data.bloodType })
          .where(eq(clinicPatients.id, existing.id));
        existing.bloodType = data.bloodType;
      }
      return existing;
    }
  }

  // 2. If not exists, create
  // Map gender correctly if needed. Schema expects "L" | "P".
  // Students schema: 'male'|'female'. Teachers: 'male'|'female'.
  let gender: "L" | "P" = "L";

  const g = data.gender as string;
  if (g === "female" || g === "P") gender = "P";

  const insertValues = {
    type: data.type,
    refId: data.refId || null,
    name: data.name,
    gender: gender,
    phone: data.phone,
    dob: data.dob ? new Date(data.dob) : undefined,
    birthPlace: data.birthPlace,
    bloodType: data.bloodType,

    // Address
    address: data.address,
    province: data.province ? JSON.stringify(data.province) : null,
    regency: data.regency ? JSON.stringify(data.regency) : null,
    district: data.district ? JSON.stringify(data.district) : null,
    village: data.village ? JSON.stringify(data.village) : null,
    addressDetail: data.addressDetail,
    postalCode: data.postalCode,
  };

  const res = await db.insert(clinicPatients).values(insertValues);
  return { ...insertValues, id: Number(res[0].insertId) };
}

// Get All Patients (Clinic Master Data)
clinicRoute.get("/patients/all", async (c) => {
  try {
    const user = c.get("user");
    const genderScope = await getStudentGenderScope(user.userId, user.role);
    const all = await db.query.clinicPatients.findMany({
      where: clinicStudentGenderSql(genderScope),
      orderBy: desc(clinicPatients.id),
      limit: 500, // Limit for performance
    });

    const enriched = await Promise.all(all.map(async (p) => {
      let classInfo = null;
      let halaqah = null;
      let room = null;

      if (p.type === 'student' && p.refId) {
        // Find student
        const student = await db.query.students.findFirst({
          where: eq(students.id, p.refId)
        });

        if (student) {
          if (student.classId) {
            classInfo = await db.query.classes.findFirst({ where: eq(classes.id, student.classId) });
          }
          if (student.roomId) {
            room = await db.query.rooms.findFirst({ where: eq(rooms.id, student.roomId) });
          }
          const halaqahMember = await db.query.halaqahMembers.findFirst({ where: eq(halaqahMembers.studentId, student.id) });
          if (halaqahMember) {
            halaqah = await db.query.halaqahGroups.findFirst({ where: eq(halaqahGroups.id, halaqahMember.halaqahId) });
          }
        }
      }

      return {
        ...p,
        class: classInfo ? { id: classInfo.id, name: classInfo.name } : null,
        room: room ? { id: room.id, name: room.name } : null,
        halaqah: halaqah ? { id: halaqah.id, name: halaqah.name } : null,
      };
    }));

    return c.json({ success: true, data: enriched });
  } catch (e) {
    return c.json({ success: false, message: "Failed" }, 500);
  }
});

// Update Patient (Clinic Master Data)
clinicRoute.put("/patients/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    const updateData: any = {
      dob: body.dob ? new Date(body.dob) : null,
      birthPlace: body.birthPlace,
      bloodType: body.bloodType,
      phone: body.phone,
      gender: body.gender,
      updatedAt: new Date(),
    };

    // If external, allow updating name/address fully
    // If student/teacher, we might restrict name updates here or sync back?
    // For now, let's allow updating clinical/address fields for all.
    // Address updates:
    if (body.province !== undefined)
      updateData.province = body.province
        ? JSON.stringify(body.province)
        : null;
    if (body.regency !== undefined)
      updateData.regency = body.regency ? JSON.stringify(body.regency) : null;
    if (body.district !== undefined)
      updateData.district = body.district
        ? JSON.stringify(body.district)
        : null;
    if (body.village !== undefined)
      updateData.village = body.village ? JSON.stringify(body.village) : null;
    if (body.addressDetail !== undefined)
      updateData.addressDetail = body.addressDetail;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;

    // Allow name update only for external
    if (body.type === "external" && body.name) {
      updateData.name = body.name;
    }

    await db
      .update(clinicPatients)
      .set(updateData)
      .where(eq(clinicPatients.id, id));
    return c.json({ success: true, message: "Updated" });
  } catch (e) {
    console.error(e);
    return c.json({ success: false, message: "Failed" }, 500);
  }
});

// Delete Patient
clinicRoute.delete(
  "/patients/:id",
  requirePermission("/apps/clinic/patients"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      // Check usage
      const hasExams = await db.query.healthExaminations.findFirst({
        where: eq(healthExaminations.clinicPatientId, id),
      });
      const hasInpatient = await db.query.inpatients.findFirst({
        where: eq(inpatients.clinicPatientId, id),
      });

      if (hasExams || hasInpatient) {
        return c.json(
          {
            success: false,
            message:
              "Pasien tidak dapat dihapus karena masih memiliki riwayat pemeriksaan/rawat inap. Hapus data riwayat terlebih dahulu.",
          },
          400,
        );
      }

      await db.delete(clinicPatients).where(eq(clinicPatients.id, id));
      return c.json({ success: true, message: "Deleted" });
    } catch (e) {
      return c.json({ success: false, message: "Failed" }, 500);
    }
  },
);

// ============ ROOMS ============

// Get Rooms with Occupancy
clinicRoute.get("/rooms", async (c) => {
  try {
    const rooms = await db.query.clinicRooms.findMany();

    // Calculate occupancy
    // We need to count ACTIVE inpatients per room.
    const activeInpatients = await db
      .select({ roomId: inpatients.roomId, bedNumber: inpatients.bedNumber })
      .from(inpatients)
      .where(eq(inpatients.status, "admitted"));

    const roomsWithStats = rooms.map((r) => {
      const occupied = activeInpatients.filter((p) => p.roomId === r.id);
      return {
        ...r,
        occupied: occupied.length,
        isFull: occupied.length >= r.capacity,
        occupiedBedNumbers: occupied.map((p) => p.bedNumber).filter(Boolean),
      };
    });

    return c.json({ success: true, data: roomsWithStats });
  } catch (e) {
    console.error("Get rooms error", e);
    return c.json({ success: false, message: "Failed" }, 500);
  }
});

// Create Room
clinicRoute.post(
  "/rooms",
  requirePermission("/apps/clinic/rooms"),
  async (c) => {
    try {
      const body = await c.req.json();
      const res = await db.insert(clinicRooms).values({
        name: body.name,
        capacity: body.capacity || 1,
        gender: body.gender || "mixed",
        description: body.description,
      });
      return c.json({ success: true, message: "Room created" });
    } catch (e) {
      return c.json({ success: false, message: "Failed" }, 500);
    }
  },
);

// Update Room
clinicRoute.put(
  "/rooms/:id",
  requirePermission("/apps/clinic/rooms"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      await db
        .update(clinicRooms)
        .set({
          name: body.name,
          capacity: body.capacity,
          gender: body.gender,
          description: body.description,
        })
        .where(eq(clinicRooms.id, id));
      return c.json({ success: true, message: "Room updated" });
    } catch (e) {
      return c.json({ success: false, message: "Failed" }, 500);
    }
  },
);

// Delete Room
clinicRoute.delete(
  "/rooms/:id",
  requirePermission("/apps/clinic/rooms"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      // Check if room has active inpatients
      const activeUsage = await db.query.inpatients.findFirst({
        where: and(
          eq(inpatients.roomId, id),
          eq(inpatients.status, "admitted"),
        ),
      });

      if (activeUsage) {
        return c.json(
          {
            success: false,
            message:
              "Ruangan tidak dapat dihapus karena ada pasien yang sedang dirawat.",
          },
          400,
        );
      }

      await db.delete(clinicRooms).where(eq(clinicRooms.id, id));
      return c.json({ success: true, message: "Room deleted" });
    } catch (e) {
      return c.json({ success: false, message: "Failed to delete room" }, 500);
    }
  },
);

// ============ MEDICINES ============

// Get all medicines
clinicRoute.get("/medicines", async (c) => {
  try {
    const allMedicines = await db.query.medicines.findMany({
      orderBy: asc(medicines.name),
      with: {
        pharmacy: true,
      },
    });
    const medicinesWithWarning = allMedicines.map((med) => ({
      ...med,
      pharmacyName: med.pharmacy?.name || null,
      isLowStock: med.stock <= (med.minStock || 10),
    }));
    return c.json({ success: true, data: medicinesWithWarning });
  } catch (error) {
    return c.json({ success: false, message: "Failed to get medicines" }, 500);
  }
});

// Create medicine
clinicRoute.post(
  "/medicines",
  requirePermission("/apps/clinic/medicines"),
  zValidator("json", createMedicineSchema),
  async (c) => {
    const data = c.req.valid("json");
    await db.insert(medicines).values({
      ...data,
      name: data.name.trim(),
      price: data.price ? String(data.price) : "0",
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    });
    return c.json({ success: true, message: "Medicine added" });
  },
);

// Update medicine
clinicRoute.put(
  "/medicines/:id",
  requirePermission("/apps/clinic/medicines"),
  zValidator("json", updateMedicineSchema),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const data = c.req.valid("json");
    await db
      .update(medicines)
      .set({
        ...data,
        name: data.name ? data.name.trim() : undefined,
        price: data.price ? String(data.price) : "0",
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      })
      .where(eq(medicines.id, id));
    return c.json({ success: true, message: "Medicine updated" });
  },
);

// Delete medicine
clinicRoute.delete(
  "/medicines/:id",
  requirePermission("/apps/clinic/medicines"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      // Check usage history
      const usage = await db.query.medicineUsages.findFirst({
        where: eq(medicineUsages.medicineId, id),
      });

      if (usage) {
        return c.json(
          {
            success: false,
            message:
              "Obat tidak dapat dihapus karena memiliki riwayat penggunaan.",
          },
          400,
        );
      }

      await db.delete(medicines).where(eq(medicines.id, id));
      return c.json({ success: true, message: "Medicine deleted" });
    } catch (e) {
      return c.json(
        { success: false, message: "Failed to delete medicine" },
        500,
      );
    }
  },
);

// ============ IMPORT MEDICINES ============

// Preview import medicines
clinicRoute.post(
  "/medicines/import/preview",
  requirePermission("/apps/clinic/medicines"),
  async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return c.json({ success: false, message: "No file uploaded" }, 400);
      }

      // Fetch pharmacies list for lookup
      const allPharmacies = await db.query.pharmacies.findMany();
      const pharmacyMapByName = new Map(
        allPharmacies.map((p) => [p.name.toLowerCase().trim(), p.id])
      );

      // Parse Excel file
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return c.json({ success: false, message: "File Excel kosong atau tidak ada data" }, 400);
      }
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        return c.json({ success: false, message: "Worksheet tidak ditemukan" }, 400);
      }
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (!data || data.length === 0) {
        return c.json(
          {
            success: false,
            message: "File Excel kosong atau tidak ada data",
          },
          400,
        );
      }

      // Column Mappings
      const map: { [key: string]: string } = {
        "Nama Obat": "name",
        Nama: "name",
        Kategori: "category",
        "Rute Pemberian": "administrationRoute",
        Rute: "administrationRoute",
        "Rute Obat": "administrationRoute",
        "Kelompok Rute": "administrationRoute",
        Route: "administrationRoute",
        Stok: "stock",
        Satuan: "unit",
        "Harga Beli": "price", // Optional
        "Harga Jual": "sellPrice", // Optional, mapped to standard price if needed
        Harga: "price",
        "Min Stok": "minStock",
        "Kadaluarsa (YYYY-MM-DD)": "expiryDate",
        Kadaluarsa: "expiryDate",
        Deskripsi: "description",
        Apotik: "pharmacyName",
        Apotek: "pharmacyName",
        "Lokasi Apotik": "pharmacyName",
        "Lokasi Apotek": "pharmacyName",
        "Lokasi": "pharmacyName",
      };

      const preview = {
        totalRows: data.length,
        validRows: 0,
        invalidRows: 0,
        errors: [] as any[],
        validData: [] as any[],
      };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2;

        try {
          const item: any = {};
          for (const [k, v] of Object.entries(map)) {
            if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
              item[v] = row[k];
            }
          }

          if (!item.name) throw new Error("Nama Obat wajib diisi");

          // Normalize
          if (item.stock) item.stock = parseInt(item.stock) || 0;
          if (item.minStock) item.minStock = parseInt(item.minStock) || 10;
          if (item.price) item.price = String(item.price);

          // Date Parsing
          if (item.expiryDate) {
            if (typeof item.expiryDate === "number") {
              const date = XLSX.SSF.parse_date_code(item.expiryDate);
              item.expiryDate = `${date.y}-${String(date.m).padStart(
                2,
                "0",
              )}-${String(date.d).padStart(2, "0")}`;
            } else {
              // Try to parse string date
              const d = new Date(item.expiryDate);
              if (!isNaN(d.getTime())) {
                item.expiryDate = d.toISOString().split("T")[0];
              }
            }
          }

          // Link pharmacyId if pharmacyName exists
          if (item.pharmacyName) {
            const normName = String(item.pharmacyName).toLowerCase().trim();
            const foundId = pharmacyMapByName.get(normName);
            if (foundId) {
              item.pharmacyId = foundId;
            } else {
              item.pharmacyId = null;
            }
          } else {
            item.pharmacyId = null;
          }

          preview.validRows++;
          preview.validData.push(item);
        } catch (e: any) {
          preview.invalidRows++;
          preview.errors.push({
            row: rowNum,
            error: e.message,
            name: row["Nama Obat"] || row["Nama"] || "-",
          });
        }
      }

      return c.json({ success: true, data: preview });
    } catch (e: any) {
      console.error(e);
      return c.json({ success: false, message: e.message }, 500);
    }
  },
);

// Import medicines
clinicRoute.post(
  "/medicines/import",
  requirePermission("/apps/clinic/medicines"),
  async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File;
      if (!file) return c.json({ success: false, message: "No file" }, 400);

      // Fetch pharmacies list for lookup
      const allPharmacies = await db.query.pharmacies.findMany();
      const pharmacyMapByName = new Map(
        allPharmacies.map((p) => [p.name.toLowerCase().trim(), p.id])
      );

      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return c.json({ success: false, message: "File Excel kosong atau tidak ada data" }, 400);
      }
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        return c.json({ success: false, message: "Worksheet tidak ditemukan" }, 400);
      }
      const data = XLSX.utils.sheet_to_json(
        worksheet,
      ) as any[];

      const map: { [key: string]: string } = {
        "Nama Obat": "name",
        Nama: "name",
        Kategori: "category",
        "Rute Pemberian": "administrationRoute",
        Rute: "administrationRoute",
        "Rute Obat": "administrationRoute",
        "Kelompok Rute": "administrationRoute",
        Route: "administrationRoute",
        Stok: "stock",
        Satuan: "unit",
        Harga: "price",
        "Min Stok": "minStock",
        "Kadaluarsa (YYYY-MM-DD)": "expiryDate",
        Kadaluarsa: "expiryDate",
        Deskripsi: "description",
        Apotik: "pharmacyName",
        Apotek: "pharmacyName",
        "Lokasi Apotik": "pharmacyName",
        "Lokasi Apotek": "pharmacyName",
        "Lokasi": "pharmacyName",
      };

      const result = { success: 0, failed: 0, errors: [] as any[] };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2;

        try {
          const item: any = {};
          for (const [k, v] of Object.entries(map)) {
            if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
              item[v] = row[k];
            }
          }

          const nameTrimmed = String(item.name || "").trim();
          if (!nameTrimmed) throw new Error("Nama Obat wajib diisi");

          // Link pharmacyId if pharmacyName exists
          let pharmacyId: number | null = null;
          if (item.pharmacyName) {
            const normName = String(item.pharmacyName).toLowerCase().trim();
            const foundId = pharmacyMapByName.get(normName);
            if (foundId) {
              pharmacyId = foundId;
            }
          }

          // Check duplicate by Name
          const existing = await db.query.medicines.findFirst({
            where: eq(medicines.name, nameTrimmed),
          });

          // Formatting
          const finalData = {
            name: nameTrimmed,
            category: item.category,
            stock: parseInt(item.stock) || 0,
            minStock: parseInt(item.minStock) || 10,
            unit: item.unit,
            price: item.price ? String(item.price) : "0",
            description: item.description,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            pharmacyId: pharmacyId,
          };

          if (finalData.expiryDate && isNaN(finalData.expiryDate.getTime())) {
            // Handle excel date code if needed
            if (typeof item.expiryDate === "number") {
              const d = XLSX.SSF.parse_date_code(item.expiryDate);
              finalData.expiryDate = new Date(d.y, d.m - 1, d.d);
            } else {
              finalData.expiryDate = undefined;
            }
          }

          if (existing) {
            // Update existing? Or skip?
            // Let's UPDATE existing stock (add?) or REPLACE?
            // Standard import behavior: Replace info, maybe Add stock?
            // For simplicity: Replace info, but carefully with stock.
            // Let's assume user wants to SET current stock from file.
            await db
              .update(medicines)
              .set({ ...finalData, updatedAt: new Date() })
              .where(eq(medicines.id, existing.id));
          } else {
            await db.insert(medicines).values(finalData);
          }

          result.success++;
        } catch (e: any) {
          result.failed++;
          result.errors.push({ row: rowNum, error: e.message });
        }
      }

      return c.json({ success: true, data: result });
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500);
    }
  },
);

// ============ INPATIENTS ============

// Get all inpatients
clinicRoute.get("/inpatients", async (c) => {
  try {
    const status = c.req.query("status");

    // We need to join with clinicPatients and clinicRooms to get names
    // For simplicity using Drizzle query API which handles relations if defined
    // But currently relations are not fully defined in 'relations.ts' for the new tables.
    // So we fetch and map, or use db.select().from().innerJoin()

    // Let's use db.select for better join control
    const query = db
      .select({
        id: inpatients.id,
        clinicPatientId: inpatients.clinicPatientId,
        status: inpatients.status,
        admissionDate: inpatients.admissionDate,
        admissionTime: inpatients.admissionTime,
        dischargeDate: inpatients.dischargeDate,
        diagnosis: inpatients.diagnosis,
        bedNumber: inpatients.bedNumber,
        roomNumber: inpatients.roomNumber, // Legacy
        roomId: inpatients.roomId,

        // Patient Info
        patientName: clinicPatients.name,
        patientType: clinicPatients.type,
        patientBloodType: clinicPatients.bloodType,

        // Room Info
        roomName: clinicRooms.name,
      })
      .from(inpatients)
      .leftJoin(
        clinicPatients,
        eq(inpatients.clinicPatientId, clinicPatients.id),
      )
      .leftJoin(clinicRooms, eq(inpatients.roomId, clinicRooms.id))
      .orderBy(desc(inpatients.admissionDate));

    const inpatientUser = c.get("user");
    const inpatientGenderScope = await getStudentGenderScope(inpatientUser.userId, inpatientUser.role);

    const inpatientConditions = [];
    if (status) inpatientConditions.push(eq(inpatients.status, status as any));
    const inpatientGenderSql = clinicStudentGenderSql(inpatientGenderScope);
    if (inpatientGenderSql) inpatientConditions.push(inpatientGenderSql);
    if (inpatientConditions.length > 0) {
      // @ts-ignore
      query.where(and(...inpatientConditions));
    }

    const results = await query;

    // Remap for frontend compatibility
    const mapped = results.map((r) => ({
      ...r,
      student: { fullName: r.patientName }, // Mock student object for frontend compatibility
      studentId: "-",
    }));

    return c.json({ success: true, data: mapped });
  } catch (error) {
    console.error("Get inpatients error:", error);
    return c.json({ success: false, message: "Failed" }, 500);
  }
});

// Admit patient (Updated)
clinicRoute.post(
  "/inpatients",
  requirePermission("/apps/clinic/inpatients"),
  async (c) => {
    try {
      const body = await c.req.json();
      const user = c.get("user");

      // 1. Get or Create ClinicPatient
      const patient = await getOrCreateClinicPatient({
        clinicPatientId: body.clinicPatientId,
        type: body.patientType, // 'student' | 'teacher' | 'external'
        refId: body.refId, // ID of student/teacher
        name: body.name,
        gender: body.gender,
        phone: body.phone,
        address: body.address,
        dob: body.dob,
        bloodType: body.bloodType,
      });

      // 2. Insert Inpatient
      await db.insert(inpatients).values({
        clinicPatientId: patient.id,
        patientType: body.patientType, // Legacy/Fallback
        patientId: body.refId, // Legacy/Fallback

        roomId: body.roomId || null,
        bedNumber: body.bedNumber || "0",

        diagnosis: body.diagnosis,
        admissionDate: body.admissionDate
          ? new Date(body.admissionDate)
          : new Date(),
        admissionTime: body.admissionTime,
        notes: body.notes,
        status: "admitted",
        createdBy: user.userId,
      });

      return c.json({ success: true, message: "Patient admitted" });
    } catch (e) {
      console.error(e);
      return c.json({ success: false, message: "Failed" }, 500);
    }
  },
);

clinicRoute.put(
  "/inpatients/:id",
  requirePermission("/apps/clinic/inpatients"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      // 1. Get current record
      const current = await db.query.inpatients.findFirst({
        where: eq(inpatients.id, id),
      });

      if (!current) {
        return c.json({ success: false, message: "Not found" }, 404);
      }

      // 2. Capacity Check (Only if room is changing and status is admitted)
      if (
        body.roomId &&
        body.roomId !== current.roomId &&
        body.status === "admitted"
      ) {
        // Check target room
        const room = await db.query.clinicRooms.findFirst({
          where: eq(clinicRooms.id, body.roomId),
        });

        if (room) {
          // Count active patients in target room
          const occupied = await db
            .select({ count: sql<number>`count(*)` })
            .from(inpatients)
            .where(
              and(
                eq(inpatients.roomId, body.roomId),
                eq(inpatients.status, "admitted"),
              ),
            );

          if (occupied && occupied.length > 0 && occupied[0] !== undefined && occupied[0].count >= room.capacity) {
            return c.json(
              {
                success: false,
                message: `Ruangan ${room.name} penuh! Kapasitas: ${room.capacity}`,
              },
              400,
            );
          }
        }
      }

      // 3. Update Patient Info (specifically Blood Type)
      if (current.clinicPatientId && body.bloodType) {
        await db
          .update(clinicPatients)
          .set({ bloodType: body.bloodType })
          .where(eq(clinicPatients.id, current.clinicPatientId!));
      }

      await db
        .update(inpatients)
        .set({
          roomId: body.roomId,
          bedNumber: body.bedNumber,
          diagnosis: body.diagnosis,
          notes: body.notes,
          status: body.status,
          dischargeDate: body.dischargeDate
            ? new Date(body.dischargeDate)
            : null,
        })
        .where(eq(inpatients.id, id));

      return c.json({ success: true, message: "Updated" });
    } catch (e) {
      return c.json({ success: false, message: "Failed to update" }, 500);
    }
  },
);

clinicRoute.delete(
  "/inpatients/:id",
  requirePermission("/apps/clinic/dashboard"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      // If linked to an exam, update the exam?
      // Or just delete the inpatient record.
      // Ideally we un-flag the exam if it was the source, but the link is loose.
      // 1. Unset inpatientId in healthExaminations if linked (FK Constraint Fix)
      await db
        .update(healthExaminations)
        .set({ isInpatient: false, inpatientId: null })
        .where(eq(healthExaminations.inpatientId, id));

      // 2. Delete Inpatient
      await db.delete(inpatients).where(eq(inpatients.id, id));

      return c.json({ success: true, message: "Deleted" });
    } catch (e) {
      return c.json({ success: false, message: "Failed" }, 500);
    }
  },
);

// ============ EXAMINATIONS (Updated) ============

clinicRoute.get("/examinations", async (c) => {
  const { clinicPatientId, patientId, refId, name, patientType } = c.req.query();

  const conditions = [];

  if (clinicPatientId) {
    conditions.push(eq(healthExaminations.clinicPatientId, Number(clinicPatientId)));
  }

  const targetPatientId = patientId || refId;
  if (targetPatientId) {
    conditions.push(eq(healthExaminations.patientId, Number(targetPatientId)));
  }

  if (name) {
    conditions.push(
      or(
        like(clinicPatients.name, `%${name}%`),
        like(healthExaminations.patientId, `%${name}%`)
      )
    );
  }

  const examUser = c.get("user");
  const examGenderScope = await getStudentGenderScope(examUser.userId, examUser.role);
  const examGenderSql = clinicStudentGenderSql(examGenderScope);
  if (examGenderSql) conditions.push(examGenderSql);

  let query = db
    .select({
      ...getTableColumns(healthExaminations),
      patientName: clinicPatients.name,
      patientType: clinicPatients.type,
      patientGender: clinicPatients.gender,
      patientPhone: clinicPatients.phone,
      patientDob: clinicPatients.dob,
      patientBirthPlace: clinicPatients.birthPlace,
      patientBloodType: clinicPatients.bloodType,
      patientAddress: clinicPatients.address,
      patientProvince: clinicPatients.province,
      patientRegency: clinicPatients.regency,
      patientDistrict: clinicPatients.district,
      patientVillage: clinicPatients.village,
      patientAddressDetail: clinicPatients.addressDetail,
      patientPostalCode: clinicPatients.postalCode,
      examinerName: users.name,
      hasSickLeave: sql<boolean>`EXISTS (
        SELECT 1 FROM student_attendances 
        WHERE student_attendances.student_id = ${healthExaminations.patientId} 
        AND DATE(student_attendances.date) = DATE(${healthExaminations.examinationDate})
        AND student_attendances.status = 'sick'
      )`,
    })
    .from(healthExaminations)
    .leftJoin(
      clinicPatients,
      eq(healthExaminations.clinicPatientId, clinicPatients.id),
    )
    .leftJoin(
      users,
      eq(healthExaminations.examiner, users.id),
    )
    .$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const list = await query
    .orderBy(desc(healthExaminations.examinationDate))
    .limit(50);

  const mapped = await Promise.all(list.map(async (l) => {
    let classInfo = null;
    let halaqah = null;
    let room = null;

    if (l.patientType === 'student' && l.patientId) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, l.patientId)
      });
      if (student) {
        if (student.classId) {
          classInfo = await db.query.classes.findFirst({ where: eq(classes.id, student.classId) });
        }
        if (student.roomId) {
          room = await db.query.rooms.findFirst({ where: eq(rooms.id, student.roomId) });
        }
        const halaqahMember = await db.query.halaqahMembers.findFirst({ where: eq(halaqahMembers.studentId, student.id) });
        if (halaqahMember) {
          halaqah = await db.query.halaqahGroups.findFirst({ where: eq(halaqahGroups.id, halaqahMember.halaqahId) });
        }
      }
    }

    let inpatientData = null;
    if (l.isInpatient && l.inpatientId) {
      const inpatientInfo = await db.query.inpatients.findFirst({
        where: eq(inpatients.id, l.inpatientId)
      });
      if (inpatientInfo) {
        let clinicRoomName = "-";
        if (inpatientInfo.roomId) {
          const r = await db.query.clinicRooms.findFirst({ where: eq(clinicRooms.id, inpatientInfo.roomId) });
          if (r) clinicRoomName = r.name;
        }
        inpatientData = {
          roomName: clinicRoomName,
          bedNumber: inpatientInfo.bedNumber,
          admissionDate: inpatientInfo.admissionDate,
          dischargeDate: inpatientInfo.dischargeDate,
        };
      }
    }

    const usages = await db
      .select()
      .from(medicineUsages)
      .where(eq(medicineUsages.examinationId, l.id));

    const consumedMedicines = await Promise.all(
      usages.map(async (u) => {
        const med = await db.query.medicines.findFirst({
          where: eq(medicines.id, u.medicineId),
          with: {
            pharmacy: true,
          },
        });
        return {
          id: u.medicineId,
          name: med?.name || "Obat",
          quantity: u.quantity,
          unit: med?.unit || "pcs",
          isManual: false,
          pharmacyName: med?.pharmacy?.name || null,
        };
      })
    );

    return {
      ...l,
      student: { fullName: l.patientName }, // Compat
      studentId: l.patientId || "-", // Reverting to safe default
      refId: l.patientId, // Reverting

      date: l.examinationDate,
      complaint: l.symptoms,
      hasSickLeave: Boolean(l.hasSickLeave),
      class: classInfo ? { id: classInfo.id, name: classInfo.name } : null,
      room: room ? { id: room.id, name: room.name } : null,
      halaqah: halaqah ? { id: halaqah.id, name: halaqah.name } : null,
      inpatient: inpatientData,
      consumedMedicines,
      examinerName: l.examinerName || "-",
    };
  }));

  return c.json({ success: true, data: mapped });
});

clinicRoute.post(
  "/examinations",
  requirePermission("/apps/clinic/dashboard"),
  async (c) => {
    try {
      const body = await c.req.json();
      const user = c.get("user");

      // 1. Get or Create Patient
      const patient = await getOrCreateClinicPatient({
        clinicPatientId: body.clinicPatientId,
        type: body.patientType,
        refId: body.refId,
        name: body.name,
        gender: body.gender,
        phone: body.phone,
      });

      // 2. Insert Exam
      const res = await db.insert(healthExaminations).values({
        clinicPatientId: patient.id,
        patientType: body.patientType,
        patientId: body.refId,

        examinationDate: body.date ? new Date(body.date) : new Date(),

        diagnosis: body.diagnosis,
        treatment: body.treatment,
        symptoms: body.complaint,

        // Vitals
        temperature: body.temperature,
        bloodPressure: body.bloodPressure,
        weight: body.weight,
        height: body.height,
        heartRate: body.heartRate ? parseInt(body.heartRate) : undefined,
        respiratoryRate: body.respiratoryRate
          ? parseInt(body.respiratoryRate)
          : undefined,

        // History
        historyPastDiseases: body.historyPastDiseases,
        historyFamilyDiseases: body.historyFamilyDiseases,
        historyAllergies: body.historyAllergies,
        historyCurrentMedications: body.historyCurrentMedications,
        historyHabits: body.historyHabits,

        // New Fields
        anamnesis: body.anamnesis,
        physicalExam: body.physicalExam,
        labResults: body.labResults,
        imagingResults: body.imagingResults,
        diagnosisCode: body.diagnosisCode,
        treatmentPlan: body.treatmentPlan,
        progressNotes: body.progressNotes,
        followUpInstructions: body.followUpInstructions,
        prescribedMedicines: body.prescribedMedicinesText,

        examiner: user.userId,
      });

      const examId = Number(res[0].insertId);

      // 3. Process Consumed Medicines (Stock Deduction)
      if (
        Array.isArray(body.consumedMedicines) &&
        body.consumedMedicines.length > 0
      ) {
        for (const med of body.consumedMedicines) {
          // Only process if it has an ID (from stock) and quantity > 0
          if (med.id && med.quantity > 0) {
            // Check stock first
            const existingMed = await db.query.medicines.findFirst({
              where: eq(medicines.id, med.id),
            });

            if (existingMed) {
              // Deduct stock (allow negative? No, but let's just deduct. Maybe warning if 0?)
              // Ideally we check before deducting.
              // Atomic Stock Deduction
              await db
                .update(medicines)
                .set({
                  stock: sql`${medicines.stock} - ${med.quantity}`,
                })
                .where(eq(medicines.id, med.id));

              await db.insert(medicineUsages).values({
                medicineId: med.id,
                examinationId: examId,
                quantity: med.quantity,
                usedBy: user.userId,
                notes: "Resep Dokter",
              });
            }
          }
        }
      }

      // 4. Inpatient Admission (if requested)
      if (body.isInpatient && body.roomId) {
        // Create inpatient record
        const admRes = await db.insert(inpatients).values({
          clinicPatientId: patient.id,
          patientType: body.patientType,
          patientId: body.refId,
          roomId: body.roomId,
          bedNumber: body.bedNumber,
          admissionDate: body.date ? new Date(body.date) : new Date(),
          admissionTime: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "admitted",
          diagnosis: body.diagnosis,
          treatment: body.treatment,
          createdBy: user.userId,
          attendingDoctor:
            (user as any).name || (user as any).username || "Admin", // Approximate
        });

        const inpatientId = Number(admRes[0].insertId);

        // Link back to exam
        await db
          .update(healthExaminations)
          .set({
            isInpatient: true,
            inpatientId: inpatientId,
          })
          .where(eq(healthExaminations.id, examId));
      }

      // 5. Create sick leave in attendance & mutabaah if requested
      if (body.createSickLeave && body.patientType === "student" && body.refId) {
        const startDate = body.sickStartDate ? new Date(body.sickStartDate) : (body.date ? new Date(body.date) : new Date());
        const endDate = body.sickEndDate ? new Date(body.sickEndDate) : startDate;
        
        // Find halaqah mentor for mutabaah sync
        const mentorMember = await db.query.halaqahMembers.findFirst({
          where: eq(halaqahMembers.studentId, body.refId),
          with: {
            halaqah: {
              with: {
                mentors: true
              }
            }
          }
        });
        const teacherId = mentorMember?.halaqah?.mentors?.find((m: any) => m.role === 'lead')?.teacherId 
          || mentorMember?.halaqah?.mentors?.[0]?.teacherId;

        // Loop through dates
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateString = d.toISOString().split("T")[0] as string; // YYYY-MM-DD
          
          // --- 5.1 Attendance ---
          const existingAtt = await db.query.studentAttendances.findFirst({
            where: and(
              eq(studentAttendances.studentId, body.refId),
              sql`DATE(${studentAttendances.date}) = ${dateString}`
            )
          });

          if (existingAtt) {
            await db.update(studentAttendances)
              .set({ status: 'sick', notes: 'Sakit (Otomatis dari Klinik)' })
              .where(eq(studentAttendances.id, existingAtt.id));
          } else {
            await db.insert(studentAttendances).values({
              studentId: body.refId,
              date: new Date(dateString), 
              status: 'sick',
              notes: 'Sakit (Otomatis dari Klinik)',
              createdBy: user.userId
            });
          }

          // --- 5.2 Mutabaah (Tahfidz Deposits) ---
          if (teacherId) {
            const existingDep = await db.query.tahfidzDeposits.findFirst({
              where: and(
                eq(tahfidzDeposits.studentId, body.refId),
                sql`DATE(${tahfidzDeposits.depositDate}) = ${dateString}`
              )
            });

            if (existingDep) {
              await db.update(tahfidzDeposits)
                .set({ type: 'sakit', notes: 'Sakit (Otomatis dari Klinik)', teacherId })
                .where(eq(tahfidzDeposits.id, existingDep.id));
            } else {
              await db.insert(tahfidzDeposits).values({
                studentId: body.refId,
                teacherId,
                depositDate: new Date(dateString),
                type: 'sakit',
                notes: 'Sakit (Otomatis dari Klinik)'
              });
            }
          }
        }
      }

      return c.json({ success: true, message: "Saved" });
    } catch (e) {
      console.error(e);
      return c.json({ success: false, message: "Failed" }, 500);
    }
  },
);

clinicRoute.put(
  "/examinations/:id",
  requirePermission("/apps/clinic/dashboard"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const user = c.get("user");

      await db.transaction(async (tx) => {
        // 1. Get or Create Patient (If changed)
        const patient = await getOrCreateClinicPatient({
          clinicPatientId: body.clinicPatientId,
          type: body.patientType,
          refId: body.refId,
          name: body.name,
          gender: body.gender,
          phone: body.phone,
          bloodType: body.bloodType,
        });

        // 2. Update Exam Data
        await tx
          .update(healthExaminations)
          .set({
            clinicPatientId: patient.id,
            patientType: body.patientType,
            patientId: body.refId,
            examinationDate: body.date ? new Date(body.date) : new Date(),

            diagnosis: body.diagnosis,
            treatment: body.treatment,
            symptoms: body.complaint,

            // Vitals
            temperature: body.temperature,
            bloodPressure: body.bloodPressure,
            weight: body.weight,
            height: body.height,
            heartRate: body.heartRate ? parseInt(body.heartRate) : undefined,
            respiratoryRate: body.respiratoryRate
              ? parseInt(body.respiratoryRate)
              : undefined,

            // History
            historyPastDiseases: body.historyPastDiseases,
            historyFamilyDiseases: body.historyFamilyDiseases,
            historyAllergies: body.historyAllergies,
            historyCurrentMedications: body.historyCurrentMedications,
            historyHabits: body.historyHabits,

            // New Fields
            anamnesis: body.anamnesis,
            physicalExam: body.physicalExam,
            labResults: body.labResults,
            imagingResults: body.imagingResults,
            diagnosisCode: body.diagnosisCode,
            treatmentPlan: body.treatmentPlan,
            progressNotes: body.progressNotes,
            followUpInstructions: body.followUpInstructions,
            prescribedMedicines: body.prescribedMedicinesText,
            examiner: user.userId,
          })
          .where(eq(healthExaminations.id, id));

        // 3. Medicine Reconciliation
        // Only if consumedMedicines is provided (meaning we want to sync/reset)
        // If it's undefined/null, we might skip, but usually frontend sends the full state.
        if (Array.isArray(body.consumedMedicines)) {
          // A. Refund Old Usages
          const oldUsages = await tx.query.medicineUsages.findMany({
            where: eq(medicineUsages.examinationId, id),
          });

          for (const usage of oldUsages) {
            // Restore stock
            await tx
              .update(medicines)
              .set({
                stock: sql`${medicines.stock} + ${usage.quantity}`,
              })
              .where(eq(medicines.id, usage.medicineId));
          }

          // B. Delete Old Usages
          await tx
            .delete(medicineUsages)
            .where(eq(medicineUsages.examinationId, id));

          // C. Process New Usages
          for (const med of body.consumedMedicines) {
            if (med.id && med.quantity > 0) {
              // Deduct stock (atomic)
              await tx
                .update(medicines)
                .set({
                  stock: sql`${medicines.stock} - ${med.quantity}`,
                })
                .where(eq(medicines.id, med.id));

              // Insert new usage
              await tx.insert(medicineUsages).values({
                medicineId: med.id,
                examinationId: id,
                quantity: med.quantity,
                usedBy: user.userId,
                notes: "Updated Examination",
              });
            }
          }
        }

        // 4. Create sick leave in attendance & mutabaah if requested
        if (body.createSickLeave && body.patientType === "student" && body.refId) {
          const startDate = body.sickStartDate ? new Date(body.sickStartDate) : (body.date ? new Date(body.date) : new Date());
          const endDate = body.sickEndDate ? new Date(body.sickEndDate) : startDate;
          
          // Find halaqah mentor for mutabaah sync
          const mentorMember = await tx.query.halaqahMembers.findFirst({
            where: eq(halaqahMembers.studentId, body.refId),
            with: {
              halaqah: {
                with: {
                  mentors: true
                }
              }
            }
          });
          const teacherId = mentorMember?.halaqah?.mentors?.find((m: any) => m.role === 'lead')?.teacherId 
            || mentorMember?.halaqah?.mentors?.[0]?.teacherId;

          // Loop through dates
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split("T")[0] as string; // YYYY-MM-DD
            
            // --- 4.1 Attendance ---
            const existingAtt = await tx.query.studentAttendances.findFirst({
              where: and(
                eq(studentAttendances.studentId, body.refId),
                sql`DATE(${studentAttendances.date}) = ${dateString}`
              )
            });

            if (existingAtt) {
              await tx.update(studentAttendances)
                .set({ status: 'sick', notes: 'Sakit (Otomatis dari Klinik - Edit)' })
                .where(eq(studentAttendances.id, existingAtt.id));
            } else {
              await tx.insert(studentAttendances).values({
                studentId: body.refId,
                date: new Date(dateString), 
                status: 'sick',
                notes: 'Sakit (Otomatis dari Klinik - Edit)',
                createdBy: user.userId
              });
            }

            // --- 4.2 Mutabaah (Tahfidz Deposits) ---
            if (teacherId) {
              const existingDep = await tx.query.tahfidzDeposits.findFirst({
                where: and(
                  eq(tahfidzDeposits.studentId, body.refId),
                  sql`DATE(${tahfidzDeposits.depositDate}) = ${dateString}`
                )
              });

              if (existingDep) {
                await tx.update(tahfidzDeposits)
                  .set({ type: 'sakit', notes: 'Sakit (Otomatis dari Klinik - Edit)', teacherId })
                  .where(eq(tahfidzDeposits.id, existingDep.id));
              } else {
                await tx.insert(tahfidzDeposits).values({
                  studentId: body.refId,
                  teacherId,
                  depositDate: new Date(dateString),
                  type: 'sakit',
                  notes: 'Sakit (Otomatis dari Klinik - Edit)'
                });
              }
            }
          }
        }
      });

      return c.json({ success: true, message: "Updated" });
    } catch (e) {
      console.error(e);
      return c.json({ success: false, message: "Failed to update" }, 500);
    }
  },
);

clinicRoute.delete(
  "/examinations/:id",
  requirePermission("/apps/clinic/dashboard"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      await db.transaction(async (tx) => {
        // 1. Get old usages to restore stock
        const usages = await tx.query.medicineUsages.findMany({
          where: eq(medicineUsages.examinationId, id),
        });

        for (const usage of usages) {
          await tx
            .update(medicines)
            .set({
              stock: sql`${medicines.stock} + ${usage.quantity}`,
            })
            .where(eq(medicines.id, usage.medicineId));
        }

        // 2. Delete Medicine Usages
        await tx
          .delete(medicineUsages)
          .where(eq(medicineUsages.examinationId, id));

        // 3. Delete Examination
        await tx.delete(healthExaminations).where(eq(healthExaminations.id, id));
      });

      return c.json({ success: true, message: "Deleted" });
    } catch (e) {
      console.error(e);
      return c.json({ success: false, message: "Failed to delete" }, 500);
    }
  },
);

// ============ REPORTS ============

clinicRoute.get("/reports/summary", async (c) => {
  try {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const patientTypeFilter = c.req.query("patientType"); // student | teacher | external (optional)
    const genderFilter = c.req.query("gender"); // L | P (optional)

    // Defaults: Last 30 days
    let start = new Date();
    start.setDate(start.getDate() - 30);
    let end = new Date();

    if (startDate) start = new Date(startDate);
    if (endDate) end = new Date(endDate);

    // Build optional filter conditions (L2 + L5)
    const filterConditions = [
      sql`${healthExaminations.examinationDate} >= ${start}`,
      sql`${healthExaminations.examinationDate} <= ${end}`,
    ];
    if (patientTypeFilter && ["student", "teacher", "external"].includes(patientTypeFilter)) {
      filterConditions.push(sql`${healthExaminations.patientType} = ${patientTypeFilter}`);
    }
    if (genderFilter && ["L", "P"].includes(genderFilter)) {
      // Join with clinicPatients to filter by gender; LEFT JOIN to keep rows where clinicPatientId is null
      filterConditions.push(
        sql`(${healthExaminations.clinicPatientId} IS NULL OR ${clinicPatients.gender} = ${genderFilter})`,
      );
    }

    // 1. Visits per Date (Line Chart)
    const visitsQuery = db
      .select({
        date: sql<string>`DATE(${healthExaminations.examinationDate})`,
        count: sql<number>`count(*)`,
      })
      .from(healthExaminations);
    if (genderFilter && ["L", "P"].includes(genderFilter)) {
      visitsQuery.leftJoin(clinicPatients, eq(clinicPatients.id, healthExaminations.clinicPatientId));
    }
    const visits = await visitsQuery
      .where(and(...filterConditions))
      .groupBy(sql`DATE(${healthExaminations.examinationDate})`)
      .orderBy(sql`DATE(${healthExaminations.examinationDate})`);

    // 2. Top Diagnoses (Bar Chart)
    const diseasesQuery = db
      .select({
        name: healthExaminations.diagnosis,
        count: sql<number>`count(*)`,
      })
      .from(healthExaminations);
    if (genderFilter && ["L", "P"].includes(genderFilter)) {
      diseasesQuery.leftJoin(clinicPatients, eq(clinicPatients.id, healthExaminations.clinicPatientId));
    }
    const diseases = await diseasesQuery
      .where(
        and(
          ...filterConditions,
          sql`${healthExaminations.diagnosis} IS NOT NULL`,
          sql`${healthExaminations.diagnosis} != ''`,
        ),
      )
      .groupBy(healthExaminations.diagnosis)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // 3. Patient Type Distribution (Pie Chart)
    const patientTypesQuery = db
      .select({
        type: healthExaminations.patientType,
        count: sql<number>`count(*)`,
      })
      .from(healthExaminations);
    if (genderFilter && ["L", "P"].includes(genderFilter)) {
      patientTypesQuery.leftJoin(clinicPatients, eq(clinicPatients.id, healthExaminations.clinicPatientId));
    }
    const patientTypes = await patientTypesQuery
      .where(and(...filterConditions))
      .groupBy(healthExaminations.patientType);

    return c.json({
      success: true,
      data: {
        visits,
        diseases,
        patientTypes,
        filters: {
          startDate: start,
          endDate: end,
          patientType: patientTypeFilter || null,
          gender: genderFilter || null,
        },
      },
    });
  } catch (e) {
    console.error("Report Error", e);
    return c.json(
      { success: false, message: "Failed to generate report" },
      500,
    );
  }
});

// ============ PHARMACIES CRUD & PHARMACISTS penugasan ============

// Get all pharmacies
clinicRoute.get("/pharmacies", async (c) => {
  try {
    const allPharmacies = await db.query.pharmacies.findMany();

    // Get pharmacists count for each pharmacy
    const pharmaciesWithCount = await Promise.all(
      allPharmacies.map(async (ph) => {
        const pharmacistsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(pharmacyPharmacists)
          .where(eq(pharmacyPharmacists.pharmacyId, ph.id));
        return {
          ...ph,
          memberCount: Number(pharmacistsCount[0]?.count || 0),
        };
      })
    );

    return c.json({
      success: true,
      data: pharmaciesWithCount,
    });
  } catch (error) {
    console.error("Get pharmacies error:", error);
    return c.json({ success: false, message: "Gagal memuat data apotik" }, 500);
  }
});

// Get pharmacy by ID
clinicRoute.get("/pharmacies/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.id, id),
    });

    if (!pharmacy) {
      return c.json({ success: false, message: "Apotik tidak ditemukan" }, 404);
    }

    return c.json({
      success: true,
      data: pharmacy,
    });
  } catch (error) {
    console.error("Get pharmacy error:", error);
    return c.json({ success: false, message: "Gagal memuat detail apotik" }, 500);
  }
});

// Create pharmacy
clinicRoute.post(
  "/pharmacies",
  requirePermission("/apps/clinic/pharmacies"),
  zValidator("json", createPharmacySchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await db.insert(pharmacies).values(data);
      const newPharmacy = await db.query.pharmacies.findFirst({
        where: eq(pharmacies.id, Number(result[0].insertId)),
      });
      return c.json({
        success: true,
        message: "Apotik berhasil ditambahkan",
        data: newPharmacy,
      });
    } catch (error) {
      console.error("Create pharmacy error:", error);
      return c.json({ success: false, message: "Gagal menambahkan apotik" }, 500);
    }
  }
);

// Update pharmacy
clinicRoute.put(
  "/pharmacies/:id",
  requirePermission("/apps/clinic/pharmacies"),
  zValidator("json", updatePharmacySchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.pharmacies.findFirst({
        where: eq(pharmacies.id, id),
      });

      if (!existing) {
        return c.json({ success: false, message: "Apotik tidak ditemukan" }, 404);
      }

      await db.update(pharmacies).set(data).where(eq(pharmacies.id, id));
      const updated = await db.query.pharmacies.findFirst({
        where: eq(pharmacies.id, id),
      });

      return c.json({
        success: true,
        message: "Apotik berhasil diperbarui",
        data: updated,
      });
    } catch (error) {
      console.error("Update pharmacy error:", error);
      return c.json({ success: false, message: "Gagal memperbarui apotik" }, 500);
    }
  }
);

// Delete pharmacy
clinicRoute.delete(
  "/pharmacies/:id",
  requirePermission("/apps/clinic/pharmacies"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      // Check if there are medicines assigned to this pharmacy
      const hasMedicines = await db.query.medicines.findFirst({
        where: eq(medicines.pharmacyId, id),
      });

      if (hasMedicines) {
        return c.json(
          {
            success: false,
            message: "Apotik tidak dapat dihapus karena masih menyimpan obat. Pindahkan obat terlebih dahulu.",
          },
          400
        );
      }

      // Delete pharmacists assignment first
      await db.delete(pharmacyPharmacists).where(eq(pharmacyPharmacists.pharmacyId, id));

      // Delete pharmacy
      await db.delete(pharmacies).where(eq(pharmacies.id, id));

      return c.json({
        success: true,
        message: "Apotik berhasil dihapus",
      });
    } catch (error) {
      console.error("Delete pharmacy error:", error);
      return c.json({ success: false, message: "Gagal menghapus apotik" }, 500);
    }
  }
);

// Get pharmacists of a pharmacy
clinicRoute.get("/pharmacies/:id/pharmacists", async (c) => {
  try {
    const pharmacyId = parseInt(c.req.param("id"));
    const pharmacistRecords = await db.query.pharmacyPharmacists.findMany({
      where: eq(pharmacyPharmacists.pharmacyId, pharmacyId),
    });

    const pharmacistsList = await Promise.all(
      pharmacistRecords.map(async (m) => {
        const teacher = await db.query.teachers.findFirst({
          where: eq(teachers.id, m.teacherId),
        });
        return {
          id: m.id,
          pharmacyId: m.pharmacyId,
          teacherId: m.teacherId,
          teacher,
        };
      })
    );

    return c.json({
      success: true,
      data: pharmacistsList,
    });
  } catch (error) {
    console.error("Get pharmacists error:", error);
    return c.json({ success: false, message: "Gagal memuat data apoteker" }, 500);
  }
});

// Add pharmacist to pharmacy
clinicRoute.post(
  "/pharmacies/:id/pharmacists",
  requirePermission("/apps/clinic/pharmacies"),
  async (c) => {
    try {
      const pharmacyId = parseInt(c.req.param("id"));
      const body = await c.req.json();
      const teacherId = body.teacherId;

      if (!teacherId) {
        return c.json({ success: false, message: "ID Guru wajib diisi" }, 400);
      }

      // Check if already pharmacist in THIS pharmacy
      const existing = await db.query.pharmacyPharmacists.findFirst({
        where: and(
          eq(pharmacyPharmacists.pharmacyId, pharmacyId),
          eq(pharmacyPharmacists.teacherId, teacherId)
        ),
      });

      if (existing) {
        return c.json({ success: false, message: "Guru tersebut sudah terdaftar sebagai apoteker di apotik ini" }, 400);
      }

      await db.insert(pharmacyPharmacists).values({
        pharmacyId,
        teacherId,
      });

      return c.json({
        success: true,
        message: "Apoteker berhasil ditambahkan",
      });
    } catch (error) {
      console.error("Add pharmacist error:", error);
      return c.json({ success: false, message: "Gagal menambahkan apoteker" }, 500);
    }
  }
);

// Remove pharmacist from pharmacy
clinicRoute.delete(
  "/pharmacies/:id/pharmacists/:teacherId",
  requirePermission("/apps/clinic/pharmacies"),
  async (c) => {
    try {
      const pharmacyId = parseInt(c.req.param("id"));
      const teacherId = parseInt(c.req.param("teacherId"));

      const record = await db.query.pharmacyPharmacists.findFirst({
        where: and(
          eq(pharmacyPharmacists.pharmacyId, pharmacyId),
          eq(pharmacyPharmacists.teacherId, teacherId)
        ),
      });

      if (!record) {
        return c.json({ success: false, message: "Penugasan apoteker tidak ditemukan" }, 404);
      }

      await db.delete(pharmacyPharmacists).where(eq(pharmacyPharmacists.id, record.id));

      return c.json({
        success: true,
        message: "Apoteker berhasil dihapus",
      });
    } catch (error) {
      console.error("Remove pharmacist error:", error);
      return c.json({ success: false, message: "Gagal menghapus apoteker" }, 500);
    }
  }
);

export default clinicRoute;
