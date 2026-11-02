import { db } from "../db";
import {
  teachers,
  teacherDivisions,
  divisions,
  structuralUnits,
  structuralRoles,
  teacherStructuralAssignments,
  tahfidzBackdateRequests,
} from "../db/schema";
import { eq, and, sql, or, desc } from "drizzle-orm";

let tablesEnsured = false;

/**
 * Memastikan tabel `structural_units`, `structural_roles`,
 * `teacher_structural_assignments`, dan `tahfidz_backdate_requests`
 * otomatis tersedia di database live meskipun migrasi manual belum dijalankan.
 */
export async function ensureStructuralAndBackdateTables(): Promise<void> {
  if (tablesEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`structural_units\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`code\` varchar(50) NOT NULL,
        \`name\` varchar(150) NOT NULL,
        \`type\` enum('institution','division','madrasah','department','unit') NOT NULL DEFAULT 'unit',
        \`parent_id\` int,
        \`description\` text,
        \`is_active\` boolean NOT NULL DEFAULT true,
        \`created_at\` timestamp DEFAULT (now()),
        \`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`structural_units_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`structural_units_code_unique\` UNIQUE(\`code\`)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`structural_roles\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`code\` varchar(50) NOT NULL,
        \`name\` varchar(150) NOT NULL,
        \`scope\` enum('pesantren','unit','madrasah','functional') NOT NULL DEFAULT 'unit',
        \`rank_level\` int NOT NULL DEFAULT 5,
        \`default_unit_id\` int,
        \`can_backdate_tahfidz\` boolean NOT NULL DEFAULT false,
        \`description\` text,
        \`is_active\` boolean NOT NULL DEFAULT true,
        \`created_at\` timestamp DEFAULT (now()),
        \`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`structural_roles_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`structural_roles_code_unique\` UNIQUE(\`code\`)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`teacher_structural_assignments\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`teacher_id\` int NOT NULL,
        \`structural_role_id\` int NOT NULL,
        \`structural_unit_id\` int,
        \`assignment_detail\` varchar(255),
        \`academic_year\` varchar(20),
        \`is_primary\` boolean NOT NULL DEFAULT false,
        \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
        \`start_date\` date,
        \`end_date\` date,
        \`notes\` text,
        \`created_at\` timestamp DEFAULT (now()),
        \`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`teacher_structural_assignments_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`uq_teacher_structural_role_unit\` UNIQUE(\`teacher_id\`,\`structural_role_id\`,\`structural_unit_id\`)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`tahfidz_backdate_requests\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`teacher_id\` int NOT NULL,
        \`halaqah_id\` int,
        \`requested_date\` varchar(10) NOT NULL,
        \`reason\` text NOT NULL,
        \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        \`reviewed_by_teacher_id\` int,
        \`reviewed_by_user_id\` int,
        \`review_notes\` text,
        \`reviewed_at\` timestamp,
        \`created_at\` timestamp DEFAULT (now()),
        \`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`tahfidz_backdate_requests_id\` PRIMARY KEY(\`id\`)
      );
    `);

    tablesEnsured = true;
  } catch (e) {
    console.warn("ensureStructuralAndBackdateTables warning:", e);
  }
}

export interface UserStructuralContext {
  teacherId: number | null;
  assignments: Array<{
    assignmentId: number;
    roleId: number;
    roleCode: string;
    roleName: string;
    scope: string;
    rankLevel: number;
    canBackdateTahfidz: boolean;
    unitId: number | null;
    unitCode: string | null;
    unitName: string | null;
    unitType: string | null;
    assignmentDetail: string | null;
    isPrimary: boolean;
  }>;
  isTahfidzHead: boolean;
  isTahfidzTeam: boolean;
  canBackdateTahfidz: boolean;
}

/**
 * Mengambil konteks jabatan struktural seorang user (terpisah dari Divisi Gaji).
 */
