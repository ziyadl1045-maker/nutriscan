import { pgTable, varchar, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const moroccanProducts = pgTable("moroccan_products", {
  barcode: varchar("barcode").primaryKey(),
  name: text("name").notNull(),
  brand: varchar("brand"),
  category: varchar("category"),
  isHalal: boolean("is_halal").default(true),
  isHalalCertified: boolean("is_halal_certified").default(false),
  ingredients: text("ingredients"),
  nutriments: jsonb("nutriments"),
  calories: integer("calories"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertMoroccanProductSchema = createInsertSchema(moroccanProducts).omit({
  createdAt: true,
});

export type MoroccanProduct = typeof moroccanProducts.$inferSelect;
export type InsertMoroccanProduct = z.infer<typeof insertMoroccanProductSchema>;
