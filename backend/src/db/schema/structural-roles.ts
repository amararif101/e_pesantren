import {
  mysqlTable,
  varchar,
  int,
  text,
  date,
  timestamp,
  mysqlEnum,
  boolean,
  unique,
} from "drizzle-orm/mysql-core";
import { teachers } from "./teachers";

/**
 * 1. Master Tabel Unit Struktural (Hirarki Organisasi Pesantren & Madrasah)
 * Terpisah sepenuhnya dari tabel `divisions` yang digunakan Kepegawaian untuk pengelompokan Gaji & Absensi.
 *
 * Contoh data berdasarkan sheet GURU BARU/KELUAR:
 * - institution : PPMH
 * - division    : MS, MT, MT Ciracas, MI, STAIMH, Keuangan
 * - madrasah    : MA, MTs (Homabase Madrasah)
 * - department  : Bagian Pendulum, Bagian Pengasuhan (di bawah MS)
 * - unit        : PJ Tahfizh, PJ Bahasa, PJ Ekskul, PJ Keasramaan, PJ Nasyath, PJ Mental dan R&P, Seksie Asrama
 */
export const structuralUnits = mysqlTable("structural_units", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  type: mysqlEnum("type", [
    "institution", // Induk Pesantren (PPMH)
    "division", // Divisi Struktural (MS, MT, MT Ciracas, MI, STAIMH, Keuangan)
    "madrasah", // Homabase Madrasah Formal (MA, MTs)
    "department", // Bagian (Pendulum, Pengasuhan)
    "unit", // PJ / Sub-Bagian / Seksi (Tahfizh, Bahasa, Ekskul, Keasramaan, Nasyath, Mental & R&P, Seksie Asrama)
  ])
    .notNull()
    .default("unit"),
  parentId: int("parent_id"), // Self-reference ke structural_units.id untuk pohon hierarki
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/**
 * 2. Master Tabel Jabatan / Role Struktural & Fungsional
 * Terpisah dari `position_allowances` (Tunjangan Jabatan Gaji) dan `users.role` (RBAC Akun).
 *
 * Contoh data berdasarkan sheet GURU BARU/KELUAR:
 * - Mudir PPMH, Sekretaris Pesantren
 * - Kepala MS, Sekretaris, Bendahara MS
 * - Kepala PJ Tahfizh, Anggota PJ Tahfizh, Kepala PJ Bahasa, Anggota PJ Bahasa
 * - PJ Keasramaan, PJ Mental dan R&P, PJ Nasyath, PJ Ekskul, Seksie Asrama
 * - Kamad MA, Kamad MTs, TU, TUMTs, OPMA, OPMTs, Wali Kelas
 * - Guru Diniyah, Guru Umum, BK Akhwat, PJ Perpustakaan
 */
export const structuralRoles = mysqlTable("structural_roles", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  scope: mysqlEnum("scope", [
    "pesantren", // Pimpinan / Struktural Inti Pesantren & Divisi (Mudir, Sekretaris, Kepala MS, Bendahara MS)
    "unit", // Struktural Bagian / PJ (Kepala PJ Tahfizh, PJ Tahfizh, Kepala PJ Bahasa, PJ Keasramaan, dll.)
    "madrasah", // Struktural Madrasah Formal (Kamad MA/MTs, TU, Operator, Wali Kelas)
    "functional", // Peran Tendik / Pengajar (Guru Diniyah, Guru Umum, Guru BK, PJ Perpustakaan)
  ])
    .notNull()
    .default("unit"),
  /**
   * Level hierarki untuk memudahkan pengecekan otoritas struktural:
   * 1 = Pimpinan Pesantren (Mudir PPMH, Sekretaris Pesantren)
   * 2 = Pimpinan Divisi / Madrasah (Kepala MS, Kamad MA, Kamad MTs, Bendahara MS, Sekretaris)
   * 3 = Kepala Bagian / Kepala PJ (Kepala PJ Tahfizh, Kepala PJ Bahasa, PJ Keasramaan, PJ Mental dan R&P)
   * 4 = Anggota PJ / Staf Struktural / Wali Kelas (Anggota PJ Tahfizh, Ekskul, Nasyath, Seksie Asrama, TU, Operator, Wali Kelas)
   * 5 = Tenaga Pendidik Fungsional (Guru Diniyah, Guru Umum, Guru BK)
   */
  rankLevel: int("rank_level").notNull().default(5),
  defaultUnitId: int("default_unit_id").references(() => structuralUnits.id, {
    onDelete: "set null",
  }),
  /**
   * Otoritas khusus modul Tahfizh:
   * Apakah pemegang jabatan struktural ini berhak mengkonfirmasi / menginput
   * setoran tahfizh untuk tanggal yang sudah lewat (backdate)?
   */
  canBackdateTahfidz: boolean("can_backdate_tahfidz").notNull().default(false),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/**
 * 3. Tabel Pivot Penugasan Struktural Guru (Many-to-Many)
 * Satu guru dapat memegang lebih dari satu peran/jabatan struktural secara bersamaan
 * (misal: Guru Diniyah + Wali Kelas XI C + Kepala PJ Tahfizh) tanpa mengganggu
 * `teachers.divisionId` / `teacher_divisions` yang dipakai Kepegawaian untuk perhitungan gaji.
 */
export const teacherStructuralAssignments = mysqlTable(
  "teacher_structural_assignments",
  {
    id: int("id").primaryKey().autoincrement(),
    teacherId: int("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    structuralRoleId: int("structural_role_id")
      .notNull()
      .references(() => structuralRoles.id, { onDelete: "cascade" }),
    structuralUnitId: int("structural_unit_id").references(
      () => structuralUnits.id,
      { onDelete: "set null" },
    ),
    /**
     * Detail tambahan penugasan (contoh: "Wali Kelas XI C", "Aqidah (11C) & Fiqh (11C)",
     * atau status kepegawaian "Pegawai" / "Pengabdian")
     */
    assignmentDetail: varchar("assignment_detail", { length: 255 }),
    academicYear: varchar("academic_year", { length: 20 }), // Contoh: "2026/2027"
    isPrimary: boolean("is_primary").notNull().default(false),
    status: mysqlEnum("status", ["active", "inactive"])
      .notNull()
      .default("active"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    uniqueTeacherRoleUnit: unique("uq_teacher_structural_role_unit").on(
      table.teacherId,
      table.structuralRoleId,
      table.structuralUnitId,
    ),
  }),
);

export type StructuralUnit = typeof structuralUnits.$inferSelect;
export type NewStructuralUnit = typeof structuralUnits.$inferInsert;

export type StructuralRole = typeof structuralRoles.$inferSelect;
export type NewStructuralRole = typeof structuralRoles.$inferInsert;

export type TeacherStructuralAssignment =
  typeof teacherStructuralAssignments.$inferSelect;
export type NewTeacherStructuralAssignment =
  typeof teacherStructuralAssignments.$inferInsert;
