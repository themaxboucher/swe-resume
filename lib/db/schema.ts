import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { CoverLetterContent, DocumentDesign, ResumeContent } from "@/lib/documents/schema";
import type { VersionLayout } from "@/lib/documents/versions";

// ---------- Better Auth tables ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------- Documents ----------

export const resume = pgTable(
  "resume",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Shared text of every version. */
    content: jsonb("content").$type<ResumeContent>().notNull(),
    /** PDF file name for every version; empty means "<Name> - Resume". */
    fileName: text("file_name").notNull().default(""),
    /** Version the editor opens by default. */
    lastVersionId: uuid("last_version_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  // One resume per user; tailoring happens in versions.
  (table) => [uniqueIndex("resume_user_id_key").on(table.userId)],
);

/** A view over a user's resume: what it shows, in what order, and its design. */
export const resumeVersion = pgTable(
  "resume_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    design: jsonb("design").$type<DocumentDesign>().notNull(),
    layout: jsonb("layout").$type<VersionLayout>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("resume_version_resume_id_idx").on(table.resumeId, table.position),
    index("resume_version_user_id_idx").on(table.userId),
  ],
);

export const coverLetter = pgTable(
  "cover_letter",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: jsonb("content").$type<CoverLetterContent>().notNull(),
    design: jsonb("design").$type<DocumentDesign>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("cover_letter_user_id_idx").on(table.userId, table.updatedAt)],
);
