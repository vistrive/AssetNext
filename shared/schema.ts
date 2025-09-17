import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("read-only"), // admin, it-manager, read-only
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // hardware, software, peripheral
  category: text("category"), // laptop, desktop, server, etc.
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  status: text("status").notNull().default("in-stock"), // in-stock, deployed, in-repair, disposed
  location: text("location"),
  assignedUserId: varchar("assigned_user_id"),
  assignedUserName: text("assigned_user_name"),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  warrantyExpiry: timestamp("warranty_expiry"),
  specifications: jsonb("specifications"), // CPU, RAM, Storage, etc.
  notes: text("notes"),
  // Vendor information
  vendorName: text("vendor_name"),
  vendorEmail: text("vendor_email"),
  vendorPhone: text("vendor_phone"),
  // Company information
  companyName: text("company_name"),
  companyGstNumber: text("company_gst_number"),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const softwareLicenses = pgTable("software_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  vendor: text("vendor"),
  version: text("version"),
  licenseKey: text("license_key"),
  licenseType: text("license_type"), // perpetual, subscription, volume
  totalLicenses: integer("total_licenses").notNull(),
  usedLicenses: integer("used_licenses").notNull().default(0),
  costPerLicense: decimal("cost_per_license", { precision: 10, scale: 2 }),
  renewalDate: timestamp("renewal_date"),
  notes: text("notes"),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assetUtilization = pgTable("asset_utilization", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull(),
  cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
  ramUsage: decimal("ram_usage", { precision: 5, scale: 2 }),
  diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }),
  networkUsage: decimal("network_usage", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
  tenantId: varchar("tenant_id").notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // downgrade, upgrade, reallocation, license-optimization
  title: text("title").notNull(),
  description: text("description").notNull(),
  potentialSavings: decimal("potential_savings", { precision: 10, scale: 2 }),
  priority: text("priority").notNull().default("medium"), // low, medium, high
  status: text("status").notNull().default("pending"), // pending, accepted, dismissed
  assetIds: jsonb("asset_ids"), // Array of asset IDs affected
  generatedAt: timestamp("generated_at").defaultNow(),
  tenantId: varchar("tenant_id").notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSoftwareLicenseSchema = createInsertSchema(softwareLicenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetUtilizationSchema = createInsertSchema(assetUtilization).omit({
  id: true,
  recordedAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  generatedAt: true,
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  tenantName: z.string().min(1),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type SoftwareLicense = typeof softwareLicenses.$inferSelect;
export type InsertSoftwareLicense = z.infer<typeof insertSoftwareLicenseSchema>;
export type AssetUtilization = typeof assetUtilization.$inferSelect;
export type InsertAssetUtilization = z.infer<typeof insertAssetUtilizationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
