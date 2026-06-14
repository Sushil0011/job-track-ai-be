import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "@auth/core/adapters";

// --- ENUMS ---
export const jobStatusEnum = pgEnum("job_status", [
  "WISHLIST",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
]);

// --- AUTH TABLES ---
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  refreshToken: text("refreshToken").notNull(),
  refreshTokenExpiry: timestamp("refreshTokenExpiry", { mode: "date" }).notNull(),
  passwordResetToken: text("passwordResetToken"),
  passwordResetExpiry: timestamp("passwordResetExpiry", { mode: "date" }),
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

// --- CORE TABLES ---
export const jobs = pgTable("job", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: text("companyName").notNull(),
  position: text("position").notNull(),
  jobUrl: text("jobUrl"),
  location: text("location"),
  salaryRange: text("salaryRange"),
  status: jobStatusEnum("status").default("WISHLIST").notNull(),
  applicationDate: timestamp("applicationDate", { mode: "date" }).defaultNow(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const notes = pgTable("note", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  jobId: text("jobId")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const reminders = pgTable("reminder", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  jobId: text("jobId")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  reminderDate: timestamp("reminderDate", { mode: "date" }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

// --- RELATIONS (For easier querying) ---
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
  notes: many(notes),
  reminders: many(reminders),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  job: one(jobs, {
    fields: [notes.jobId],
    references: [jobs.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  job: one(jobs, {
    fields: [reminders.jobId],
    references: [jobs.id],
  }),
}));
