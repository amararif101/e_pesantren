import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, asc, desc, like, or, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  structuralUnits,
  structuralRoles,
  teacherStructuralAssignments,
} from "../db/schema/structural-roles";
import { teachers } from "../db/schema/teachers";
import { divisions } from "../db/schema/divisions";
import { authMiddleware, requireRole } from "../middleware/auth";
import {
  createStructuralUnitSchema,
  updateStructuralUnitSchema,
  createStructuralRoleSchema,
  updateStructuralRoleSchema,
  createStructuralAssignmentSchema,
  updateStructuralAssignmentSchema,
  syncTeacherStructuralAssignmentsSchema,
} from "../validators/structural";
import {
  getUserStructuralContext,
  ensureStructuralAndBackdateTables,
} from "../utils/tahfidz-permission";

const structuralRoute = new Hono();

// Semua endpoint memerlukan autentikasi & memastikan tabel struktural tersedia
structuralRoute.use("*", authMiddleware, async (c, next) => {
  await ensureStructuralAndBackdateTables();
  await next();
});

// ============================================================================
// 0. CURRENT USER CONTEXT & DEFAULT SEEDER (SESUAI SHEET GURU BARU/KELUAR)
// ============================================================================

/**
 * GET /api/structural/me
 * Mengambil konteks jabatan struktural milik user yang sedang login.
 * Memudahkan Frontend mengecek otoritas (misal: isTahfidzHead, canBackdateTahfidz)
 */
structuralRoute.get("/me", async (c) => {
  try {
    const user = c.get("user");
    const context = await getUserStructuralContext(user.userId, user.role);
    return c.json({
      success: true,
      data: context,
    });
  } catch (error: any) {
    console.error("Get structural me error:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Gagal mengambil profil struktural",
      },
      500
    );
  }
});

/**
 * POST /api/structural/seed-defaults
 * Mengisi master data `structural_units` dan `structural_roles` sesuai struktur
 * organisasi Pondok Pesantren Minhajul Haq (PPMH) pada sheet GURU BARU/KELUAR.
 * Aman dijalankan berulang kali (idempotent berdasarkan `code`).
 */