export async function getUserStructuralContext(
  userId: number,
  userRole: string
): Promise<UserStructuralContext> {
  await ensureStructuralAndBackdateTables();
  if (userRole === "admin") {
    return {
      teacherId: null,
      assignments: [],
      isTahfidzHead: true,
      isTahfidzTeam: true,
      canBackdateTahfidz: true,
    };
  }

  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.userId, userId),
  });

  if (!teacher) {
    return {
      teacherId: null,
      assignments: [],
      isTahfidzHead: false,
      isTahfidzTeam: false,
      canBackdateTahfidz: false,
    };
  }

  try {
    const rows = await db
      .select({
        assignmentId: teacherStructuralAssignments.id,
        roleId: structuralRoles.id,
        roleCode: structuralRoles.code,
        roleName: structuralRoles.name,
        scope: structuralRoles.scope,
        rankLevel: structuralRoles.rankLevel,
        canBackdateTahfidz: structuralRoles.canBackdateTahfidz,
        unitId: structuralUnits.id,
        unitCode: structuralUnits.code,
        unitName: structuralUnits.name,
        unitType: structuralUnits.type,
        assignmentDetail: teacherStructuralAssignments.assignmentDetail,
        isPrimary: teacherStructuralAssignments.isPrimary,
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
      .where(
        and(
          eq(teacherStructuralAssignments.teacherId, teacher.id),
          eq(teacherStructuralAssignments.status, "active"),
          eq(structuralRoles.isActive, true)
        )
      );

    const isTahfidzHead = rows.some(
      (r) =>
        r.roleCode === "KEPALA_PJ_TAHFIZH" ||
        (r.rankLevel <= 3 &&
          (r.roleName.toLowerCase().includes("tahfizh") ||
            r.roleName.toLowerCase().includes("tahfidz") ||
            (r.unitName || "").toLowerCase().includes("tahfizh") ||
            (r.unitName || "").toLowerCase().includes("tahfidz")))
    );

    const isTahfidzTeam = rows.some(
      (r) =>
        r.canBackdateTahfidz ||
        r.roleCode === "KEPALA_PJ_TAHFIZH" ||
        r.roleCode === "PJ_TAHFIZH" ||
        r.roleName.toLowerCase().includes("tahfizh") ||
        r.roleName.toLowerCase().includes("tahfidz") ||
        (r.unitName || "").toLowerCase().includes("tahfizh") ||
        (r.unitName || "").toLowerCase().includes("tahfidz")
    );

    const canBackdate = rows.some(
      (r) =>
        r.canBackdateTahfidz ||
        isTahfidzHead ||
        r.roleCode === "KABAG_PENDULUM" ||
        r.roleCode === "KEPALA_BAG_PENDULUM" ||
        r.roleCode === "PJ_TAHFIZH" ||
        r.roleCode === "MUDIR_PPMH" ||
        r.roleCode === "KEPALA_MS" ||
        (r.rankLevel <= 3 &&
          (r.roleName.toLowerCase().includes("pendidikan dan kurikulum") ||
            r.roleName.toLowerCase().includes("pendulum")))
    );

    return {
      teacherId: teacher.id,
      assignments: rows,
      isTahfidzHead,
      isTahfidzTeam,
      canBackdateTahfidz: canBackdate,
    };
  } catch {
    // Fallback jika tabel structural belum dimigrasi
    return {
      teacherId: teacher.id,
      assignments: [],
      isTahfidzHead: false,
      isTahfidzTeam: false,
      canBackdateTahfidz: false,
    };
  }
}

/**
 * Mengecek apakah user memiliki hak akses langsung (sebagai Kepala PJ Tahfizh,
 * PJ Tahfizh, Kepala MS, Mudir, atau Admin) untuk menginput/mengapprove
 * setoran tahfizh tanggal mundur.
 */
export async function hasDirectBackdateRole(
  userId: number,
  role: string
): Promise<boolean> {
  await ensureStructuralAndBackdateTables();
  if (role === "admin") return true;

  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.userId, userId),
  });
  if (!teacher) return false;

  try {
    const [totalStructuralRecords] = await db
      .select({ count: sql<number>`count(*)` })
      .from(teacherStructuralAssignments);

    if (Number(totalStructuralRecords?.count || 0) > 0) {
      const ctx = await getUserStructuralContext(userId, role);
      return ctx.canBackdateTahfidz;
    }
  } catch {
    // Jika tabel teacher_structural_assignments belum ada di DB, lanjut ke fallback legacy
  }

  // Legacy fallback (hanya jika tabel penugasan struktural masih kosong)
  const membership = await db
    .select({ id: teacherDivisions.id })
    .from(teacherDivisions)
    .innerJoin(divisions, eq(teacherDivisions.divisionId, divisions.id))
    .where(
      and(
        eq(teacherDivisions.teacherId, teacher.id),
        or(
          sql`LOWER(${divisions.name}) LIKE '%tahfidz%'`,
          sql`LOWER(${divisions.name}) LIKE '%tahfizh%'`
        )
      )
    )
    .limit(1);

  return membership.length > 0;
}

export function formatDateYMD(dateInput: Date | string): string {
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    return dateInput.slice(0, 10);
  }
  const d = new Date(dateInput);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Mengecek apakah user berhak menginput/mengedit setoran tahfizh untuk tanggal
 * yang sudah lewat (backdate):
 * 1. Punya jabatan struktural langsung (Kepala PJ Tahfizh / PJ Tahfizh / Admin), ATAU
 * 2. Musyrif halaqah sudah mengajukan izin (`tahfidz_backdate_requests`) untuk
 *    tanggal tersebut dan statusnya sudah `approved` oleh Kepala PJ / PJ Tahfizh.
 */
export async function canBackdateTahfidzDeposit(
  userId: number,
  role: string,
  options?: { targetDate?: Date | string; halaqahId?: number | null }
): Promise<boolean> {
  const hasDirectRole = await hasDirectBackdateRole(userId, role);
  if (hasDirectRole) return true;

  // Jika ada targetDate yang dicek, periksa apakah ada request backdate yang sudah di-approve
  if (options?.targetDate) {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.userId, userId),
    });
    if (!teacher) return false;

    const dateStr = formatDateYMD(options.targetDate);
    try {
      const conditions: any[] = [
        eq(tahfidzBackdateRequests.requestedDate, dateStr),
        eq(tahfidzBackdateRequests.status, "approved"),
      ];

      if (options.halaqahId) {
        conditions.push(
          or(
            eq(tahfidzBackdateRequests.teacherId, teacher.id),
            eq(tahfidzBackdateRequests.halaqahId, Number(options.halaqahId))
          )
        );
      } else {
        conditions.push(eq(tahfidzBackdateRequests.teacherId, teacher.id));
      }

      const [approvedReq] = await db
        .select({ id: tahfidzBackdateRequests.id })
        .from(tahfidzBackdateRequests)
        .where(and(...conditions))
        .limit(1);

      if (approvedReq) {
        return true;
      }
    } catch {
      // Tabel tahfidz_backdate_requests mungkin belum dimigrasi
    }
  }

  return false;
}

export function isDateBeforeToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  return check < today;
}
