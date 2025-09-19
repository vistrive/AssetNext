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
  avatar: text("avatar"), // URL to profile picture
  phone: text("phone"),
  department: text("department"),
  jobTitle: text("job_title"),
  manager: text("manager"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"), // Company logo URL
  website: text("website"),
  industry: text("industry"),
  employeeCount: integer("employee_count"),
  // Settings
  timezone: text("timezone").default("UTC"),
  currency: text("currency").default("USD"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  fiscalYearStart: text("fiscal_year_start").default("01-01"),
  autoRecommendations: boolean("auto_recommendations").default(true),
  dataRetentionDays: integer("data_retention_days").default(365),
  // Security Settings
  enforceSSO: boolean("enforce_sso").default(false),
  requireMFA: boolean("require_mfa").default(false),
  sessionTimeout: integer("session_timeout").default(480), // minutes
  passwordPolicy: jsonb("password_policy"), // complexity rules
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
  // Software-specific fields (when type is 'software')
  softwareName: text("software_name"),
  version: text("version"),
  licenseType: text("license_type"), // perpetual, subscription, volume
  licenseKey: text("license_key"),
  usedLicenses: integer("used_licenses"),
  renewalDate: timestamp("renewal_date"),
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

// User Preferences
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  // Notification Settings
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  aiRecommendationAlerts: boolean("ai_recommendation_alerts").default(true),
  weeklyReports: boolean("weekly_reports").default(false),
  assetExpiryAlerts: boolean("asset_expiry_alerts").default(true),
  // Display Settings
  theme: text("theme").default("light"), // light, dark, auto
  language: text("language").default("en"),
  timezone: text("timezone").default("UTC"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  dashboardLayout: jsonb("dashboard_layout"), // widget preferences
  itemsPerPage: integer("items_per_page").default(25),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Logs for Enterprise Compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  resourceType: text("resource_type").notNull(), // ASSET, LICENSE, USER, SETTING
  resourceId: varchar("resource_id"),
  userId: varchar("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  userRole: text("user_role").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  description: text("description"),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const masterData = pgTable("master_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // manufacturer, model, category, location, vendor, company
  value: text("value").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // flexible properties
  createdBy: varchar("created_by").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMasterDataSchema = createInsertSchema(masterData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type MasterData = typeof masterData.$inferSelect;
export type InsertMasterData = z.infer<typeof insertMasterDataSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;

// Additional validation schemas for API endpoints
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  manager: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateUserPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  aiRecommendationAlerts: z.boolean(),
  weeklyReports: z.boolean(),
  assetExpiryAlerts: z.boolean(),
  theme: z.enum(["light", "dark", "auto"]),
  language: z.string(),
  timezone: z.string(),
  dateFormat: z.string(),
  itemsPerPage: z.number().int().min(10).max(100),
});

export const updateOrgSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  timezone: z.string(),
  currency: z.string(),
  dateFormat: z.string(),
  autoRecommendations: z.boolean(),
  dataRetentionDays: z.number().int().min(30).max(2555), // 30 days to 7 years
});

export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateOrgSettings = z.infer<typeof updateOrgSettingsSchema>;