structuralRoute.post(
  "/seed-defaults",
  requireRole("admin"),
  async (c) => {
    try {
      // 1. Seed Structural Units secara berurutan (Induk -> Divisi/Madrasah -> Bagian -> PJ)
      const defaultUnits: Array<{
        code: string;
        name: string;
        type: "institution" | "division" | "madrasah" | "department" | "unit";
        parentCode?: string;
        description: string;
      }> = [
        // Level 1: Induk Pesantren
        {
          code: "PPMH",
          name: "Pondok Pesantren Minhajul Haq (PPMH)",
          type: "institution",
          description: "Lembaga Induk Pondok Pesantren Minhajul Haq",
        },
        // Level 2: Divisi Struktural Pesantren
        {
          code: "DIV_MS",
          name: "MS (Madrasah Salafiyah / MTs-MA)",
          type: "division",
          parentCode: "PPMH",
          description: "Divisi Pendidikan Tingkat Menengah (MTs & MA)",
        },
        {
          code: "DIV_MT",
          name: "MT (Ma'had Tahfizh)",
          type: "division",
          parentCode: "PPMH",
          description: "Divisi Ma'had Tahfizh",
        },
        {
          code: "DIV_MT_CIRACAS",
          name: "MT Ciracas",
          type: "division",
          parentCode: "PPMH",
          description: "Divisi Ma'had Tahfizh Cabang Ciracas",
        },
        {
          code: "DIV_MI",
          name: "MI (Madrasah Ibtidaiyah)",
          type: "division",
          parentCode: "PPMH",
          description: "Divisi Madrasah Ibtidaiyah",
        },
        {
          code: "DIV_STAIMH",
          name: "STAIMH",
          type: "division",
          parentCode: "PPMH",
          description: "Sekolah Tinggi Agama Islam Minhajul Haq",
        },
        {
          code: "DIV_KEUANGAN",
          name: "Keuangan",
          type: "division",
          parentCode: "PPMH",
          description: "Divisi Keuangan Pesantren",
        },
        // Level 2b: Homabase Madrasah Formal
        {
          code: "MADRASAH_MA",
          name: "Madrasah Aliyah (MA)",
          type: "madrasah",
          parentCode: "DIV_MS",
          description: "Homabase Madrasah Aliyah (MA)",
        },
        {
          code: "MADRASAH_MTS",
          name: "Madrasah Tsanawiyah (MTs)",
          type: "madrasah",
          parentCode: "DIV_MS",
          description: "Homabase Madrasah Tsanawiyah (MTs)",
        },
        // Level 3: Bagian di bawah MS
        {
          code: "BAG_PENDULUM",
          name: "Bagian Pendulum (Pendidikan & Kurikulum)",
          type: "department",
          parentCode: "DIV_MS",
          description: "Bagian Pendidikan dan Kurikulum di bawah MS",
        },
        {
          code: "BAG_PENGASUHAN",
          name: "Bagian Pengasuhan",
          type: "department",
          parentCode: "DIV_MS",
          description: "Bagian Pengasuhan & Kesantrian di bawah MS",
        },
        // Level 4: PJ / Unit di bawah Bagian Pendulum
        {
          code: "UNIT_PJ_TAHFIZH",
          name: "PJ Tahfizh",
          type: "unit",
          parentCode: "BAG_PENDULUM",
          description: "Unit Penanggung Jawab Tahfizh Al-Qur'an",
        },
        {
          code: "UNIT_PJ_EKSKUL",
          name: "PJ Ekskul",
          type: "unit",
          parentCode: "BAG_PENDULUM",
          description: "Unit Penanggung Jawab Ekstrakurikuler",
        },
        // Level 4: PJ / Unit di bawah Bagian Pengasuhan
        {
          code: "UNIT_PJ_BAHASA",
          name: "PJ Bahasa",
          type: "unit",
          parentCode: "BAG_PENGASUHAN",
          description: "Unit Penanggung Jawab Bahasa",
        },
        {
          code: "UNIT_PJ_KEASRAMAAN",
          name: "PJ Keasramaan",
          type: "unit",
          parentCode: "BAG_PENGASUHAN",
          description: "Unit Penanggung Jawab Keasramaan",
        },
        {
          code: "UNIT_PJ_NASYATH",
          name: "PJ Nasyath",
          type: "unit",
          parentCode: "BAG_PENGASUHAN",
          description: "Unit Penanggung Jawab Kegiatan Santri (Nasyath)",
        },
        {
          code: "UNIT_PJ_MENTAL_RP",
          name: "PJ Mental dan R&P",
          type: "unit",
          parentCode: "BAG_PENGASUHAN",
          description: "Unit Penanggung Jawab Pembinaan Mental, Reward & Punishment",
        },
        {
          code: "UNIT_SEKSIE_ASRAMA",
          name: "Seksie Asrama",
          type: "unit",
          parentCode: "BAG_PENGASUHAN",
          description: "Seksi Pembinaan Asrama / Sakan",
        },
      ];

      const unitIdByCode = new Map<string, number>();
      const existingUnits = await db.select().from(structuralUnits);
      existingUnits.forEach((u) => unitIdByCode.set(u.code, u.id));

      let unitsCreated = 0;
      for (const item of defaultUnits) {
        if (unitIdByCode.has(item.code)) continue;
        const parentId = item.parentCode
          ? unitIdByCode.get(item.parentCode) ?? null
          : null;
        const res = await db.insert(structuralUnits).values({
          code: item.code,
          name: item.name,
          type: item.type,
          parentId,
          description: item.description,
          isActive: true,
        });
        unitIdByCode.set(item.code, Number(res[0].insertId));
        unitsCreated++;
      }

      // 2. Seed Structural Roles sesuai sheet GURU BARU/KELUAR
      const defaultRoles: Array<{
        code: string;
        name: string;
        scope: "pesantren" | "unit" | "madrasah" | "functional";
        rankLevel: number;
        defaultUnitCode?: string;
        canBackdateTahfidz: boolean;
        description: string;
      }> = [
        // Scope: Pesantren & Pimpinan Divisi
        {
          code: "MUDIR_PPMH",
          name: "Mudir PPMH",
          scope: "pesantren",
          rankLevel: 1,
          defaultUnitCode: "PPMH",
          canBackdateTahfidz: true,
          description: "Pimpinan Umum Pondok Pesantren Minhajul Haq",
        },
        {
          code: "SEKRETARIS_PESANTREN",
          name: "Sekretaris Pesantren",
          scope: "pesantren",
          rankLevel: 1,
          defaultUnitCode: "PPMH",
          canBackdateTahfidz: false,
          description: "Sekretaris Umum Pondok Pesantren",
        },
        {
          code: "KEPALA_MS",
          name: "Kepala MS",
          scope: "pesantren",
          rankLevel: 2,
          defaultUnitCode: "DIV_MS",
          canBackdateTahfidz: true,
          description: "Kepala Divisi Madrasah Salafiyah (MS)",
        },
        {
          code: "SEKRETARIS_MS",
          name: "Sekretaris",
          scope: "pesantren",
          rankLevel: 2,
          defaultUnitCode: "DIV_MS",
          canBackdateTahfidz: false,
          description: "Sekretaris Divisi / Bagian",
        },
        {
          code: "BENDAHARA_MS",
          name: "Bendahara MS",
          scope: "pesantren",
          rankLevel: 2,
          defaultUnitCode: "DIV_MS",
          canBackdateTahfidz: false,
          description: "Bendahara Divisi MS",
        },
        // Scope: Unit / Bagian / PJ
        {
          code: "KABAG_PENDULUM",
          name: "Kepala Bagian Pendidikan dan Kurikulum (Pendulum)",
          scope: "unit",
          rankLevel: 2,
          defaultUnitCode: "BAG_PENDULUM",
          canBackdateTahfidz: true,
          description:
            "Kepala Bagian Pendidikan dan Kurikulum (membawahi PJ Tahfizh & Ekskul, memiliki akses langsung input & approve backdate tahfizh)",
        },
        {
          code: "KABAG_PENGASUHAN",
          name: "Kepala Bagian Pengasuhan",
          scope: "unit",
          rankLevel: 2,
          defaultUnitCode: "BAG_PENGASUHAN",
          canBackdateTahfidz: false,
          description: "Kepala Bagian Pengasuhan & Kesantrian",
        },
        {
          code: "KEPALA_PJ_TAHFIZH",
          name: "Kepala PJ Tahfizh",
          scope: "unit",
          rankLevel: 3,
          defaultUnitCode: "UNIT_PJ_TAHFIZH",
          canBackdateTahfidz: true,
          description:
            "Kepala Penanggung Jawab Tahfizh (memiliki otoritas konfirmasi & input backdate setoran tahfizh)",
        },
        {
          code: "PJ_TAHFIZH",
          name: "Anggota PJ Tahfizh",
          scope: "unit",
          rankLevel: 4,
          defaultUnitCode: "UNIT_PJ_TAHFIZH",
          canBackdateTahfidz: true,
          description: "Tim Penanggung Jawab Tahfizh di bawah Bagian Pendulum",
        },
        {
          code: "KEPALA_PJ_BAHASA",
          name: "Kepala PJ Bahasa",
          scope: "unit",
          rankLevel: 3,
          defaultUnitCode: "UNIT_PJ_BAHASA",
          canBackdateTahfidz: false,
          description: "Kepala Penanggung Jawab Bahasa di bawah Bagian Pengasuhan",
        },
        {
          code: "PJ_BAHASA",
          name: "Anggota PJ Bahasa",
          scope: "unit",
          rankLevel: 4,
          defaultUnitCode: "UNIT_PJ_BAHASA",
          canBackdateTahfidz: false,
          description: "Tim Penanggung Jawab Bahasa",
        },
        {
          code: "PJ_KEASRAMAAN",
          name: "PJ Keasramaan",
          scope: "unit",
          rankLevel: 3,
          defaultUnitCode: "UNIT_PJ_KEASRAMAAN",
          canBackdateTahfidz: false,
          description: "Penanggung Jawab Keasramaan",
        },
        {
          code: "PJ_MENTAL_RP",
          name: "PJ Mental dan R&P",
          scope: "unit",
          rankLevel: 3,
          defaultUnitCode: "UNIT_PJ_MENTAL_RP",
          canBackdateTahfidz: false,
          description: "Penanggung Jawab Mental, Reward & Punishment",
        },
        {
          code: "PJ_NASYATH",
          name: "PJ Nasyath",
          scope: "unit",
          rankLevel: 4,
          defaultUnitCode: "UNIT_PJ_NASYATH",
          canBackdateTahfidz: false,
          description: "Penanggung Jawab Nasyath (Kegiatan Santri)",
        },
        {
          code: "PJ_EKSKUL",
          name: "PJ Ekskul",
          scope: "unit",
          rankLevel: 4,
          defaultUnitCode: "UNIT_PJ_EKSKUL",
          canBackdateTahfidz: false,
          description: "Penanggung Jawab Ekstrakurikuler",
        },
        {
          code: "SEKSIE_ASRAMA",
          name: "Seksie Asrama",
          scope: "unit",
          rankLevel: 4,
          defaultUnitCode: "UNIT_SEKSIE_ASRAMA",
          canBackdateTahfidz: false,
          description: "Pengurus / Seksi Asrama",
        },
        {
          code: "ANGGOTA_PENDULUM",
          name: "Staf Bagian Pendulum",
          scope: "unit",
          rankLevel: 4,
          defaultUnitCode: "BAG_PENDULUM",
          canBackdateTahfidz: false,
          description: "Anggota Bagian Pendidikan & Kurikulum (Pendulum)",
        },
        {
          code: "ANGGOTA_PENGASUHAN",
          name: "Staf Bagian Pengasuhan",
          scope: "unit",
          rankLevel: 4,
          defaultUnitCode: "BAG_PENGASUHAN",
          canBackdateTahfidz: false,
          description: "Anggota Bagian Pengasuhan",
        },
        // Scope: Struktural Madrasah (Formal)
        {
          code: "KAMAD_MA",
          name: "Kamad MA",
          scope: "madrasah",
          rankLevel: 2,
          defaultUnitCode: "MADRASAH_MA",
          canBackdateTahfidz: false,
          description: "Kepala Madrasah Aliyah (MA)",
        },
        {
          code: "KAMAD_MTS",
          name: "Kamad MTs",
          scope: "madrasah",
          rankLevel: 2,
          defaultUnitCode: "MADRASAH_MTS",
          canBackdateTahfidz: false,
          description: "Kepala Madrasah Tsanawiyah (MTs)",
        },
        {
          code: "TU_MA",
          name: "TU MA",
          scope: "madrasah",
          rankLevel: 4,
          defaultUnitCode: "MADRASAH_MA",
          canBackdateTahfidz: false,
          description: "Tata Usaha Madrasah Aliyah",
        },
        {
          code: "TU_MTS",
          name: "TUMTs",
          scope: "madrasah",
          rankLevel: 4,
          defaultUnitCode: "MADRASAH_MTS",
          canBackdateTahfidz: false,
          description: "Tata Usaha Madrasah Tsanawiyah",
        },
        {
          code: "OP_MA",
          name: "OPMA",
          scope: "madrasah",
          rankLevel: 4,
          defaultUnitCode: "MADRASAH_MA",
          canBackdateTahfidz: false,
          description: "Operator Madrasah Aliyah",
        },
        {
          code: "OP_MTS",
          name: "OPMTs",
          scope: "madrasah",
          rankLevel: 4,
          defaultUnitCode: "MADRASAH_MTS",
          canBackdateTahfidz: false,
          description: "Operator Madrasah Tsanawiyah",
        },
        {
          code: "WALI_KELAS",
          name: "Wali Kelas",
          scope: "madrasah",
          rankLevel: 4,
          canBackdateTahfidz: false,
          description: "Wali Kelas Rombel Madrasah (MTs / MA)",
        },
        // Scope: Functional / Tendik
        {
          code: "GURU_DINIYAH",
          name: "Guru Diniyah",
          scope: "functional",
          rankLevel: 5,
          canBackdateTahfidz: false,
          description: "Tenaga Pendidik Mata Pelajaran Diniyah",
        },
        {
          code: "GURU_UMUM",
          name: "Guru Umum",
          scope: "functional",
          rankLevel: 5,
          canBackdateTahfidz: false,
          description: "Tenaga Pendidik Mata Pelajaran Umum",
        },
        {
          code: "GURU_BK",
          name: "Guru BK",
          scope: "functional",
          rankLevel: 5,
          canBackdateTahfidz: false,
          description: "Guru Bimbingan Konseling (Ikhwan / Akhwat)",
        },
        {
          code: "PJ_PERPUSTAKAAN",
          name: "PJ Perpustakaan",
          scope: "functional",
          rankLevel: 4,
          canBackdateTahfidz: false,
          description: "Penanggung Jawab Perpustakaan",
        },
      ];

      const existingRoles = await db.select().from(structuralRoles);
      const existingRoleCodes = new Set(existingRoles.map((r) => r.code));

      let rolesCreated = 0;
      for (const roleItem of defaultRoles) {
        if (existingRoleCodes.has(roleItem.code)) continue;
        const defaultUnitId = roleItem.defaultUnitCode
          ? unitIdByCode.get(roleItem.defaultUnitCode) ?? null
          : null;
        await db.insert(structuralRoles).values({
          code: roleItem.code,
          name: roleItem.name,
          scope: roleItem.scope,
          rankLevel: roleItem.rankLevel,
          defaultUnitId,
          canBackdateTahfidz: roleItem.canBackdateTahfidz,
          description: roleItem.description,
          isActive: true,
        });
        rolesCreated++;
      }

      return c.json({
        success: true,
        message: `Data default struktur pesantren berhasil diinisialisasi (${unitsCreated} unit baru, ${rolesCreated} role baru)`,
        data: {
          unitsCreated,
          rolesCreated,
        },
      });
    } catch (error: any) {
      console.error("Seed structural defaults error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal menginisialisasi data struktural",
        },
        500
      );
    }
  }
);

