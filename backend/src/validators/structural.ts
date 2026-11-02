import { z } from "zod";

export const STRUCTURAL_UNIT_TYPES = [
  "institution",
  "division",
  "madrasah",
  "department",
  "unit",
] as const;

export const STRUCTURAL_ROLE_SCOPES = [
  "pesantren",
  "unit",
  "madrasah",
  "functional",
] as const;

export const createStructuralUnitSchema = z.object({
  code: z
    .string()
    .min(1, "Kode unit wajib diisi")
    .max(50)
    .transform((v) => v.trim().toUpperCase().replace(/\s+/g, "_")),
  name: z.string().min(1, "Nama unit struktural wajib diisi").max(150),
  type: z.enum(STRUCTURAL_UNIT_TYPES).default("unit"),
  parentId: z.number().int().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateStructuralUnitSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .transform((v) => v.trim().toUpperCase().replace(/\s+/g, "_"))
    .optional(),
  name: z.string().min(1).max(150).optional(),
  type: z.enum(STRUCTURAL_UNIT_TYPES).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createStructuralRoleSchema = z.object({
  code: z
    .string()
    .min(1, "Kode jabatan struktural wajib diisi")
    .max(50)
    .transform((v) => v.trim().toUpperCase().replace(/\s+/g, "_")),
  name: z.string().min(1, "Nama jabatan struktural wajib diisi").max(150),
  scope: z.enum(STRUCTURAL_ROLE_SCOPES).default("unit"),
  rankLevel: z.number().int().min(1).max(10).default(5),
  defaultUnitId: z.number().int().positive().nullable().optional(),
  canBackdateTahfidz: z.boolean().default(false),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateStructuralRoleSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .transform((v) => v.trim().toUpperCase().replace(/\s+/g, "_"))
    .optional(),
  name: z.string().min(1).max(150).optional(),
  scope: z.enum(STRUCTURAL_ROLE_SCOPES).optional(),
  rankLevel: z.number().int().min(1).max(10).optional(),
  defaultUnitId: z.number().int().positive().nullable().optional(),
  canBackdateTahfidz: z.boolean().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createStructuralAssignmentSchema = z.object({
  teacherId: z.number().int().positive("Teacher ID wajib diisi"),
  structuralRoleId: z
    .number()
    .int()
    .positive("ID Jabatan Struktural wajib diisi"),
  structuralUnitId: z.number().int().positive().nullable().optional(),
  assignmentDetail: z.string().max(255).nullable().optional(),
  academicYear: z.string().max(20).nullable().optional(),
  isPrimary: z.boolean().optional().default(false),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateStructuralAssignmentSchema = z.object({
  structuralRoleId: z.number().int().positive().optional(),
  structuralUnitId: z.number().int().positive().nullable().optional(),
  assignmentDetail: z.string().max(255).nullable().optional(),
  academicYear: z.string().max(20).nullable().optional(),
  isPrimary: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const syncTeacherStructuralAssignmentsSchema = z.object({
  assignments: z.array(
    z.object({
      structuralRoleId: z.number().int().positive(),
      structuralUnitId: z.number().int().positive().nullable().optional(),
      assignmentDetail: z.string().max(255).nullable().optional(),
      academicYear: z.string().max(20).nullable().optional(),
      isPrimary: z.boolean().optional().default(false),
      status: z.enum(["active", "inactive"]).optional().default("active"),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
  ),
});
