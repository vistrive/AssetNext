import { 
  type User, 
  type InsertUser, 
  type Tenant, 
  type InsertTenant,
  type Asset,
  type InsertAsset,
  type SoftwareLicense,
  type InsertSoftwareLicense,
  type AssetUtilization,
  type InsertAssetUtilization,
  type Recommendation,
  type InsertRecommendation,
  type MasterData,
  type InsertMasterData,
  type UserPreferences,
  type InsertUserPreferences,
  type AuditLog,
  type InsertAuditLog,
  type UpdateUserProfile,
  type UpdateOrgSettings,
  type UserInvitation,
  type InsertUserInvitation,
  type InviteUser,
  type UpdateUserRole,
  users,
  tenants,
  assets,
  softwareLicenses,
  assetUtilization,
  recommendations,
  masterData,
  userPreferences,
  auditLogs,
  userInvitations
} from "@shared/schema";
import { randomUUID } from "crypto";
import { hashPassword } from "./services/auth";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserProfile(userId: string, tenantId: string, profile: UpdateUserProfile): Promise<User | undefined>;
  updateUserPassword(userId: string, tenantId: string, hashedPassword: string): Promise<boolean>;
  
  // User Management
  getTenantUsers(tenantId: string): Promise<User[]>;
  updateUserRole(userId: string, tenantId: string, role: UpdateUserRole): Promise<User | undefined>;
  deactivateUser(userId: string, tenantId: string): Promise<boolean>;
  activateUser(userId: string, tenantId: string): Promise<boolean>;
  
  // User Invitations
  createInvitation(invitation: InsertUserInvitation): Promise<UserInvitation>;
  getInvitation(token: string): Promise<UserInvitation | undefined>;
  getInvitationByEmail(email: string, tenantId: string): Promise<UserInvitation | undefined>;
  getTenantInvitations(tenantId: string): Promise<UserInvitation[]>;
  updateInvitationStatus(token: string, status: "accepted" | "expired"): Promise<UserInvitation | undefined>;
  acceptInvitation(token: string, password: string): Promise<{ user: User; invitation: UserInvitation } | undefined>;

  // User Preferences
  getUserPreferences(userId: string, tenantId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, tenantId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined>;

  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  updateOrgSettings(tenantId: string, settings: UpdateOrgSettings): Promise<Tenant | undefined>;

  // Assets
  getAllAssets(tenantId: string): Promise<Asset[]>;
  getAsset(id: string, tenantId: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, tenantId: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: string, tenantId: string): Promise<boolean>;

  // Software Licenses
  getAllSoftwareLicenses(tenantId: string): Promise<SoftwareLicense[]>;
  getSoftwareLicense(id: string, tenantId: string): Promise<SoftwareLicense | undefined>;
  createSoftwareLicense(license: InsertSoftwareLicense): Promise<SoftwareLicense>;
  updateSoftwareLicense(id: string, tenantId: string, license: Partial<InsertSoftwareLicense>): Promise<SoftwareLicense | undefined>;
  deleteSoftwareLicense(id: string, tenantId: string): Promise<boolean>;

  // Asset Utilization
  addAssetUtilization(utilization: InsertAssetUtilization): Promise<AssetUtilization>;
  getAssetUtilization(assetId: string, tenantId: string): Promise<AssetUtilization[]>;

  // Recommendations
  getRecommendations(tenantId: string): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendationStatus(id: string, tenantId: string, status: string): Promise<Recommendation | undefined>;

  // Master Data
  getMasterData(tenantId: string, type?: string): Promise<MasterData[]>;
  addMasterData(masterData: InsertMasterData): Promise<MasterData>;
  getDistinctFromAssets(tenantId: string, field: string): Promise<{ value: string }[]>;

  // Audit Logs
  logActivity(activity: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(tenantId: string): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserProfile(userId: string, tenantId: string, profile: UpdateUserProfile): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        department: profile.department,
        jobTitle: profile.jobTitle,
        manager: profile.manager,
        updatedAt: new Date()
      })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserPassword(userId: string, tenantId: string, hashedPassword: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
    return (result.rowCount || 0) > 0;
  }

  // User Management
  async getTenantUsers(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async updateUserRole(userId: string, tenantId: string, role: UpdateUserRole): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: role.role, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning();
    return updatedUser || undefined;
  }

  async deactivateUser(userId: string, tenantId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
    return (result.rowCount || 0) > 0;
  }

  async activateUser(userId: string, tenantId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
    return (result.rowCount || 0) > 0;
  }

  // User Invitations
  async createInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    const invitationData = {
      ...invitation,
      token: randomUUID(),
      status: "pending" as const,
    };
    const [newInvitation] = await db.insert(userInvitations).values(invitationData).returning();
    return newInvitation;
  }

  async getInvitation(token: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db.select().from(userInvitations).where(eq(userInvitations.token, token));
    return invitation || undefined;
  }

  async getInvitationByEmail(email: string, tenantId: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(and(eq(userInvitations.email, email), eq(userInvitations.tenantId, tenantId)));
    return invitation || undefined;
  }

  async getTenantInvitations(tenantId: string): Promise<UserInvitation[]> {
    return await db.select().from(userInvitations).where(eq(userInvitations.tenantId, tenantId));
  }

  async updateInvitationStatus(token: string, status: "accepted" | "expired"): Promise<UserInvitation | undefined> {
    const [updatedInvitation] = await db
      .update(userInvitations)
      .set({ status, acceptedAt: status === "accepted" ? new Date() : undefined })
      .where(eq(userInvitations.token, token))
      .returning();
    return updatedInvitation || undefined;
  }

  async acceptInvitation(token: string, password: string): Promise<{ user: User; invitation: UserInvitation } | undefined> {
    const invitation = await this.getInvitation(token);
    if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
      return undefined;
    }

    // Create user account
    const hashedPassword = await hashPassword(password);
    const newUser = await this.createUser({
      username: invitation.email,
      email: invitation.email,
      password: hashedPassword,
      firstName: invitation.firstName || "",
      lastName: invitation.lastName || "",
      role: invitation.role || "read-only",
      tenantId: invitation.tenantId,
      invitedBy: invitation.invitedBy,
      isActive: true,
    });

    // Mark invitation as accepted
    const updatedInvitation = await this.updateInvitationStatus(token, "accepted");
    if (!updatedInvitation) {
      throw new Error("Failed to update invitation status");
    }

    return { user: newUser, invitation: updatedInvitation };
  }

  // User Preferences
  async getUserPreferences(userId: string, tenantId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.tenantId, tenantId)));
    return preferences || undefined;
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [newPreferences] = await db.insert(userPreferences).values(preferences).returning();
    return newPreferences;
  }

  async updateUserPreferences(userId: string, tenantId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const [updatedPreferences] = await db
      .update(userPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.tenantId, tenantId)))
      .returning();
    return updatedPreferences || undefined;
  }

  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ ...tenant, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant || undefined;
  }

  async updateOrgSettings(tenantId: string, settings: UpdateOrgSettings): Promise<Tenant | undefined> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ 
        name: settings.name,
        timezone: settings.timezone,
        currency: settings.currency,
        dateFormat: settings.dateFormat,
        autoRecommendations: settings.autoRecommendations,
        dataRetentionDays: settings.dataRetentionDays,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId))
      .returning();
    return updatedTenant || undefined;
  }

  // Assets
  async getAllAssets(tenantId: string): Promise<Asset[]> {
    return await db.select().from(assets).where(eq(assets.tenantId, tenantId));
  }

  async getAsset(id: string, tenantId: string): Promise<Asset | undefined> {
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)));
    return asset || undefined;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: string, tenantId: string, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [updatedAsset] = await db
      .update(assets)
      .set({ ...asset, updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning();
    return updatedAsset || undefined;
  }

  async deleteAsset(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)));
    return (result.rowCount || 0) > 0;
  }

  // Software Licenses
  async getAllSoftwareLicenses(tenantId: string): Promise<SoftwareLicense[]> {
    return await db.select().from(softwareLicenses).where(eq(softwareLicenses.tenantId, tenantId));
  }

  async getSoftwareLicense(id: string, tenantId: string): Promise<SoftwareLicense | undefined> {
    const [license] = await db
      .select()
      .from(softwareLicenses)
      .where(and(eq(softwareLicenses.id, id), eq(softwareLicenses.tenantId, tenantId)));
    return license || undefined;
  }

  async createSoftwareLicense(license: InsertSoftwareLicense): Promise<SoftwareLicense> {
    const [newLicense] = await db.insert(softwareLicenses).values(license).returning();
    return newLicense;
  }

  async updateSoftwareLicense(id: string, tenantId: string, license: Partial<InsertSoftwareLicense>): Promise<SoftwareLicense | undefined> {
    const [updatedLicense] = await db
      .update(softwareLicenses)
      .set({ ...license, updatedAt: new Date() })
      .where(and(eq(softwareLicenses.id, id), eq(softwareLicenses.tenantId, tenantId)))
      .returning();
    return updatedLicense || undefined;
  }

  async deleteSoftwareLicense(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(softwareLicenses)
      .where(and(eq(softwareLicenses.id, id), eq(softwareLicenses.tenantId, tenantId)));
    return (result.rowCount || 0) > 0;
  }

  // Asset Utilization
  async addAssetUtilization(utilization: InsertAssetUtilization): Promise<AssetUtilization> {
    const [newUtilization] = await db.insert(assetUtilization).values(utilization).returning();
    return newUtilization;
  }

  async getAssetUtilization(assetId: string, tenantId: string): Promise<AssetUtilization[]> {
    return await db
      .select()
      .from(assetUtilization)
      .where(and(eq(assetUtilization.assetId, assetId), eq(assetUtilization.tenantId, tenantId)))
      .orderBy(desc(assetUtilization.recordedAt));
  }

  // Recommendations
  async getRecommendations(tenantId: string): Promise<Recommendation[]> {
    return await db.select().from(recommendations).where(eq(recommendations.tenantId, tenantId));
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [newRecommendation] = await db.insert(recommendations).values(recommendation).returning();
    return newRecommendation;
  }

  async updateRecommendationStatus(id: string, tenantId: string, status: string): Promise<Recommendation | undefined> {
    const [updatedRecommendation] = await db
      .update(recommendations)
      .set({ status })
      .where(and(eq(recommendations.id, id), eq(recommendations.tenantId, tenantId)))
      .returning();
    return updatedRecommendation || undefined;
  }

  // Master Data
  async getMasterData(tenantId: string, type?: string): Promise<MasterData[]> {
    if (type) {
      return await db
        .select()
        .from(masterData)
        .where(and(eq(masterData.tenantId, tenantId), eq(masterData.type, type)));
    }
    return await db.select().from(masterData).where(eq(masterData.tenantId, tenantId));
  }

  async addMasterData(data: InsertMasterData): Promise<MasterData> {
    const [newData] = await db.insert(masterData).values(data).returning();
    return newData;
  }

  async getDistinctFromAssets(tenantId: string, field: string): Promise<{ value: string }[]> {
    const validFields = ["manufacturer", "model", "category", "location", "status"];
    if (!validFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    const distinctValues = await db
      .selectDistinct({ value: sql`${sql.identifier(field)}` })
      .from(assets)
      .where(eq(assets.tenantId, tenantId));

    return distinctValues.filter(item => item.value).map(item => ({ value: String(item.value) }));
  }

  // Audit Logs
  async logActivity(activity: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(activity).returning();
    return newLog;
  }

  async getAuditLogs(tenantId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt));
  }
}