// ============================================================================
// 1. STRUCTURAL UNITS CRUD (/api/structural/units)
// ============================================================================

/**
 * GET /api/structural/units
 * Query params:
 * - type: institution | division | madrasah | department | unit
 * - parentId: number
 * - isActive: true | false
 * - tree: true (mengembalikan struktur pohon hierarki bertingkat)
 */
structuralRoute.get("/units", async (c) => {
  try {
    const typeFilter = c.req.query("type");
    const parentIdFilter = c.req.query("parentId");
    const isActiveFilter = c.req.query("isActive");
    const asTree = c.req.query("tree") === "true";

    const conditions: any[] = [];
    if (typeFilter) {
      conditions.push(eq(structuralUnits.type, typeFilter as any));
    }
    if (parentIdFilter !== undefined && parentIdFilter !== "") {
      if (parentIdFilter === "null") {
        conditions.push(sql`${structuralUnits.parentId} IS NULL`);
      } else {
        conditions.push(eq(structuralUnits.parentId, Number(parentIdFilter)));
      }
    }
    if (isActiveFilter !== undefined && isActiveFilter !== "") {
      conditions.push(eq(structuralUnits.isActive, isActiveFilter === "true"));
    }

    const units = await db
      .select()
      .from(structuralUnits)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(structuralUnits.id));

    // Hitung jumlah anggota aktif per unit
    const counts = await db
      .select({
        unitId: teacherStructuralAssignments.structuralUnitId,
        count: sql<number>`count(distinct ${teacherStructuralAssignments.teacherId})`,
      })
      .from(teacherStructuralAssignments)
      .where(eq(teacherStructuralAssignments.status, "active"))
      .groupBy(teacherStructuralAssignments.structuralUnitId);

    const countByUnitId = new Map<number, number>();
    counts.forEach((row) => {
      if (row.unitId != null) {
        countByUnitId.set(row.unitId, Number(row.count || 0));
      }
    });

    const unitNameById = new Map(units.map((u) => [u.id, u.name]));

    const enrichedUnits = units.map((u) => ({
      ...u,
      parentName: u.parentId ? unitNameById.get(u.parentId) || null : null,
      memberCount: countByUnitId.get(u.id) || 0,
    }));

    if (asTree) {
      const map = new Map<number, any>();
      const roots: any[] = [];

      enrichedUnits.forEach((u) => {
        map.set(u.id, { ...u, children: [] });
      });

      enrichedUnits.forEach((u) => {
        const node = map.get(u.id);
        if (u.parentId && map.has(u.parentId)) {
          map.get(u.parentId).children.push(node);
        } else {
          roots.push(node);
        }
      });

      return c.json({
        success: true,
        data: roots,
      });
    }

    return c.json({
      success: true,
      data: enrichedUnits,
    });
  } catch (error: any) {
    console.error("Get structural units error:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Gagal mengambil daftar unit struktural",
      },
      500
    );
  }
});

