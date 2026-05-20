import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, integer, text } from "drizzle-orm/pg-core";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  password: text("password"),
  fullName: varchar("full_name"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  // New profile fields
  age: integer("age"),
  gender: text("gender"), 
  profileImageUrl: varchar("profile_image_url"),
  dietaryPreferences: text("dietary_preferences").array(), 
  subscriptionStatus: varchar("subscription_status").default("free"), // 'free' or 'premium'
  chatMessagesCount: integer("chat_messages_count").default(0),
  lastResetDate: timestamp("last_reset_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
