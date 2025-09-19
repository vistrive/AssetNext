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
  type UpdateUserRole
} from "@shared/schema";
import { randomUUID } from "crypto";
import { hashPassword } from "./services/auth";

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
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenantSettings(tenantId: string, settings: UpdateOrgSettings): Promise<Tenant | undefined>;

  // Audit Logs
  getAuditLogs(tenantId: string, filters?: { action?: string; resourceType?: string; userId?: string; limit?: number; offset?: number }): Promise<AuditLog[]>;
  logActivity(auditLog: InsertAuditLog): Promise<AuditLog>;

  // Assets
  getAssets(tenantId: string, filters?: { type?: string; status?: string }): Promise<Asset[]>;
  getAsset(id: string, tenantId: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, tenantId: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: string, tenantId: string): Promise<boolean>;

  // Software Licenses
  getSoftwareLicenses(tenantId: string): Promise<SoftwareLicense[]>;
  getSoftwareLicense(id: string, tenantId: string): Promise<SoftwareLicense | undefined>;
  createSoftwareLicense(license: InsertSoftwareLicense): Promise<SoftwareLicense>;
  updateSoftwareLicense(id: string, tenantId: string, license: Partial<InsertSoftwareLicense>): Promise<SoftwareLicense | undefined>;

  // Asset Utilization
  getAssetUtilization(assetId: string, tenantId: string, days?: number): Promise<AssetUtilization[]>;
  recordAssetUtilization(utilization: InsertAssetUtilization): Promise<AssetUtilization>;

  // Recommendations
  getRecommendations(tenantId: string, status?: string): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: string, tenantId: string, recommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined>;

  // Dashboard Metrics
  getDashboardMetrics(tenantId: string): Promise<{
    totalAssets: number;
    activeLicenses: number;
    complianceScore: number;
    costSavings: number;
    assetStatusBreakdown: { status: string; count: number }[];
  }>;

  // Master Data
  getMasterData(tenantId: string, type: string, query?: string): Promise<MasterData[]>;
  addMasterData(masterData: InsertMasterData): Promise<MasterData>;
  getDistinctFromAssets(tenantId: string, field: string): Promise<string[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private assets: Map<string, Asset> = new Map();
  private softwareLicenses: Map<string, SoftwareLicense> = new Map();
  private assetUtilization: Map<string, AssetUtilization> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private userInvitations: Map<string, UserInvitation> = new Map();
  // Use composite key for tenant isolation: `${tenantId}:${userId}`
  private userPreferences: Map<string, UserPreferences> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private masterData: Map<string, MasterData> = new Map();

  constructor() {
    this.seedData().catch(console.error);
  }

  private async seedData() {
    // Create default tenant
    const tenant: Tenant = {
      id: "tenant-1",
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.set(tenant.id, tenant);

    // Create default admin user
    const hashedPassword = await hashPassword("admin123");
    const adminUser: User = {
      id: "user-1",
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Seed sample master data
    const sampleMasterData: MasterData[] = [
      // Manufacturers
      { id: "master-1", type: "manufacturer", value: "Apple", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-2", type: "manufacturer", value: "Dell", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-3", type: "manufacturer", value: "HP", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-4", type: "manufacturer", value: "Lenovo", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-5", type: "manufacturer", value: "Microsoft", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      
      // Models
      { id: "master-6", type: "model", value: "MacBook Pro", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-7", type: "model", value: "MacBook Air", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-8", type: "model", value: "OptiPlex 7090", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-9", type: "model", value: "EliteBook 850", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-10", type: "model", value: "ThinkPad X1 Carbon", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      
      // Categories
      { id: "master-11", type: "category", value: "laptop", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-12", type: "category", value: "desktop", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-13", type: "category", value: "server", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-14", type: "category", value: "monitor", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-15", type: "category", value: "printer", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      
      // Locations
      { id: "master-16", type: "location", value: "Office Floor 1", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-17", type: "location", value: "Office Floor 2", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-18", type: "location", value: "Storage Room A", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-19", type: "location", value: "Storage Room B", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-20", type: "location", value: "Warehouse", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      
      // Vendor Names
      { id: "master-21", type: "vendor", value: "Apple Inc.", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-22", type: "vendor", value: "Dell Technologies", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-23", type: "vendor", value: "HP Inc.", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-24", type: "vendor", value: "Lenovo Group", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      
      // Company Names
      { id: "master-25", type: "company", value: "Apple Inc.", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-26", type: "company", value: "Dell Technologies Inc.", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-27", type: "company", value: "HP Inc.", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "master-28", type: "company", value: "Lenovo Group Ltd.", isActive: true, description: null, metadata: null, createdBy: adminUser.id, tenantId: tenant.id, createdAt: new Date(), updatedAt: new Date() },
    ];

    sampleMasterData.forEach(data => this.masterData.set(data.id, data));

    // Seed sample assets
    const sampleAssets: Asset[] = [
      {
        id: "asset-1",
        name: "MacBook Pro 16\"",
        type: "hardware",
        category: "laptop",
        manufacturer: "Apple",
        model: "MacBook Pro",
        serialNumber: "A1234567890",
        status: "deployed",
        location: "Office Floor 2, Desk 45",
        assignedUserId: "emp-1",
        assignedUserName: "John Smith",
        purchaseDate: new Date("2024-01-15"),
        purchaseCost: "2499.00",
        warrantyExpiry: new Date("2027-01-15"),
        specifications: { cpu: "M3 Pro", ram: "32GB", storage: "1TB SSD" },
        notes: "Primary development machine",
        vendorName: "Apple Inc.",
        vendorEmail: "business@apple.com",
        vendorPhone: "+1-800-275-2273",
        companyName: "Apple Inc.",
        companyGstNumber: "29AABCA1234D1Z5",
        tenantId: tenant.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "asset-2",
        name: "Dell OptiPlex 7090",
        type: "hardware",
        category: "desktop",
        manufacturer: "Dell",
        model: "OptiPlex 7090",
        serialNumber: "B9876543210",
        status: "in-stock",
        location: "Storage Room A",
        assignedUserId: null,
        assignedUserName: null,
        purchaseDate: new Date("2024-02-20"),
        purchaseCost: "899.00",
        warrantyExpiry: new Date("2027-02-20"),
        specifications: { cpu: "Intel i7", ram: "16GB", storage: "512GB SSD" },
        notes: "Backup desktop system",
        vendorName: "Dell Technologies",
        vendorEmail: "business@dell.com", 
        vendorPhone: "+1-800-289-3355",
        companyName: "Dell Technologies Inc.",
        companyGstNumber: "27AABCD1234E1Z6",
        tenantId: tenant.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleAssets.forEach(asset => this.assets.set(asset.id, asset));

    // Seed sample software licenses
    const sampleLicenses: SoftwareLicense[] = [
      {
        id: "license-1",
        name: "Adobe Creative Suite",
        vendor: "Adobe",
        version: "2024",
        licenseKey: "CS6-2024-PRO",
        licenseType: "subscription",
        totalLicenses: 50,
        usedLicenses: 27,
        costPerLicense: "52.99",
        renewalDate: new Date("2024-12-31"),
        notes: "Creative team subscription",
        tenantId: tenant.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "license-2",
        name: "Microsoft Office 365",
        vendor: "Microsoft",
        version: "365",
        licenseType: "subscription",
        totalLicenses: 100,
        usedLicenses: 87,
        licenseKey: "M365-CORP-LICENSE",
        costPerLicense: "12.50",
        renewalDate: new Date("2024-11-30"),
        notes: "Company-wide productivity suite",
        tenantId: tenant.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleLicenses.forEach(license => this.softwareLicenses.set(license.id, license));

    // Seed sample recommendations
    const sampleRecommendations: Recommendation[] = [
      {
        id: "rec-1",
        type: "downgrade",
        title: "Downgrade Opportunity",
        description: "15 workstations show low CPU utilization (<20%)",
        potentialSavings: "8200.00",
        priority: "medium",
        status: "pending",
        assetIds: ["asset-1", "asset-2"],
        generatedAt: new Date(),
        tenantId: tenant.id,
      },
      {
        id: "rec-2",
        type: "license-optimization",
        title: "License Over-allocation",
        description: "Adobe Creative Suite: 23 excess licenses detected",
        potentialSavings: "11500.00",
        priority: "high",
        status: "pending",
        assetIds: ["license-1"],
        generatedAt: new Date(),
        tenantId: tenant.id,
      },
      {
        id: "rec-3",
        type: "reallocation",
        title: "Asset Reallocation",
        description: "Move 8 high-spec laptops to development team",
        potentialSavings: "0.00",
        priority: "low",
        status: "pending",
        assetIds: ["asset-1"],
        generatedAt: new Date(),
        tenantId: tenant.id,
      },
    ];

    sampleRecommendations.forEach(rec => this.recommendations.set(rec.id, rec));
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "read-only",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // SECURITY: Only allow updating safe fields, prevent tenant/role manipulation
    const safeUpdate = {
      firstName: updateUser.firstName,
      lastName: updateUser.lastName,
      phone: updateUser.phone,
      department: updateUser.department,
      jobTitle: updateUser.jobTitle,
      manager: updateUser.manager,
      avatar: updateUser.avatar,
      lastLoginAt: updateUser.lastLoginAt,
      isActive: updateUser.isActive,
    };
    
    const updatedUser = { ...user, ...safeUpdate, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserProfile(userId: string, tenantId: string, profile: UpdateUserProfile): Promise<User | undefined> {
    const existingUser = this.users.get(userId);
    if (!existingUser || existingUser.tenantId !== tenantId) return undefined;
    
    const updatedUser = { 
      ...existingUser, 
      ...profile,
      updatedAt: new Date() 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(userId: string, tenantId: string, hashedPassword: string): Promise<boolean> {
    const existingUser = this.users.get(userId);
    if (!existingUser || existingUser.tenantId !== tenantId) return false;
    
    const updatedUser = { 
      ...existingUser, 
      password: hashedPassword,
      updatedAt: new Date() 
    };
    this.users.set(userId, updatedUser);
    return true;
  }

  // User Management
  async getTenantUsers(tenantId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.tenantId === tenantId);
  }

  async updateUserRole(userId: string, tenantId: string, role: UpdateUserRole): Promise<User | undefined> {
    const existingUser = this.users.get(userId);
    if (!existingUser || existingUser.tenantId !== tenantId) return undefined;
    
    const updatedUser = { 
      ...existingUser, 
      role: role.role,
      updatedAt: new Date() 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async deactivateUser(userId: string, tenantId: string): Promise<boolean> {
    const existingUser = this.users.get(userId);
    if (!existingUser || existingUser.tenantId !== tenantId) return false;
    
    const updatedUser = { 
      ...existingUser, 
      isActive: false,
      updatedAt: new Date() 
    };
    this.users.set(userId, updatedUser);
    return true;
  }

  async activateUser(userId: string, tenantId: string): Promise<boolean> {
    const existingUser = this.users.get(userId);
    if (!existingUser || existingUser.tenantId !== tenantId) return false;
    
    const updatedUser = { 
      ...existingUser, 
      isActive: true,
      updatedAt: new Date() 
    };
    this.users.set(userId, updatedUser);
    return true;
  }

  // User Invitations
  async createInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    const id = randomUUID();
    const token = randomUUID(); // Simple token generation
    
    const newInvitation: UserInvitation = {
      ...invitation,
      id,
      token,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.userInvitations.set(id, newInvitation);
    return newInvitation;
  }

  async getInvitation(token: string): Promise<UserInvitation | undefined> {
    return Array.from(this.userInvitations.values()).find(inv => inv.token === token);
  }

  async getInvitationByEmail(email: string, tenantId: string): Promise<UserInvitation | undefined> {
    return Array.from(this.userInvitations.values()).find(
      inv => inv.email === email && inv.tenantId === tenantId && inv.status === "pending"
    );
  }

  async getTenantInvitations(tenantId: string): Promise<UserInvitation[]> {
    return Array.from(this.userInvitations.values()).filter(inv => inv.tenantId === tenantId);
  }

  async updateInvitationStatus(token: string, status: "accepted" | "expired"): Promise<UserInvitation | undefined> {
    const invitation = await this.getInvitation(token);
    if (!invitation) return undefined;
    
    const updatedInvitation = {
      ...invitation,
      status,
      acceptedAt: status === "accepted" ? new Date() : invitation.acceptedAt,
      updatedAt: new Date(),
    };
    
    this.userInvitations.set(invitation.id, updatedInvitation);
    return updatedInvitation;
  }

  async acceptInvitation(token: string, password: string): Promise<{ user: User; invitation: UserInvitation } | undefined> {
    const invitation = await this.getInvitation(token);
    if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
      return undefined;
    }

    // Create the user account
    const hashedPassword = await hashPassword(password);
    const newUser = await this.createUser({
      username: invitation.email,
      email: invitation.email,
      password: hashedPassword,
      firstName: invitation.firstName || "",
      lastName: invitation.lastName || "",
      role: invitation.role,
      tenantId: invitation.tenantId,
      invitedBy: invitation.invitedBy,
    });

    // Update invitation status
    const updatedInvitation = await this.updateInvitationStatus(token, "accepted");
    
    if (!updatedInvitation) return undefined;
    
    return { user: newUser, invitation: updatedInvitation };
  }

  async getUserPreferences(userId: string, tenantId: string): Promise<UserPreferences | undefined> {
    const key = `${tenantId}:${userId}`;
    return this.userPreferences.get(key);
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const key = `${preferences.tenantId}:${preferences.userId}`;
    
    // Check if preferences already exist (enforce uniqueness)
    if (this.userPreferences.has(key)) {
      throw new Error("User preferences already exist");
    }
    
    const newPrefs: UserPreferences = {
      id: randomUUID(),
      ...preferences,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userPreferences.set(key, newPrefs);
    return newPrefs;
  }

  async updateUserPreferences(userId: string, tenantId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const key = `${tenantId}:${userId}`;
    const existingPrefs = this.userPreferences.get(key);
    
    if (!existingPrefs) return undefined;
    
    // SECURITY: Only allow updating preference fields, not identity fields
    const safeUpdate = {
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      aiRecommendationAlerts: preferences.aiRecommendationAlerts,
      weeklyReports: preferences.weeklyReports,
      assetExpiryAlerts: preferences.assetExpiryAlerts,
      theme: preferences.theme,
      language: preferences.language,
      timezone: preferences.timezone,
      dateFormat: preferences.dateFormat,
      dashboardLayout: preferences.dashboardLayout,
      itemsPerPage: preferences.itemsPerPage,
    };
    
    const updatedPrefs = {
      ...existingPrefs,
      ...safeUpdate,
      updatedAt: new Date()
    };
    
    this.userPreferences.set(key, updatedPrefs);
    return updatedPrefs;
  }

  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(tenant => tenant.slug === slug);
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const tenant: Tenant = {
      ...insertTenant,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.set(id, tenant);
    return tenant;
  }

  async updateTenantSettings(tenantId: string, settings: UpdateOrgSettings): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return undefined;
    
    // SECURITY: Only allow updating whitelisted organization settings
    const safeUpdate = {
      name: settings.name,
      timezone: settings.timezone,
      currency: settings.currency,
      dateFormat: settings.dateFormat,
      autoRecommendations: settings.autoRecommendations,
      dataRetentionDays: settings.dataRetentionDays,
    };
    
    const updatedTenant = { 
      ...tenant, 
      ...safeUpdate,
      updatedAt: new Date() 
    };
    this.tenants.set(tenantId, updatedTenant);
    return updatedTenant;
  }

  async getAuditLogs(tenantId: string, filters?: { action?: string; resourceType?: string; userId?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values())
      .filter(log => log.tenantId === tenantId);
    
    if (filters?.action) {
      logs = logs.filter(log => log.action === filters.action);
    }
    if (filters?.resourceType) {
      logs = logs.filter(log => log.resourceType === filters.resourceType);
    }
    if (filters?.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    
    // Sort by newest first
    logs = logs.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    return logs.slice(offset, offset + limit);
  }

  async logActivity(auditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = {
      ...auditLog,
      id,
      createdAt: new Date(),
    };
    this.auditLogs.set(id, log);
    return log;
  }

  // Assets
  async getAssets(tenantId: string, filters?: { type?: string; status?: string }): Promise<Asset[]> {
    let assets = Array.from(this.assets.values()).filter(asset => asset.tenantId === tenantId);
    
    if (filters?.type) {
      assets = assets.filter(asset => asset.type === filters.type);
    }
    if (filters?.status) {
      assets = assets.filter(asset => asset.status === filters.status);
    }
    
    return assets.sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
  }

  async getAsset(id: string, tenantId: string): Promise<Asset | undefined> {
    const asset = this.assets.get(id);
    return asset?.tenantId === tenantId ? asset : undefined;
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = randomUUID();
    const asset: Asset = {
      ...insertAsset,
      id,
      status: insertAsset.status || "in-stock",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets.set(id, asset);
    return asset;
  }

  async updateAsset(id: string, tenantId: string, updateAsset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const asset = this.assets.get(id);
    if (!asset || asset.tenantId !== tenantId) return undefined;
    
    const updatedAsset = { ...asset, ...updateAsset, updatedAt: new Date() };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }

  async deleteAsset(id: string, tenantId: string): Promise<boolean> {
    const asset = this.assets.get(id);
    if (!asset || asset.tenantId !== tenantId) return false;
    
    return this.assets.delete(id);
  }

  // Software Licenses
  async getSoftwareLicenses(tenantId: string): Promise<SoftwareLicense[]> {
    return Array.from(this.softwareLicenses.values())
      .filter(license => license.tenantId === tenantId)
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
  }

  async getSoftwareLicense(id: string, tenantId: string): Promise<SoftwareLicense | undefined> {
    const license = this.softwareLicenses.get(id);
    return license?.tenantId === tenantId ? license : undefined;
  }

  async createSoftwareLicense(insertLicense: InsertSoftwareLicense): Promise<SoftwareLicense> {
    const id = randomUUID();
    const license: SoftwareLicense = {
      ...insertLicense,
      id,
      version: insertLicense.version || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.softwareLicenses.set(id, license);
    return license;
  }

  async updateSoftwareLicense(id: string, tenantId: string, updateLicense: Partial<InsertSoftwareLicense>): Promise<SoftwareLicense | undefined> {
    const license = this.softwareLicenses.get(id);
    if (!license || license.tenantId !== tenantId) return undefined;
    
    const updatedLicense = { ...license, ...updateLicense, updatedAt: new Date() };
    this.softwareLicenses.set(id, updatedLicense);
    return updatedLicense;
  }

  // Asset Utilization
  async getAssetUtilization(assetId: string, tenantId: string, days: number = 30): Promise<AssetUtilization[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.assetUtilization.values())
      .filter(util => 
        util.assetId === assetId && 
        util.tenantId === tenantId &&
        new Date(util.recordedAt!) >= cutoffDate
      )
      .sort((a, b) => new Date(b.recordedAt!).getTime() - new Date(a.recordedAt!).getTime());
  }

  async recordAssetUtilization(insertUtilization: InsertAssetUtilization): Promise<AssetUtilization> {
    const id = randomUUID();
    const utilization: AssetUtilization = {
      ...insertUtilization,
      id,
      cpuUsage: insertUtilization.cpuUsage || null,
      ramUsage: insertUtilization.ramUsage || null,
      diskUsage: insertUtilization.diskUsage || null,
      networkUsage: insertUtilization.networkUsage || null,
      recordedAt: new Date(),
    };
    this.assetUtilization.set(id, utilization);
    return utilization;
  }

  // Recommendations
  async getRecommendations(tenantId: string, status?: string): Promise<Recommendation[]> {
    let recommendations = Array.from(this.recommendations.values())
      .filter(rec => rec.tenantId === tenantId);
    
    if (status) {
      recommendations = recommendations.filter(rec => rec.status === status);
    }
    
    return recommendations.sort((a, b) => new Date(b.generatedAt!).getTime() - new Date(a.generatedAt!).getTime());
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const id = randomUUID();
    const recommendation: Recommendation = {
      ...insertRecommendation,
      id,
      status: insertRecommendation.status || "pending",
      priority: insertRecommendation.priority || "medium",
      generatedAt: new Date(),
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  async updateRecommendation(id: string, tenantId: string, updateRecommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation || recommendation.tenantId !== tenantId) return undefined;
    
    const updatedRecommendation = { ...recommendation, ...updateRecommendation };
    this.recommendations.set(id, updatedRecommendation);
    return updatedRecommendation;
  }

  // Dashboard Metrics
  async getDashboardMetrics(tenantId: string): Promise<{
    totalAssets: number;
    activeLicenses: number;
    complianceScore: number;
    costSavings: number;
    assetStatusBreakdown: { status: string; count: number }[];
  }> {
    const assets = await this.getAssets(tenantId);
    const licenses = await this.getSoftwareLicenses(tenantId);
    const recommendations = await this.getRecommendations(tenantId, "accepted");

    const statusBreakdown = assets.reduce((acc, asset) => {
      const existing = acc.find(item => item.status === asset.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: asset.status, count: 1 });
      }
      return acc;
    }, [] as { status: string; count: number }[]);

    const activeLicenses = licenses.reduce((sum, license) => sum + license.usedLicenses, 0);
    const totalLicenses = licenses.reduce((sum, license) => sum + license.totalLicenses, 0);
    const complianceScore = totalLicenses > 0 ? Math.round((activeLicenses / totalLicenses) * 100) : 100;
    
    const costSavings = recommendations.reduce((sum, rec) => 
      sum + parseFloat(rec.potentialSavings || "0"), 0
    );

    return {
      totalAssets: assets.length,
      activeLicenses,
      complianceScore,
      costSavings,
      assetStatusBreakdown: statusBreakdown,
    };
  }

  // Master Data
  async getMasterData(tenantId: string, type: string, query?: string): Promise<MasterData[]> {
    let masterData = Array.from(this.masterData.values())
      .filter(data => data.tenantId === tenantId && data.type === type);
    
    if (query) {
      masterData = masterData.filter(data => 
        data.value.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return masterData.sort((a, b) => a.value.localeCompare(b.value));
  }

  async addMasterData(insertMasterData: InsertMasterData): Promise<MasterData> {
    const id = randomUUID();
    const masterData: MasterData = {
      ...insertMasterData,
      id,
      createdAt: new Date(),
    };
    this.masterData.set(id, masterData);
    return masterData;
  }

  async getDistinctFromAssets(tenantId: string, field: string): Promise<string[]> {
    const assets = await this.getAssets(tenantId);
    const values = new Set<string>();
    
    assets.forEach(asset => {
      const value = (asset as any)[field];
      if (value && typeof value === 'string') {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  }
}

export const storage = new MemStorage();
