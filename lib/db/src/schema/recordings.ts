import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { nanoid } from "nanoid";

export const recordingsTable = pgTable("recordings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  duration: real("duration").notNull(),
  audioObjectPath: text("audio_object_path").notNull(),
  shareToken: text("share_token")
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(12)),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRecordingSchema = createInsertSchema(recordingsTable).omit({
  id: true,
  shareToken: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordingsTable.$inferSelect;