// Create and seed the database storage
export const storage = new DatabaseStorage();

// Seed function to populate initial data
export async function seedDatabase() {
  console.log("Seeding database...");

  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail("admin@techcorp.com");
    if (existingAdmin) {
      console.log("Database already seeded.");
      return;
    }

    // Create default tenant
    const tenant = await storage.createTenant({
      name: "TechCorp Inc.",
      slug: "techcorp",
      logo: null,
      website: null,
      industry: null,
      employeeCount: null,
      timezone: "UTC",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      fiscalYearStart: "01-01",
      autoRecommendations: true,
      dataRetentionDays: 365,
      enforceSSO: false,
      requireMFA: false,
      sessionTimeout: 480,
      passwordPolicy: null,
    });

    // Create default admin user
    const hashedPassword = await hashPassword("admin123");
    const adminUser = await storage.createUser({
      username: "admin",
      email: "admin@techcorp.com",
      password: hashedPassword,
      firstName: "Sarah",
      lastName: "Johnson",
      role: "admin",
      avatar: null,
      phone: null,
      department: null,
      jobTitle: null,
      manager: null,
      lastLoginAt: null,
      isActive: true,
      tenantId: tenant.id,
      invitedBy: null,
    });

    // Seed sample master data
    const sampleMasterData = [
      // Manufacturers
      { type: "manufacturer", value: "Apple", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "manufacturer", value: "Dell", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "manufacturer", value: "HP", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "manufacturer", value: "Lenovo", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "manufacturer", value: "Microsoft", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      
      // Models
      { type: "model", value: "MacBook Pro", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "model", value: "MacBook Air", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "model", value: "OptiPlex 7090", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "model", value: "EliteBook 850", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "model", value: "ThinkPad X1 Carbon", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      
      // Categories
      { type: "category", value: "laptop", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "category", value: "desktop", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "category", value: "server", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "category", value: "monitor", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "category", value: "printer", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      
      // Locations
      { type: "location", value: "Office Floor 1", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "location", value: "Office Floor 2", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "location", value: "Storage Room A", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "location", value: "Storage Room B", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
      { type: "location", value: "Warehouse", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id },
    ];

    for (const data of sampleMasterData) {
      await storage.addMasterData(data);
    }

    // Seed sample assets
    const sampleAssets = [
      {
        name: "MacBook Pro 16\"",
        type: "hardware",
        category: "laptop",
        manufacturer: "Apple",
        model: "MacBook Pro",
        serialNumber: "A1234567890",
        status: "deployed",
        location: "Office Floor 2, Desk 45",
        assignedUserId: null,
        assignedUserName: null,
        purchaseDate: new Date("2024-01-15"),
        purchaseCost: "2499.00",
        warrantyExpiry: new Date("2027-01-15"),
        specifications: { ram: "16GB", storage: "512GB SSD", processor: "M1 Pro" },
        tenantId: tenant.id,
        createdBy: adminUser.id,
      },
      {
        name: "Dell OptiPlex 7090",
        type: "hardware",
        category: "desktop",
        manufacturer: "Dell",
        model: "OptiPlex 7090",
        serialNumber: "D9876543210",
        status: "available",
        location: "Storage Room A",
        assignedUserId: null,
        assignedUserName: null,
        purchaseDate: new Date("2024-02-01"),
        purchaseCost: "899.00",
        warrantyExpiry: new Date("2027-02-01"),
        specifications: { ram: "8GB", storage: "256GB SSD", processor: "Intel i5" },
        tenantId: tenant.id,
        createdBy: adminUser.id,
      }
    ];

    for (const asset of sampleAssets) {
      await storage.createAsset(asset);
    }

    console.log("Database seeded successfully!");
    console.log("Admin credentials: admin@techcorp.com / admin123");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}