/**
 * GET /api/structural/units/:id
 * Mengambil detail 1 unit struktural beserta sub-unit (children), role default, dan daftar anggota.
 */
structuralRoute.get("/units/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const unit = await db.query.structuralUnits.findFirst({
      where: eq(structuralUnits.id, id),
    });

    if (!unit) {
      return c.json(
        { success: false, message: "Unit struktural tidak ditemukan" },
        404
      );
    }

    const parent = unit.parentId
      ? await db.query.structuralUnits.findFirst({
          where: eq(structuralUnits.id, unit.parentId),
        })
      : null;

    const children = await db.query.structuralUnits.findMany({
      where: eq(structuralUnits.parentId, id),
    });

    const defaultRoles = await db.query.structuralRoles.findMany({
      where: eq(structuralRoles.defaultUnitId, id),
      orderBy: [asc(structuralRoles.rankLevel)],
    });

    const members = await db
      .select({
        assignmentId: teacherStructuralAssignments.id,
        teacherId: teachers.id,
        nip: teachers.nip,
        fullName: teachers.fullName,
        gender: teachers.gender,
        payrollDivision: teachers.department,
        roleId: structuralRoles.id,
        roleCode: structuralRoles.code,
        roleName: structuralRoles.name,
        rankLevel: structuralRoles.rankLevel,
        assignmentDetail: teacherStructuralAssignments.assignmentDetail,
        academicYear: teacherStructuralAssignments.academicYear,
        isPrimary: teacherStructuralAssignments.isPrimary,
        status: teacherStructuralAssignments.status,
      })
      .from(teacherStructuralAssignments)
      .innerJoin(
        teachers,
        eq(teacherStructuralAssignments.teacherId, teachers.id)
      )
      .innerJoin(
        structuralRoles,
        eq(
          teacherStructuralAssignments.structuralRoleId,
          structuralRoles.id
        )
      )
      .where(eq(teacherStructuralAssignments.structuralUnitId, id))
      .orderBy(asc(structuralRoles.rankLevel), asc(teachers.fullName));

    return c.json({
      success: true,
      data: {
        ...unit,
        parent,
        children,
        defaultRoles,
        members,
      },
    });
  } catch (error: any) {
    console.error("Get structural unit by id error:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Gagal mengambil detail unit struktural",
      },
      500
    );
  }
});

/**
 * POST /api/structural/units
 */
structuralRoute.post(
  "/units",
  requireRole("admin"),
  zValidator("json", createStructuralUnitSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      const existingCode = await db.query.structuralUnits.findFirst({
        where: eq(structuralUnits.code, data.code),
      });
      if (existingCode) {
        return c.json(
          {
            success: false,
            message: `Kode unit "${data.code}" sudah digunakan`,
          },
          400
        );
      }

      const result = await db.insert(structuralUnits).values({
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId ?? null,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      });

      const created = await db.query.structuralUnits.findFirst({
        where: eq(structuralUnits.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Unit struktural berhasil ditambahkan",
        data: created,
      });
    } catch (error: any) {
      console.error("Create structural unit error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal membuat unit struktural",
        },
        500
      );
    }
  }
);

/**
 * PUT /api/structural/units/:id
 */
