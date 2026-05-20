export * from "./models/auth";
export * from "./models/chat";
export * from "./models/moroccan_products";

import { createInsertSchema } from "drizzle-zod";
import { users } from "./models/auth";
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
