import {
  mysqlTable,
  varchar,
  int,
  text,
  date,
  timestamp,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { students } from "./students";
import { users } from "./users";
import { relations } from "drizzle-orm";

// 1. Point Rules (Master Data)
export const pointRules = mysqlTable("point_rules", {
  id: int("id").primaryKey().autoincrement(),
  type: mysqlEnum("type", ["reward", "punishment"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "Language", "Adab"
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Late to class", "Memorized Juz 30"
  description: text("description"),
  defaultPoints: int("default_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 2. Rewards & Punishments (Transactions)
export const rewardsPunishments = mysqlTable("rewards_punishments", {
  id: int("id").primaryKey().autoincrement(),
  studentId: int("student_id")
    .references(() => students.id)
    .notNull(),
  ruleId: int("rule_id").references(() => pointRules.id), // Link to master rule
  type: mysqlEnum("type", ["reward", "punishment"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  points: int("points").default(0), // positive for reward, negative for punishment
  date: date("date").notNull(),
  givenBy: int("given_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// 3. Evidence Images
export const pointImages = mysqlTable("point_images", {
  id: int("id").primaryKey().autoincrement(),
  pointId: int("point_id")
    .references(() => rewardsPunishments.id, { onDelete: "cascade" })
    .notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Student Warning Letters (SP)
export const studentWarnings = mysqlTable("student_warnings", {
  id: int("id").primaryKey().autoincrement(),
  studentId: int("student_id")
    .references(() => students.id)
    .notNull(),
  spLevel: int("sp_level").notNull(), // 1, 2, 3
  status: mysqlEnum("status", ["active", "resolved"]).default("active"),
  issueDate: date("issue_date").notNull(),
  validUntil: date("valid_until"), // Optional expiration
  reason: text("reason").notNull(),
  notes: text("notes"),
  attachment: varchar("attachment", { length: 500 }),
  issuedBy: int("issued_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Relations
export const pointRulesRelations = relations(pointRules, ({ many }) => ({
  records: many(rewardsPunishments),
}));

export const rewardsPunishmentsRelations = relations(
  rewardsPunishments,
  ({ one, many }) => ({
    student: one(students, {
      fields: [rewardsPunishments.studentId],
      references: [students.id],
    }),
    rule: one(pointRules, {
      fields: [rewardsPunishments.ruleId],
      references: [pointRules.id],
    }),
    issuer: one(users, {
      fields: [rewardsPunishments.givenBy],
      references: [users.id],
    }),
    images: many(pointImages),
  })
);

export const pointImagesRelations = relations(pointImages, ({ one }) => ({
  point: one(rewardsPunishments, {
    fields: [pointImages.pointId],
    references: [rewardsPunishments.id],
  }),
}));

export const studentWarningsRelations = relations(
  studentWarnings,
  ({ one }) => ({
    student: one(students, {
      fields: [studentWarnings.studentId],
      references: [students.id],
    }),
    issuer: one(users, {
      fields: [studentWarnings.issuedBy],
      references: [users.id],
    }),
  })
);

export type PointRule = typeof pointRules.$inferSelect;
export type NewPointRule = typeof pointRules.$inferInsert;

export type RewardPunishment = typeof rewardsPunishments.$inferSelect;
export type NewRewardPunishment = typeof rewardsPunishments.$inferInsert;

export type PointImage = typeof pointImages.$inferSelect;
export type NewPointImage = typeof pointImages.$inferInsert;

export type StudentWarning = typeof studentWarnings.$inferSelect;
export type NewStudentWarning = typeof studentWarnings.$inferInsert;