structuralRoute.put(
  "/units/:id",
  requireRole("admin"),
  zValidator("json", updateStructuralUnitSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.structuralUnits.findFirst({
        where: eq(structuralUnits.id, id),
      });
      if (!existing) {
        return c.json(
          { success: false, message: "Unit struktural tidak ditemukan" },
          404
        );
      }

      if (data.parentId === id) {
        return c.json(
          {
            success: false,
            message: "Unit tidak boleh menjadi induk bagi dirinya sendiri",
          },
          400
        );
      }

      await db
        .update(structuralUnits)
        .set(data)
        .where(eq(structuralUnits.id, id));

      const updated = await db.query.structuralUnits.findFirst({
        where: eq(structuralUnits.id, id),
      });

      return c.json({
        success: true,
        message: "Unit struktural berhasil diperbarui",
        data: updated,
      });
    } catch (error: any) {
      console.error("Update structural unit error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal memperbarui unit struktural",
        },
        500
      );
    }
  }
);

/**
 * DELETE /api/structural/units/:id
 */
structuralRoute.delete(
  "/units/:id",
  requireRole("admin"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      const existing = await db.query.structuralUnits.findFirst({
        where: eq(structuralUnits.id, id),
      });
      if (!existing) {
        return c.json(
          { success: false, message: "Unit struktural tidak ditemukan" },
          404
        );
      }

      // Lepaskan parentId pada sub-unit jika ada
      await db
        .update(structuralUnits)
        .set({ parentId: existing.parentId ?? null })
        .where(eq(structuralUnits.parentId, id));

      await db.delete(structuralUnits).where(eq(structuralUnits.id, id));

      return c.json({
        success: true,
        message: "Unit struktural berhasil dihapus",
      });
    } catch (error: any) {
      console.error("Delete structural unit error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal menghapus unit struktural",
        },
        500
      );
    }
  }
);

// ============================================================================
// 2. STRUCTURAL ROLES CRUD (/api/structural/roles)
// ============================================================================

/**
 * GET /api/structural/roles
 * Query params:
 * - scope: pesantren | unit | madrasah | functional
 * - defaultUnitId: number
 * - canBackdateTahfidz: true | false
 * - isActive: true | false
 */
structuralRoute.get("/roles", async (c) => {
  try {
    const scopeFilter = c.req.query("scope");
    const defaultUnitIdFilter = c.req.query("defaultUnitId");
    const canBackdateFilter = c.req.query("canBackdateTahfidz");
    const isActiveFilter = c.req.query("isActive");

    const conditions: any[] = [];
    if (scopeFilter) {
      conditions.push(eq(structuralRoles.scope, scopeFilter as any));
    }
    if (defaultUnitIdFilter) {
      conditions.push(
        eq(structuralRoles.defaultUnitId, Number(defaultUnitIdFilter))
      );
    }
    if (canBackdateFilter !== undefined && canBackdateFilter !== "") {
      conditions.push(
        eq(structuralRoles.canBackdateTahfidz, canBackdateFilter === "true")
      );
    }
    if (isActiveFilter !== undefined && isActiveFilter !== "") {
      conditions.push(eq(structuralRoles.isActive, isActiveFilter === "true"));
    }

    const roles = await db
      .select({
        id: structuralRoles.id,
        code: structuralRoles.code,
        name: structuralRoles.name,
        scope: structuralRoles.scope,
        rankLevel: structuralRoles.rankLevel,
        defaultUnitId: structuralRoles.defaultUnitId,
        defaultUnitCode: structuralUnits.code,
        defaultUnitName: structuralUnits.name,
        canBackdateTahfidz: structuralRoles.canBackdateTahfidz,
        description: structuralRoles.description,
        isActive: structuralRoles.isActive,
        createdAt: structuralRoles.createdAt,
        updatedAt: structuralRoles.updatedAt,
      })
      .from(structuralRoles)
      .leftJoin(
        structuralUnits,
        eq(structuralRoles.defaultUnitId, structuralUnits.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(structuralRoles.rankLevel), asc(structuralRoles.name));

    // Hitung jumlah pemegang jabatan aktif
    const holderCounts = await db
      .select({
        roleId: teacherStructuralAssignments.structuralRoleId,
        count: sql<number>`count(*)`,
      })
      .from(teacherStructuralAssignments)
      .where(eq(teacherStructuralAssignments.status, "active"))
      .groupBy(teacherStructuralAssignments.structuralRoleId);

    const countByRoleId = new Map(
      holderCounts.map((r) => [r.roleId, Number(r.count || 0)])
    );

    const data = roles.map((r) => ({
      ...r,
      holderCount: countByRoleId.get(r.id) || 0,
    }));

    return c.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Get structural roles error:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Gagal mengambil daftar jabatan struktural",
      },
      500
    );
  }
});

/**
 * GET /api/structural/roles/:id
 * Mengambil detail jabatan struktural beserta daftar guru yang memegangnya.
 */
structuralRoute.get("/roles/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const role = await db.query.structuralRoles.findFirst({
      where: eq(structuralRoles.id, id),
      with: {
        defaultUnit: true,
      },
    });

    if (!role) {
      return c.json(
        { success: false, message: "Jabatan struktural tidak ditemukan" },
        404
      );
    }

    const holders = await db
      .select({
        assignmentId: teacherStructuralAssignments.id,
        teacherId: teachers.id,
        nip: teachers.nip,
        fullName: teachers.fullName,
        gender: teachers.gender,
        payrollDivision: teachers.department,
        unitId: structuralUnits.id,
        unitCode: structuralUnits.code,
        unitName: structuralUnits.name,
        assignmentDetail: teacherStructuralAssignments.assignmentDetail,
        academicYear: teacherStructuralAssignments.academicYear,
        isPrimary: teacherStructuralAssignments.isPrimary,
        status: teacherStructuralAssignments.status,
      })
      .from(teacherStructuralAssignments)
      .innerJoin(
        teachers,
        eq(teacherStructuralAssignments.teacherId, teachers.id)
      )
      .leftJoin(
        structuralUnits,
        eq(
          teacherStructuralAssignments.structuralUnitId,
          structuralUnits.id
        )
      )
      .where(eq(teacherStructuralAssignments.structuralRoleId, id))
      .orderBy(asc(teachers.fullName));

    const assignmentsFormatted = holders.map((h) => ({
      id: h.assignmentId,
      assignmentId: h.assignmentId,
      teacherId: h.teacherId,
      teacherName: h.fullName,
      teacherNip: h.nip,
      unitName: h.unitName,
      status: h.status,
      isPrimary: h.isPrimary,
      academicYear: h.academicYear,
      assignmentDetail: h.assignmentDetail,
    }));

    return c.json({
      success: true,
      data: {
        ...role,
        holders,
        assignments: assignmentsFormatted,
      },
    });
  } catch (error: any) {
    console.error("Get structural role by id error:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Gagal mengambil detail jabatan struktural",
      },
      500
    );
  }
});

