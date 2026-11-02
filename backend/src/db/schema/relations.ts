import { relations } from "drizzle-orm";
import { teachers } from "./teachers";
import { divisions, teacherDivisions } from "./divisions";
import {
  structuralUnits,
  structuralRoles,
  teacherStructuralAssignments,
} from "./structural-roles";
import { pharmacies, pharmacyPharmacists, medicines } from "./clinic";

import { salaryGrades, positionAllowances } from "./salary";

export const teachersRelations = relations(teachers, ({ many, one }) => ({
  teacherDivisions: many(teacherDivisions),
  structuralAssignments: many(teacherStructuralAssignments),
  pharmacyPharmacists: many(pharmacyPharmacists),
  salaryGrade: one(salaryGrades, {
    fields: [teachers.salaryGradeId],
    references: [salaryGrades.id],
  }),
  positionAllowance: one(positionAllowances, {
    fields: [teachers.positionAllowanceId],
    references: [positionAllowances.id],
  }),
}));

export const divisionsRelations = relations(divisions, ({ many }) => ({
  teacherDivisions: many(teacherDivisions),
}));

export const teacherDivisionsRelations = relations(
  teacherDivisions,
  ({ one }) => ({
    teacher: one(teachers, {
      fields: [teacherDivisions.teacherId],
      references: [teachers.id],
    }),
    division: one(divisions, {
      fields: [teacherDivisions.divisionId],
      references: [divisions.id],
    }),
  })
);

export const structuralUnitsRelations = relations(
  structuralUnits,
  ({ one, many }) => ({
    parent: one(structuralUnits, {
      fields: [structuralUnits.parentId],
      references: [structuralUnits.id],
      relationName: "structural_unit_hierarchy",
    }),
    children: many(structuralUnits, {
      relationName: "structural_unit_hierarchy",
    }),
    defaultRoles: many(structuralRoles),
    assignments: many(teacherStructuralAssignments),
  })
);

export const structuralRolesRelations = relations(
  structuralRoles,
  ({ one, many }) => ({
    defaultUnit: one(structuralUnits, {
      fields: [structuralRoles.defaultUnitId],
      references: [structuralUnits.id],
    }),
    assignments: many(teacherStructuralAssignments),
  })
);

export const teacherStructuralAssignmentsRelations = relations(
  teacherStructuralAssignments,
  ({ one }) => ({
    teacher: one(teachers, {
      fields: [teacherStructuralAssignments.teacherId],
      references: [teachers.id],
    }),
    structuralRole: one(structuralRoles, {
      fields: [teacherStructuralAssignments.structuralRoleId],
      references: [structuralRoles.id],
    }),
    structuralUnit: one(structuralUnits, {
      fields: [teacherStructuralAssignments.structuralUnitId],
      references: [structuralUnits.id],
    }),
  })
);

import { permissionRequests } from "./permissions";

export const permissionRequestsRelations = relations(
  permissionRequests,
  ({ one }) => ({
    teacher: one(teachers, {
      fields: [permissionRequests.teacherId],
      references: [teachers.id],
    }),
  })
);

import { students } from "./students";
import { classes } from "./academic";
import { rooms } from "./rooms";

export const studentsRelations = relations(students, ({ one }) => ({
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
  room: one(rooms, {
    fields: [students.roomId],
    references: [rooms.id],
  }),
}));

import { studentAttendances } from "./attendance";

export const studentAttendancesRelations = relations(
  studentAttendances,
  ({ one }) => ({
    student: one(students, {
      fields: [studentAttendances.studentId],
      references: [students.id],
    }),
  })
);

import { studentClasses } from "./academic";

export const studentClassesRelations = relations(studentClasses, ({ one }) => ({
  student: one(students, {
    fields: [studentClasses.studentId],
    references: [students.id],
  }),
  class: one(classes, {
    fields: [studentClasses.classId],
    references: [classes.id],
  }),
}));

export const pharmaciesRelations = relations(pharmacies, ({ many }) => ({
  pharmacyPharmacists: many(pharmacyPharmacists),
  medicines: many(medicines),
}));

export const pharmacyPharmacistsRelations = relations(
  pharmacyPharmacists,
  ({ one }) => ({
    pharmacy: one(pharmacies, {
      fields: [pharmacyPharmacists.pharmacyId],
      references: [pharmacies.id],
    }),
    teacher: one(teachers, {
      fields: [pharmacyPharmacists.teacherId],
      references: [teachers.id],
    }),
  })
);

export const medicinesRelations = relations(
  medicines,
  ({ one }) => ({
    pharmacy: one(pharmacies, {
      fields: [medicines.pharmacyId],
      references: [pharmacies.id],
    }),
  })
);
