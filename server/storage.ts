import { and } from "drizzle-orm";
import { users, sessions, type User, type UpsertUser, scanHistory, type InsertScanHistory, type ScanHistory, moroccanProducts, type MoroccanProduct, type InsertMoroccanProduct } from "@shared/schema";
import { db } from "./db";
import { pool } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getScanHistory(userId: string): Promise<ScanHistory[]>;
  createScanEntry(entry: InsertScanHistory): Promise<ScanHistory>;
  deleteScanEntry(id: number, userId: string): Promise<boolean>;
  incrementChatCount(userId: string): Promise<void>;
  resetChatCount(userId: string): Promise<void>;
  deleteAllUserSessions(userId: string, currentSid: string): Promise<number>;
  countUserSessions(userId: string): Promise<number>;
  getMoroccanProduct(barcode: string): Promise<MoroccanProduct | undefined>;
  seedMoroccanProducts(products: InsertMoroccanProduct[]): Promise<void>;
  getMoroccanProductsCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: UpsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getScanHistory(userId: string): Promise<ScanHistory[]> {
    return await db
      .select()
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId))
      .orderBy(desc(scanHistory.createdAt));
  }

  async createScanEntry(entry: InsertScanHistory): Promise<ScanHistory> {
    const [newEntry] = await db
      .insert(scanHistory)
      .values(entry)
      .returning();
    return newEntry;
  }

  async deleteScanEntry(id: number, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(scanHistory)
      .where(and(eq(scanHistory.id, id), eq(scanHistory.userId, userId)))
      .returning();
    return !!deleted;
  }

  async incrementChatCount(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    await db.update(users)
      .set({ chatMessagesCount: (user.chatMessagesCount || 0) + 1 })
      .where(eq(users.id, userId));
  }

  async resetChatCount(userId: string): Promise<void> {
    await db.update(users)
      .set({ chatMessagesCount: 0, lastResetDate: new Date() })
      .where(eq(users.id, userId));
  }

  async deleteAllUserSessions(userId: string, currentSid: string): Promise<number> {
    const result = await pool.query(
      `DELETE FROM sessions WHERE sess->'passport'->>'user' = $1 AND sid != $2`,
      [userId, currentSid]
    );
    return result.rowCount ?? 0;
  }

  async countUserSessions(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) FROM sessions WHERE sess->'passport'->>'user' = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async getMoroccanProduct(barcode: string): Promise<MoroccanProduct | undefined> {
    const [product] = await db
      .select()
      .from(moroccanProducts)
      .where(eq(moroccanProducts.barcode, barcode));
    return product;
  }

  async seedMoroccanProducts(products: InsertMoroccanProduct[]): Promise<void> {
    await db
      .insert(moroccanProducts)
      .values(products)
      .onConflictDoNothing();
  }

  async getMoroccanProductsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(moroccanProducts);
    return Number(result[0].count);
  }
}

export const storage = new DatabaseStorage();