/**
 * POST /api/structural/roles
 */
structuralRoute.post(
  "/roles",
  requireRole("admin"),
  zValidator("json", createStructuralRoleSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      const existing = await db.query.structuralRoles.findFirst({
        where: eq(structuralRoles.code, data.code),
      });
      if (existing) {
        return c.json(
          {
            success: false,
            message: `Kode jabatan "${data.code}" sudah digunakan`,
          },
          400
        );
      }

      const result = await db.insert(structuralRoles).values({
        code: data.code,
        name: data.name,
        scope: data.scope,
        rankLevel: data.rankLevel,
        defaultUnitId: data.defaultUnitId ?? null,
        canBackdateTahfidz: data.canBackdateTahfidz ?? false,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      });

      const created = await db.query.structuralRoles.findFirst({
        where: eq(structuralRoles.id, Number(result[0].insertId)),
      });

      return c.json({
        success: true,
        message: "Jabatan struktural berhasil ditambahkan",
        data: created,
      });
    } catch (error: any) {
      console.error("Create structural role error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal membuat jabatan struktural",
        },
        500
      );
    }
  }
);

/**
 * PUT /api/structural/roles/:id
 */
structuralRoute.put(
  "/roles/:id",
  requireRole("admin"),
  zValidator("json", updateStructuralRoleSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.structuralRoles.findFirst({
        where: eq(structuralRoles.id, id),
      });
      if (!existing) {
        return c.json(
          { success: false, message: "Jabatan struktural tidak ditemukan" },
          404
        );
      }

      await db
        .update(structuralRoles)
        .set(data)
        .where(eq(structuralRoles.id, id));

      const updated = await db.query.structuralRoles.findFirst({
        where: eq(structuralRoles.id, id),
      });

      return c.json({
        success: true,
        message: "Jabatan struktural berhasil diperbarui",
        data: updated,
      });
    } catch (error: any) {
      console.error("Update structural role error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal memperbarui jabatan struktural",
        },
        500
      );
    }
  }
);

/**
 * DELETE /api/structural/roles/:id
 */
structuralRoute.delete(
  "/roles/:id",
  requireRole("admin"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      const existing = await db.query.structuralRoles.findFirst({
        where: eq(structuralRoles.id, id),
      });
      if (!existing) {
        return c.json(
          { success: false, message: "Jabatan struktural tidak ditemukan" },
          404
        );
      }

      await db.delete(structuralRoles).where(eq(structuralRoles.id, id));

      return c.json({
        success: true,
        message: "Jabatan struktural berhasil dihapus",
      });
    } catch (error: any) {
      console.error("Delete structural role error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal menghapus jabatan struktural",
        },
        500
      );
    }
  }
);

// ============================================================================
// 3. TEACHER STRUCTURAL ASSIGNMENTS (/api/structural/assignments & /teachers/:id)
// ============================================================================

/**
 * GET /api/structural/assignments
 * Query params:
 * - teacherId: number
 * - roleId: number
 * - unitId: number
 * - scope: pesantren | unit | madrasah | functional
 * - status: active | inactive
 * - search: string (cari nama guru / NIP / detail penugasan)
 */
structuralRoute.get("/assignments", async (c) => {
  try {
    const teacherId = c.req.query("teacherId");
    const roleId = c.req.query("roleId");
    const unitId = c.req.query("unitId");
    const scope = c.req.query("scope");
    const status = c.req.query("status");
    const search = c.req.query("search");

    const conditions: any[] = [];
    if (teacherId) {
      conditions.push(
        eq(teacherStructuralAssignments.teacherId, Number(teacherId))
      );
    }
    if (roleId) {
      conditions.push(
        eq(teacherStructuralAssignments.structuralRoleId, Number(roleId))
      );
    }
    if (unitId) {
      conditions.push(
        eq(teacherStructuralAssignments.structuralUnitId, Number(unitId))
      );
    }
    if (scope) {
      conditions.push(eq(structuralRoles.scope, scope as any));
    }
    if (status) {
      conditions.push(
        eq(teacherStructuralAssignments.status, status as any)
      );
    }
    if (search) {
      conditions.push(
        or(
          like(teachers.fullName, `%${search}%`),
          like(teachers.nip, `%${search}%`),
          like(structuralRoles.name, `%${search}%`),
          like(structuralUnits.name, `%${search}%`),
          like(teacherStructuralAssignments.assignmentDetail, `%${search}%`)
        )
      );
    }

    const rows = await db
      .select({
        id: teacherStructuralAssignments.id,
        teacherId: teachers.id,
        teacherNip: teachers.nip,
        teacherName: teachers.fullName,
        teacherGender: teachers.gender,
        payrollDivisionId: teachers.divisionId,
        payrollDivisionName: teachers.department,
        structuralRoleId: structuralRoles.id,
        roleCode: structuralRoles.code,
        roleName: structuralRoles.name,
        scope: structuralRoles.scope,
        rankLevel: structuralRoles.rankLevel,
        canBackdateTahfidz: structuralRoles.canBackdateTahfidz,
        structuralUnitId: structuralUnits.id,
        unitCode: structuralUnits.code,
        unitName: structuralUnits.name,
        unitType: structuralUnits.type,
        assignmentDetail: teacherStructuralAssignments.assignmentDetail,
        academicYear: teacherStructuralAssignments.academicYear,
        isPrimary: teacherStructuralAssignments.isPrimary,
        status: teacherStructuralAssignments.status,
        startDate: teacherStructuralAssignments.startDate,
        endDate: teacherStructuralAssignments.endDate,
        notes: teacherStructuralAssignments.notes,
        createdAt: teacherStructuralAssignments.createdAt,
        updatedAt: teacherStructuralAssignments.updatedAt,
      })
      .from(teacherStructuralAssignments)
      .innerJoin(
        teachers,
        eq(teacherStructuralAssignments.teacherId, teachers.id)
      )
      .innerJoin(
        structuralRoles,
        eq(
          teacherStructuralAssignments.structuralRoleId,
          structuralRoles.id
        )
      )
      .leftJoin(
        structuralUnits,
        eq(
          teacherStructuralAssignments.structuralUnitId,
          structuralUnits.id
        )
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(structuralRoles.rankLevel), asc(teachers.fullName));

    return c.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("Get structural assignments error:", error);
    return c.json(
      {
        success: false,
        message: error.message || "Gagal mengambil data penugasan struktural",
      },
      500
    );
  }
});

