import {
  mysqlTable,
  int,
  varchar,
  text,
  date,
  timestamp,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { students } from "./students";
import { healthExaminations } from "./clinic";
import { users } from "./users";
import { relations } from "drizzle-orm";

export const studentLeaves = mysqlTable("student_leaves", {
  id: int("id").primaryKey().autoincrement(),
  leaveNumber: varchar("leave_number", { length: 80 }),
  qrToken: varchar("qr_token", { length: 100 }),
  type: mysqlEnum("type", ["sick", "permit"]).notNull(),
  leaveCategory: varchar("leave_category", { length: 50 }).default("pulang"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  startTime: varchar("start_time", { length: 10 }).default("08:00"),
  endTime: varchar("end_time", { length: 10 }).default("17:00"),
  reason: text("reason").notNull(),
  destination: varchar("destination", { length: 255 }),
  pickupName: varchar("pickup_name", { length: 150 }),
  pickupRelation: varchar("pickup_relation", { length: 100 }),
  pickupPhone: varchar("pickup_phone", { length: 50 }),
  attachment: varchar("attachment", { length: 500 }),
  requestedByRole: varchar("requested_by_role", { length: 30 }).default("staff"),
  status: varchar("status", { length: 30 }).default("approved").notNull(),
  rejectionReason: text("rejection_reason"),
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  checkedOutAt: timestamp("checked_out_at"),
  checkedOutBy: int("checked_out_by").references(() => users.id),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: int("checked_in_by").references(() => users.id),
  lateMinutes: int("late_minutes").default(0),
  lateHandling: varchar("late_handling", { length: 30 }),
  lateNotes: text("late_notes"),
  punishmentId: int("punishment_id"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const studentLeaveItems = mysqlTable("student_leave_items", {
  id: int("id").primaryKey().autoincrement(),
  leaveId: int("leave_id").references(() => studentLeaves.id, { onDelete: "cascade" }),
  studentId: int("student_id").references(() => students.id).notNull(),
  clinicExamId: int("clinic_exam_id").references(() => healthExaminations.id),
});

// Relations
export const studentLeavesRelations = relations(studentLeaves, ({ many, one }) => ({
  items: many(studentLeaveItems),
  creator: one(users, {
    fields: [studentLeaves.createdBy],
    references: [users.id],
  }),
}));

export const studentLeaveItemsRelations = relations(studentLeaveItems, ({ one }) => ({
  leave: one(studentLeaves, {
    fields: [studentLeaveItems.leaveId],
    references: [studentLeaves.id],
  }),
  student: one(students, {
    fields: [studentLeaveItems.studentId],
    references: [students.id],
  }),
  clinicExam: one(healthExaminations, {
    fields: [studentLeaveItems.clinicExamId],
    references: [healthExaminations.id],
  }),
}));