/**
 * GET /api/structural/teachers/:teacherId
 * Mengambil profil lengkap 1 guru:
 * - Membedakan secara eksplisit antara `payrollDivision` (Divisi Gaji di menu Guru > Divisi)
 *   dan `structuralAssignments` (Jabatan & Unit Struktural di Pesantren/Madrasah).
 */
structuralRoute.get("/teachers/:teacherId", async (c) => {
  try {
    const teacherId = parseInt(c.req.param("teacherId"));

    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.id, teacherId),
      with: {
        salaryGrade: true,
        positionAllowance: true,
      },
    });

    if (!teacher) {
      return c.json(
        { success: false, message: "Data guru tidak ditemukan" },
        404
      );
    }

    const payrollDivision = teacher.divisionId
      ? await db.query.divisions.findFirst({
          where: eq(divisions.id, teacher.divisionId),
        })
      : null;

    const assignments = await db
      .select({
        id: teacherStructuralAssignments.id,
        structuralRoleId: structuralRoles.id,
        roleCode: structuralRoles.code,
        roleName: structuralRoles.name,
        scope: structuralRoles.scope,
        rankLevel: structuralRoles.rankLevel,
        canBackdateTahfidz: structuralRoles.canBackdateTahfidz,
        structuralUnitId: structuralUnits.id,
        unitCode: structuralUnits.code,
        unitName: structuralUnits.name,
        unitType: structuralUnits.type,
        assignmentDetail: teacherStructuralAssignments.assignmentDetail,
        academicYear: teacherStructuralAssignments.academicYear,
        isPrimary: teacherStructuralAssignments.isPrimary,
        status: teacherStructuralAssignments.status,
        startDate: teacherStructuralAssignments.startDate,
        endDate: teacherStructuralAssignments.endDate,
        notes: teacherStructuralAssignments.notes,
      })
      .from(teacherStructuralAssignments)
      .innerJoin(
        structuralRoles,
        eq(
          teacherStructuralAssignments.structuralRoleId,
          structuralRoles.id
        )
      )
      .leftJoin(
        structuralUnits,
        eq(
          teacherStructuralAssignments.structuralUnitId,
          structuralUnits.id
        )
      )
      .where(eq(teacherStructuralAssignments.teacherId, teacherId))
      .orderBy(asc(structuralRoles.rankLevel));

    // Kelompokkan per scope untuk memudahkan konsumsi UI Frontend
    const groupedByScope = {
      pesantren: assignments.filter((a) => a.scope === "pesantren"),
      unit: assignments.filter((a) => a.scope === "unit"),
      madrasah: assignments.filter((a) => a.scope === "madrasah"),
      functional: assignments.filter((a) => a.scope === "functional"),
    };

    return c.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          nip: teacher.nip,
          fullName: teacher.fullName,
          gender: teacher.gender,
          employeeType: teacher.employeeType,
          status: teacher.status,
        },
        payroll: {
          divisionId: teacher.divisionId,
          divisionName: payrollDivision?.name || teacher.department || null,
          salaryGrade: teacher.salaryGrade || null,
          positionAllowance: teacher.positionAllowance || null,
          teachingHours: teacher.teachingHours || 0,
        },
        structuralAssignments: assignments,
        groupedByScope,
      },
    });
  } catch (error: any) {
    console.error("Get teacher structural profile error:", error);
    return c.json(
      {
        success: false,
        message:
          error.message || "Gagal mengambil profil struktural guru",
      },
      500
    );
  }
});

/**
 * POST /api/structural/assignments
 * Menambahkan jabatan struktural ke seorang guru (mendukung multi-role, tidak
 * menghapus divisi gaji maupun jabatan struktural lain yang sudah dimiliki guru).
 */
structuralRoute.post(
  "/assignments",
  requireRole("admin"),
  zValidator("json", createStructuralAssignmentSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");

      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, data.teacherId),
      });
      if (!teacher) {
        return c.json(
          { success: false, message: "Guru tidak ditemukan" },
          404
        );
      }

      const role = await db.query.structuralRoles.findFirst({
        where: eq(structuralRoles.id, data.structuralRoleId),
      });
      if (!role) {
        return c.json(
          { success: false, message: "Jabatan struktural tidak ditemukan" },
          404
        );
      }

      // Gunakan defaultUnitId dari role apabila structuralUnitId tidak dikirim
      const targetUnitId =
        data.structuralUnitId !== undefined
          ? data.structuralUnitId
          : role.defaultUnitId ?? null;

      // Cek apakah penugasan guru untuk role dan unit ini sudah ada (idempotent check)
      const existingAssignment =
        await db.query.teacherStructuralAssignments.findFirst({
          where: and(
            eq(teacherStructuralAssignments.teacherId, data.teacherId),
            eq(teacherStructuralAssignments.structuralRoleId, data.structuralRoleId),
            targetUnitId !== null
              ? eq(teacherStructuralAssignments.structuralUnitId, targetUnitId)
              : sql`${teacherStructuralAssignments.structuralUnitId} IS NULL`
          ),
          with: {
            structuralRole: true,
            structuralUnit: true,
          },
        });

      if (existingAssignment) {
        if (existingAssignment.status !== (data.status ?? "active")) {
          await db
            .update(teacherStructuralAssignments)
            .set({ status: data.status ?? "active", updatedAt: new Date() })
            .where(eq(teacherStructuralAssignments.id, existingAssignment.id));
        }
        return c.json({
          success: true,
          message: "Guru sudah terdaftar pada jabatan struktural ini",
          data: existingAssignment,
        });
      }

      if (data.isPrimary) {
        await db
          .update(teacherStructuralAssignments)
          .set({ isPrimary: false })
          .where(eq(teacherStructuralAssignments.teacherId, data.teacherId));
      }

      const result = await db.insert(teacherStructuralAssignments).values({
        teacherId: data.teacherId,
        structuralRoleId: data.structuralRoleId,
        structuralUnitId: targetUnitId,
        assignmentDetail: data.assignmentDetail ?? null,
        academicYear: data.academicYear ?? null,
        isPrimary: data.isPrimary ?? false,
        status: data.status ?? "active",
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes ?? null,
      });

      const created = await db.query.teacherStructuralAssignments.findFirst({
        where: eq(
          teacherStructuralAssignments.id,
          Number(result[0].insertId)
        ),
        with: {
          structuralRole: true,
          structuralUnit: true,
        },
      });

      return c.json({
        success: true,
        message: "Penugasan struktural berhasil ditambahkan",
        data: created,
      });
    } catch (error: any) {
      console.error("Create structural assignment error:", error);
      const errMsg = `${error.message || ""} ${error.cause?.message || ""} ${error.cause?.sqlMessage || ""}`;
      const errCode = error.code || error.cause?.code;
      if (errCode === "ER_DUP_ENTRY" || errMsg.includes("Duplicate entry")) {
        return c.json(
          {
            success: false,
            message:
              "Guru sudah memiliki jabatan struktural tersebut pada unit yang sama",
          },
          400
        );
      }
      return c.json(
        {
          success: false,
          message: error.message || "Gagal menambahkan penugasan struktural",
        },
        500
      );
    }
  }
);

/**
 * PUT /api/structural/assignments/:id
 */
structuralRoute.put(
  "/assignments/:id",
  requireRole("admin"),
  zValidator("json", updateStructuralAssignmentSchema),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = c.req.valid("json");

      const existing = await db.query.teacherStructuralAssignments.findFirst({
        where: eq(teacherStructuralAssignments.id, id),
      });
      if (!existing) {
        return c.json(
          {
            success: false,
            message: "Data penugasan struktural tidak ditemukan",
          },
          404
        );
      }

      if (data.isPrimary) {
        await db
          .update(teacherStructuralAssignments)
          .set({ isPrimary: false })
          .where(
            eq(teacherStructuralAssignments.teacherId, existing.teacherId)
          );
      }

      await db
        .update(teacherStructuralAssignments)
        .set({
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        })
        .where(eq(teacherStructuralAssignments.id, id));

      const updated = await db.query.teacherStructuralAssignments.findFirst({
        where: eq(teacherStructuralAssignments.id, id),
        with: {
          structuralRole: true,
          structuralUnit: true,
        },
      });

      return c.json({
        success: true,
        message: "Penugasan struktural berhasil diperbarui",
        data: updated,
      });
    } catch (error: any) {
      console.error("Update structural assignment error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal memperbarui penugasan struktural",
        },
        500
      );
    }
  }
);

/**
 * DELETE /api/structural/assignments/:id
 */
structuralRoute.delete(
  "/assignments/:id",
  requireRole("admin"),
  async (c) => {
    try {
      const id = parseInt(c.req.param("id"));

      const existing = await db.query.teacherStructuralAssignments.findFirst({
        where: eq(teacherStructuralAssignments.id, id),
      });
      if (!existing) {
        return c.json(
          {
            success: false,
            message: "Data penugasan struktural tidak ditemukan",
          },
          404
        );
      }

      await db
        .delete(teacherStructuralAssignments)
        .where(eq(teacherStructuralAssignments.id, id));

      return c.json({
        success: true,
        message: "Penugasan struktural berhasil dihapus",
      });
    } catch (error: any) {
      console.error("Delete structural assignment error:", error);
      return c.json(
        {
          success: false,
          message: error.message || "Gagal menghapus penugasan struktural",
        },
        500
      );
    }
  }
);

/**
 * PUT /api/structural/teachers/:teacherId/assignments
 * Bulk sync seluruh jabatan struktural seorang guru sekaligus (memudahkan
 * penyimpanan multi-select di form Edit Guru pada Frontend tanpa menyentuh
 * `divisionId` / `teacher_divisions` milik gaji).
 */
structuralRoute.put(
  "/teachers/:teacherId/assignments",
  requireRole("admin"),
  zValidator("json", syncTeacherStructuralAssignmentsSchema),
  async (c) => {
    try {
      const teacherId = parseInt(c.req.param("teacherId"));
      const { assignments } = c.req.valid("json");

      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, teacherId),
      });
      if (!teacher) {
        return c.json(
          { success: false, message: "Data guru tidak ditemukan" },
          404
        );
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(teacherStructuralAssignments)
          .where(eq(teacherStructuralAssignments.teacherId, teacherId));

        if (assignments.length > 0) {
          const roleIds = [
            ...new Set(assignments.map((a) => a.structuralRoleId)),
          ];
          const rolesList = await tx
            .select()
            .from(structuralRoles)
            .where(inArray(structuralRoles.id, roleIds));
          const roleMap = new Map(rolesList.map((r) => [r.id, r]));

          const rowsToInsert = assignments.map((a, idx) => {
            const roleInfo = roleMap.get(a.structuralRoleId);
            return {
              teacherId,
              structuralRoleId: a.structuralRoleId,
              structuralUnitId:
                a.structuralUnitId !== undefined
                  ? a.structuralUnitId
                  : roleInfo?.defaultUnitId ?? null,
              assignmentDetail: a.assignmentDetail ?? null,
              academicYear: a.academicYear ?? null,
              isPrimary: a.isPrimary ?? idx === 0,
              status: a.status ?? "active",
              startDate: a.startDate ? new Date(a.startDate) : undefined,
              endDate: a.endDate ? new Date(a.endDate) : undefined,
              notes: a.notes ?? null,
            };
          });

          await tx.insert(teacherStructuralAssignments).values(rowsToInsert);
        }
      });

      return c.json({
        success: true,
        message: "Penugasan struktural guru berhasil disinkronkan",
      });
    } catch (error: any) {
      console.error("Sync teacher structural assignments error:", error);
      return c.json(
        {
          success: false,
          message:
            error.message || "Gagal menyinkronkan penugasan struktural guru",
        },
        500
      );
    }
  }
);

export default structuralRoute;
