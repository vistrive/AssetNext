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
  type AIResponse,
  type InsertAIResponse,
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
  type Ticket,
  type InsertTicket,
  type TicketComment,
  type InsertTicketComment,
  type TicketActivity,
  type InsertTicketActivity,
  type CreateTicket,
  type UpdateTicket,
  users,
  tenants,
  assets,
  softwareLicenses,
  assetUtilization,
  recommendations,
  aiResponses,
  masterData,
  userPreferences,
  auditLogs,
  userInvitations,
  tenantAdminLock,
  tickets,
  ticketComments,
  ticketActivities
} from "@shared/schema";
import { randomUUID } from "crypto";
import { hashPassword } from "./services/auth";
import { db } from "./db";
import { eq, and, or, desc, sql, ilike, isNotNull, ne } from "drizzle-orm";
import { normalizeEmail, normalizeName, generateNextUserID } from "@shared/utils";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string, tenantId?: string): Promise<User | undefined>;
  getUserByEmployeeId(employeeId: string, tenantId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserProfile(userId: string, tenantId: string, profile: UpdateUserProfile): Promise<User | undefined>;
  updateUserPassword(userId: string, tenantId: string, hashedPassword: string): Promise<boolean>;
  
  // User Management
  getTenantUsers(tenantId: string): Promise<User[]>;
  createFirstAdminUser(user: InsertUser, tenantId: string): Promise<{ success: boolean; user?: User; alreadyExists?: boolean }>;
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
  getTenantByName(name: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  updateOrgSettings(tenantId: string, settings: UpdateOrgSettings): Promise<Tenant | undefined>;
  
  // Backfill admin locks for existing tenants
  backfillTenantAdminLocks(): Promise<{ processed: number; locked: number; errors: number }>;

  // Assets
  getAllAssets(tenantId: string, filters?: { type?: string; status?: string; category?: string; search?: string }): Promise<Asset[]>;
  getAssetsByUserId(userId: string, tenantId: string): Promise<Asset[]>;
  getAssetsByUserEmployeeId(employeeId: string, tenantId: string): Promise<Asset[]>;
  getAsset(id: string, tenantId: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  createAssetsBulk(assets: InsertAsset[]): Promise<Asset[]>;
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
  
  // AI Responses
  createAIResponse(response: InsertAIResponse): Promise<AIResponse>;
  getAIResponse(id: string, tenantId: string): Promise<AIResponse | undefined>;

  // Master Data
  getMasterData(tenantId: string, type?: string): Promise<MasterData[]>;
  addMasterData(masterData: InsertMasterData): Promise<MasterData>;
  getDistinctFromAssets(tenantId: string, field: string): Promise<{ value: string }[]>;

  // Audit Logs
  logActivity(activity: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(tenantId: string): Promise<AuditLog[]>;

  // Tickets
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTicket(id: string, tenantId: string): Promise<Ticket | undefined>;
  getAllTickets(tenantId: string): Promise<Ticket[]>;
  getTicketsByAssignee(assignedToId: string, tenantId: string): Promise<Ticket[]>;
  getTicketsByRequestor(requestorId: string, tenantId: string): Promise<Ticket[]>;
  updateTicket(id: string, tenantId: string, ticket: UpdateTicket): Promise<Ticket | undefined>;
  assignTicket(id: string, tenantId: string, assignedToId: string, assignedToName: string, assignedById: string, assignedByName: string): Promise<Ticket | undefined>;
  updateTicketStatus(id: string, tenantId: string, status: string, resolution?: string, resolutionNotes?: string): Promise<Ticket | undefined>;
  deleteTicket(id: string, tenantId: string): Promise<boolean>;

  // Ticket Comments
  addTicketComment(comment: InsertTicketComment): Promise<TicketComment>;
  getTicketComments(ticketId: string, tenantId: string): Promise<TicketComment[]>;
  updateTicketComment(id: string, tenantId: string, content: string): Promise<TicketComment | undefined>;
  deleteTicketComment(id: string, tenantId: string): Promise<boolean>;

  // Ticket Activities
  logTicketActivity(activity: InsertTicketActivity): Promise<TicketActivity>;
  getTicketActivities(ticketId: string, tenantId: string): Promise<TicketActivity[]>;
  
  // Dashboard Metrics
  getDashboardMetrics(tenantId: string): Promise<any>;
  
  // Global Search
  performGlobalSearch(tenantId: string, query: string, searchType?: string, userRole?: string, limit?: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string, tenantId?: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase();
    const whereCondition = tenantId 
      ? and(eq(users.email, normalizedEmail), eq(users.tenantId, tenantId))
      : eq(users.email, normalizedEmail);
    const [user] = await db.select().from(users).where(whereCondition);
    return user || undefined;
  }

  async getUserByEmployeeId(employeeId: string, tenantId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.userID, parseInt(employeeId)), eq(users.tenantId, tenantId))
    );
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Get existing user IDs to generate the next unique numeric ID
    const existingUsers = await db.select({ userID: users.userID })
      .from(users)
      .where(eq(users.tenantId, user.tenantId))
      .orderBy(desc(users.userID));
    
    const existingUserIDs = existingUsers.map(u => u.userID).filter(id => id !== null);
    const nextUserID = generateNextUserID(existingUserIDs);
    
    // Normalize user data
    const normalizedUser = {
      ...user,
      userID: nextUserID,
      email: normalizeEmail(user.email),
      firstName: normalizeName(user.firstName),
      lastName: normalizeName(user.lastName)
    };
    
    const [newUser] = await db.insert(users).values(normalizedUser).returning();
    return newUser;
  }

  // Migration function to assign userID values to existing users
  async migrateExistingUsersWithUserIDs(): Promise<void> {
    console.log("Migrating existing users to add userID values...");
    
    // Get all users without userID values
    const usersWithoutUserID = await db.select()
      .from(users)
      .where(eq(users.userID, sql`NULL`))
      .orderBy(users.createdAt);
    
    if (usersWithoutUserID.length === 0) {
      console.log("All users already have userID values.");
      return;
    }
    
    // Group by tenant to assign sequential IDs per tenant
    const usersByTenant = usersWithoutUserID.reduce((acc, user) => {
      if (!acc[user.tenantId]) {
        acc[user.tenantId] = [];
      }
      acc[user.tenantId].push(user);
      return acc;
    }, {} as Record<string, typeof usersWithoutUserID>);
    
    for (const [tenantId, tenantUsers] of Object.entries(usersByTenant)) {
      console.log(`Processing ${tenantUsers.length} users for tenant ${tenantId}`);
      
      // Get existing user IDs for this tenant
      const existingUsers = await db.select({ userID: users.userID })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), isNotNull(users.userID)))
        .orderBy(desc(users.userID));
      
      const existingUserIDs = existingUsers.map(u => u.userID).filter(id => id !== null);
      let nextUserID = generateNextUserID(existingUserIDs);
      
      // Update each user with a unique userID
      for (const user of tenantUsers) {
        await db.update(users)
          .set({
            userID: nextUserID,
            email: normalizeEmail(user.email),
            firstName: normalizeName(user.firstName),
            lastName: normalizeName(user.lastName)
          })
          .where(eq(users.id, user.id));
        
        console.log(`Assigned userID ${nextUserID} to user ${user.email}`);
        nextUserID++;
      }
    }
    
    console.log("Migration completed successfully.");
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

  async createFirstAdminUser(user: InsertUser, tenantId: string): Promise<{ success: boolean; user?: User; alreadyExists?: boolean }> {
    try {
      return await db.transaction(async (tx) => {
        // Atomic first-admin protection: Try to claim the lock for this tenant
        try {
          await tx.insert(tenantAdminLock).values({ tenantId });
        } catch (lockError: any) {
          // If insert fails due to unique constraint violation, admin already exists
          if (lockError.code === "23505" || lockError.message?.includes("UNIQUE constraint failed") || lockError.message?.includes("duplicate key")) {
            return { 
              success: false, 
              alreadyExists: true 
            };
          }
          // Re-throw unexpected errors
          throw lockError;
        }

        // Successfully claimed the lock, now create the first admin user
        const userData = {
          ...user,
          role: "super-admin", // Force super-admin role for first user
          tenantId: tenantId,
        };

        const [newUser] = await tx.insert(users).values(userData).returning();
        
        return { 
          success: true, 
          user: newUser, 
          alreadyExists: false 
        };
      });
    } catch (error) {
      console.error("Error creating first admin user:", error);
      return { 
        success: false, 
        alreadyExists: false 
      };
    }
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

  async cancelInvitation(invitationId: string, tenantId: string): Promise<UserInvitation | undefined> {
    const [deletedInvitation] = await db
      .delete(userInvitations)
      .where(and(eq(userInvitations.id, invitationId), eq(userInvitations.tenantId, tenantId)))
      .returning();
    return deletedInvitation || undefined;
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

  async getTenantByName(name: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(ilike(tenants.name, name));
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

  // Get tenant by support email address for external ticket routing
  async getTenantBySupportEmail(supportEmail: string): Promise<Tenant | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.supportEmail, supportEmail.toLowerCase()));
    
    return tenant;
  }

  // NOTE: getDefaultTenantForExternalTickets removed for security - no default fallback allowed

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

  async backfillTenantAdminLocks(): Promise<{ processed: number; locked: number; errors: number }> {
    let processed = 0;
    let locked = 0;
    let errors = 0;

    try {
      // Get all tenants that have users
      const tenantsWithUsers = await db
        .select({ tenantId: users.tenantId })
        .from(users)
        .groupBy(users.tenantId);

      console.log(`Found ${tenantsWithUsers.length} tenants with users to backfill`);

      for (const tenant of tenantsWithUsers) {
        processed++;
        try {
          // Try to insert admin lock (idempotent - ignore if already exists)
          await db.insert(tenantAdminLock).values({ 
            tenantId: tenant.tenantId 
          });
          locked++;
          console.log(`Created admin lock for tenant: ${tenant.tenantId}`);
        } catch (error: any) {
          // Ignore unique constraint violations (lock already exists)
          if (error.code === "23505" || error.message?.includes("UNIQUE constraint failed") || error.message?.includes("duplicate key")) {
            console.log(`Admin lock already exists for tenant: ${tenant.tenantId}`);
          } else {
            errors++;
            console.error(`Error creating admin lock for tenant ${tenant.tenantId}:`, error);
          }
        }
      }

      return { processed, locked, errors };
    } catch (error) {
      console.error("Error during tenant admin lock backfill:", error);
      return { processed, locked, errors };
    }
  }

  // Assets
  async getAllAssets(tenantId: string, filters?: { type?: string; status?: string; category?: string; search?: string }): Promise<Asset[]> {
    const conditions = [eq(assets.tenantId, tenantId)];
    
    if (filters?.type) {
      conditions.push(eq(assets.type, filters.type));
    }
    
    if (filters?.status) {
      conditions.push(eq(assets.status, filters.status));
    }
    
    if (filters?.category) {
      conditions.push(eq(assets.category, filters.category));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        sql`(
          ${assets.name} ILIKE ${searchTerm} OR
          ${assets.serialNumber} ILIKE ${searchTerm} OR
          ${assets.manufacturer} ILIKE ${searchTerm} OR
          ${assets.model} ILIKE ${searchTerm} OR
          ${assets.vendorName} ILIKE ${searchTerm} OR
          ${assets.companyName} ILIKE ${searchTerm} OR
          ${assets.location} ILIKE ${searchTerm} OR
          ${assets.assignedUserName} ILIKE ${searchTerm} OR
          ${assets.status} ILIKE ${searchTerm} OR
          ${assets.type} ILIKE ${searchTerm} OR
          ${assets.category} ILIKE ${searchTerm} OR
          CAST(${assets.purchaseCost} AS TEXT) ILIKE ${searchTerm}
        )`
      );
    }
    
    return await db.select().from(assets).where(and(...conditions));
  }

  async getAssetsByUserId(userId: string, tenantId: string): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(and(eq(assets.assignedUserId, userId), eq(assets.tenantId, tenantId)));
  }

  async getAssetsByUserEmployeeId(employeeId: string, tenantId: string): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(and(eq(assets.assignedUserEmployeeId, employeeId), eq(assets.tenantId, tenantId)));
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

  async createAssetsBulk(assetList: InsertAsset[]): Promise<Asset[]> {
    if (assetList.length === 0) {
      return [];
    }
    
    return await db.transaction(async (tx) => {
      const newAssets = await tx.insert(assets).values(assetList).returning();
      return newAssets;
    });
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

  async createAIResponse(response: InsertAIResponse): Promise<AIResponse> {
    const [newResponse] = await db.insert(aiResponses).values(response).returning();
    return newResponse;
  }

  async getAIResponse(id: string, tenantId: string): Promise<AIResponse | undefined> {
    const response = await db
      .select()
      .from(aiResponses)
      .where(and(eq(aiResponses.id, id), eq(aiResponses.tenantId, tenantId)))
      .limit(1);
    return response[0] || undefined;
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

  // Tickets
  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    return await db.transaction(async (tx) => {
      let ticketNumber: string;
      let attempts = 0;
      const maxAttempts = 5;

      // Generate unique ticket number with retry logic
      while (attempts < maxAttempts) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        ticketNumber = `TKT-${timestamp}-${random}`;
        
        try {
          const [newTicket] = await tx
            .insert(tickets)
            .values({
              ...ticket,
              ticketNumber,
            })
            .returning();

          // Log creation activity
          await tx.insert(ticketActivities).values({
            ticketId: newTicket.id,
            activityType: "created",
            description: `Ticket created by ${ticket.requestorName}`,
            actorId: ticket.requestorId,
            actorName: ticket.requestorName,
            actorRole: "employee",
            tenantId: ticket.tenantId,
          });

          return newTicket;
        } catch (error: any) {
          if (error.code === '23505' && error.constraint?.includes('ticket_number')) {
            // Unique constraint violation on ticket number, retry
            attempts++;
            if (attempts >= maxAttempts) {
              throw new Error("Failed to generate unique ticket number after multiple attempts");
            }
            continue;
          }
          throw error;
        }
      }
      
      throw new Error("Failed to create ticket");
    });
  }

  async getTicket(id: string, tenantId: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
    
    return ticket;
  }

  async getAllTickets(tenantId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.tenantId, tenantId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketsByAssignee(assignedToId: string, tenantId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.assignedToId, assignedToId), eq(tickets.tenantId, tenantId)))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketsByRequestor(requestorId: string, tenantId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.requestorId, requestorId), eq(tickets.tenantId, tenantId)))
      .orderBy(desc(tickets.createdAt));
  }

  async updateTicket(id: string, tenantId: string, ticket: UpdateTicket): Promise<Ticket | undefined> {
    return await db.transaction(async (tx) => {
      // Verify ticket exists and belongs to tenant
      const [existingTicket] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
      
      if (!existingTicket) {
        throw new Error("Ticket not found or access denied");
      }

      const [updatedTicket] = await tx
        .update(tickets)
        .set({ ...ticket, updatedAt: new Date() })
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
        .returning();

      // Log activity for field updates
      if (Object.keys(ticket).length > 0) {
        await tx.insert(ticketActivities).values({
          ticketId: id,
          activityType: "updated",
          description: `Ticket details updated`,
          actorId: existingTicket.requestorId, // Default to requestor, should be passed from route
          actorName: existingTicket.requestorName,
          actorRole: "employee",
          tenantId: existingTicket.tenantId, // Use ticket's tenantId, not payload
        });
      }
      
      return updatedTicket;
    });
  }

  async assignTicket(
    id: string, 
    tenantId: string, 
    assignedToId: string, 
    assignedToName: string, 
    assignedById: string, 
    assignedByName: string
  ): Promise<Ticket | undefined> {
    return await db.transaction(async (tx) => {
      // Verify ticket exists and belongs to tenant
      const [existingTicket] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
      
      if (!existingTicket) {
        throw new Error("Ticket not found or access denied");
      }

      const [updatedTicket] = await tx
        .update(tickets)
        .set({
          assignedToId,
          assignedToName,
          assignedById,
          assignedByName,
          assignedAt: new Date(),
          status: "in-progress",
          updatedAt: new Date(),
        })
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
        .returning();

      // Log activity
      await tx.insert(ticketActivities).values({
        ticketId: id,
        activityType: "assigned",
        description: `Ticket assigned to ${assignedToName} by ${assignedByName}`,
        actorId: assignedById,
        actorName: assignedByName,
        actorRole: "admin", // Assuming admin assigns tickets
        tenantId,
      });
      
      return updatedTicket;
    });
  }

  async updateTicketStatus(
    id: string, 
    tenantId: string, 
    status: string, 
    resolution?: string, 
    resolutionNotes?: string
  ): Promise<Ticket | undefined> {
    return await db.transaction(async (tx) => {
      // Verify ticket exists and belongs to tenant
      const [existingTicket] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
      
      if (!existingTicket) {
        throw new Error("Ticket not found or access denied");
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === "resolved") {
        updateData.resolvedAt = new Date();
        if (resolution) updateData.resolution = resolution;
        if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
      } else if (status === "closed") {
        updateData.closedAt = new Date();
      }

      const [updatedTicket] = await tx
        .update(tickets)
        .set(updateData)
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
        .returning();

      // Log activity
      await tx.insert(ticketActivities).values({
        ticketId: id,
        activityType: "status_changed",
        description: `Ticket status changed to ${status}`,
        actorId: existingTicket.assignedToId || existingTicket.requestorId,
        actorName: existingTicket.assignedToName || existingTicket.requestorName,
        actorRole: existingTicket.assignedToId ? "technician" : "employee",
        tenantId,
      });
      
      return updatedTicket;
    });
  }

  async deleteTicket(id: string, tenantId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Verify ticket exists and belongs to tenant
      const [existingTicket] = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
      
      if (!existingTicket) {
        return false; // Ticket not found or access denied
      }

      // Delete dependent records first (activities and comments)
      await tx
        .delete(ticketActivities)
        .where(and(eq(ticketActivities.ticketId, id), eq(ticketActivities.tenantId, tenantId)));

      await tx
        .delete(ticketComments)
        .where(and(eq(ticketComments.ticketId, id), eq(ticketComments.tenantId, tenantId)));

      // Delete the ticket
      const result = await tx
        .delete(tickets)
        .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  // Ticket Comments
  async addTicketComment(comment: InsertTicketComment): Promise<TicketComment> {
    return await db.transaction(async (tx) => {
      // Verify ticket exists and belongs to the same tenant
      const [ticket] = await tx
        .select({ tenantId: tickets.tenantId })
        .from(tickets)
        .where(and(eq(tickets.id, comment.ticketId), eq(tickets.tenantId, comment.tenantId)));
      
      if (!ticket) {
        throw new Error("Ticket not found or access denied");
      }

      // Use ticket's tenantId, not payload tenantId
      const [newComment] = await tx
        .insert(ticketComments)
        .values({ ...comment, tenantId: ticket.tenantId })
        .returning();

      // Log activity with verified tenantId
      await tx.insert(ticketActivities).values({
        ticketId: comment.ticketId,
        activityType: "commented",
        description: `${comment.authorName} added a comment`,
        actorId: comment.authorId,
        actorName: comment.authorName,
        actorRole: comment.authorRole,
        tenantId: ticket.tenantId, // Use verified tenantId
      });

      return newComment;
    });
  }

  async getTicketComments(ticketId: string, tenantId: string): Promise<TicketComment[]> {
    return await db
      .select()
      .from(ticketComments)
      .where(and(eq(ticketComments.ticketId, ticketId), eq(ticketComments.tenantId, tenantId)))
      .orderBy(ticketComments.createdAt);
  }

  async updateTicketComment(id: string, tenantId: string, content: string): Promise<TicketComment | undefined> {
    return await db.transaction(async (tx) => {
      // Verify comment exists and belongs to tenant
      const [existingComment] = await tx
        .select({ ticketId: ticketComments.ticketId })
        .from(ticketComments)
        .where(and(eq(ticketComments.id, id), eq(ticketComments.tenantId, tenantId)));
      
      if (!existingComment) {
        throw new Error("Comment not found or access denied");
      }

      // Verify the associated ticket belongs to the same tenant
      const [ticket] = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(and(eq(tickets.id, existingComment.ticketId), eq(tickets.tenantId, tenantId)));
      
      if (!ticket) {
        throw new Error("Associated ticket not found or access denied");
      }

      const [updatedComment] = await tx
        .update(ticketComments)
        .set({ content })
        .where(and(eq(ticketComments.id, id), eq(ticketComments.tenantId, tenantId)))
        .returning();
      
      return updatedComment;
    });
  }

  async deleteTicketComment(id: string, tenantId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Verify comment exists and belongs to tenant
      const [existingComment] = await tx
        .select({ ticketId: ticketComments.ticketId })
        .from(ticketComments)
        .where(and(eq(ticketComments.id, id), eq(ticketComments.tenantId, tenantId)));
      
      if (!existingComment) {
        return false; // Comment not found or access denied
      }

      // Verify the associated ticket belongs to the same tenant
      const [ticket] = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(and(eq(tickets.id, existingComment.ticketId), eq(tickets.tenantId, tenantId)));
      
      if (!ticket) {
        return false; // Associated ticket not found or access denied
      }

      const result = await tx
        .delete(ticketComments)
        .where(and(eq(ticketComments.id, id), eq(ticketComments.tenantId, tenantId)));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  // Ticket Activities
  async logTicketActivity(activity: InsertTicketActivity): Promise<TicketActivity> {
    return await db.transaction(async (tx) => {
      // Verify ticket exists and belongs to the same tenant
      const [ticket] = await tx
        .select({ tenantId: tickets.tenantId })
        .from(tickets)
        .where(and(eq(tickets.id, activity.ticketId), eq(tickets.tenantId, activity.tenantId)));
      
      if (!ticket) {
        throw new Error("Ticket not found or access denied");
      }

      // Use ticket's tenantId, not payload tenantId
      const [newActivity] = await tx
        .insert(ticketActivities)
        .values({ ...activity, tenantId: ticket.tenantId })
        .returning();

      return newActivity;
    });
  }

  async getTicketActivities(ticketId: string, tenantId: string): Promise<TicketActivity[]> {
    return await db
      .select()
      .from(ticketActivities)
      .where(and(eq(ticketActivities.ticketId, ticketId), eq(ticketActivities.tenantId, tenantId)))
      .orderBy(ticketActivities.createdAt);
  }

  // Helper function to calculate time ago
  private getTimeAgo(date: Date | null): string {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return new Date(date).toLocaleDateString();
  }

  // Asset Age Analysis
  private async getAssetAgeAnalysis(tenantId: string) {
    try {
      const now = new Date();
      const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

      // Get assets older than 3 years (replacement candidates) - excluding software
      const assetsOlderThan3Years = await db
        .select({
          id: assets.id,
          name: assets.name,
          category: assets.category,
          manufacturer: assets.manufacturer,
          model: assets.model,
          purchaseDate: assets.purchaseDate,
          purchaseCost: assets.purchaseCost,
          location: assets.location,
          assignedUserName: assets.assignedUserName,
          status: assets.status
        })
        .from(assets)
        .where(and(
          eq(assets.tenantId, tenantId),
          ne(assets.type, 'Software'),
          sql`purchase_date IS NOT NULL`,
          sql`purchase_date <= ${threeYearsAgo}`
        ))
        .orderBy(assets.purchaseDate)
        .limit(20);

      // Get assets older than 5 years (critical replacement) - excluding software
      const assetsOlderThan5Years = await db
        .select({
          id: assets.id,
          name: assets.name,
          category: assets.category,
          manufacturer: assets.manufacturer,
          model: assets.model,
          purchaseDate: assets.purchaseDate,
          purchaseCost: assets.purchaseCost,
          location: assets.location,
          assignedUserName: assets.assignedUserName,
          status: assets.status
        })
        .from(assets)
        .where(and(
          eq(assets.tenantId, tenantId),
          ne(assets.type, 'Software'),
          sql`purchase_date IS NOT NULL`,
          sql`purchase_date <= ${fiveYearsAgo}`
        ))
        .orderBy(assets.purchaseDate)
        .limit(20);

      // Calculate age distribution - excluding software
      const ageDistribution = await db
        .select({
          ageCategory: sql<string>`
            CASE 
              WHEN purchase_date IS NULL THEN 'unknown'
              WHEN purchase_date > ${threeYearsAgo} THEN 'new'
              WHEN purchase_date > ${fiveYearsAgo} THEN 'aging'
              ELSE 'old'
            END
          `,
          count: sql<number>`COUNT(*)`
        })
        .from(assets)
        .where(and(
          eq(assets.tenantId, tenantId),
          ne(assets.type, 'Software')
        ))
        .groupBy(sql`1`);

      // Calculate replacement cost estimates
      const replacementCosts = {
        threeYearOld: assetsOlderThan3Years.reduce((sum, asset) => sum + (Number(asset.purchaseCost) || 0), 0),
        fiveYearOld: assetsOlderThan5Years.reduce((sum, asset) => sum + (Number(asset.purchaseCost) || 0), 0)
      };

      return {
        replacementCandidates: {
          threeYearOld: assetsOlderThan3Years.map(asset => ({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            manufacturer: asset.manufacturer,
            model: asset.model,
            purchaseDate: asset.purchaseDate,
            age: this.calculateAssetAge(asset.purchaseDate),
            purchaseCost: asset.purchaseCost,
            location: asset.location,
            assignedUser: asset.assignedUserName,
            status: asset.status,
            replacementUrgency: 'moderate'
          })),
          fiveYearOld: assetsOlderThan5Years.map(asset => ({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            manufacturer: asset.manufacturer,
            model: asset.model,
            purchaseDate: asset.purchaseDate,
            age: this.calculateAssetAge(asset.purchaseDate),
            purchaseCost: asset.purchaseCost,
            location: asset.location,
            assignedUser: asset.assignedUserName,
            status: asset.status,
            replacementUrgency: 'high'
          }))
        },
        ageDistribution: ageDistribution.reduce((acc, item) => {
          acc[item.ageCategory] = Number(item.count);
          return acc;
        }, {} as Record<string, number>),
        replacementCosts,
        summary: {
          totalAssetsNeedingReplacement: assetsOlderThan3Years.length,
          criticalReplacementAssets: assetsOlderThan5Years.length,
          estimatedReplacementCost: replacementCosts.threeYearOld,
          averageAssetAge: await this.getAverageAssetAge(tenantId)
        }
      };
    } catch (error) {
      console.error('Error analyzing asset age:', error);
      return {
        replacementCandidates: { threeYearOld: [], fiveYearOld: [] },
        ageDistribution: {},
        replacementCosts: { threeYearOld: 0, fiveYearOld: 0 },
        summary: {
          totalAssetsNeedingReplacement: 0,
          criticalReplacementAssets: 0,
          estimatedReplacementCost: 0,
          averageAssetAge: 0
        }
      };
    }
  }

  private calculateAssetAge(purchaseDate: Date | null): string {
    if (!purchaseDate) return 'Unknown';
    
    const now = new Date();
    const ageInYears = now.getFullYear() - purchaseDate.getFullYear();
    const monthDiff = now.getMonth() - purchaseDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < purchaseDate.getDate())) {
      return `${ageInYears - 1}.${Math.abs(12 + monthDiff)} years`;
    }
    
    return `${ageInYears}.${monthDiff} years`;
  }

  private async getAverageAssetAge(tenantId: string): Promise<number> {
    try {
      const result = await db
        .select({
          avgYears: sql<number>`
            AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, purchase_date))) 
          `
        })
        .from(assets)
        .where(and(
          eq(assets.tenantId, tenantId),
          sql`purchase_date IS NOT NULL`
        ));

      return Number(result[0]?.avgYears) || 0;
    } catch (error) {
      console.error('Error calculating average asset age:', error);
      return 0;
    }
  }

  // Dashboard Metrics
  async getDashboardMetrics(tenantId: string): Promise<any> {
    try {
      // Get overall asset counts by type
      const assetTypesCounts = await db
        .select({
          type: assets.type,
          total: sql<number>`count(*)`,
          deployed: sql<number>`count(*) filter (where status = 'deployed')`,
          inStock: sql<number>`count(*) filter (where status = 'in-stock')`,
          inRepair: sql<number>`count(*) filter (where status = 'in-repair')`,
          disposed: sql<number>`count(*) filter (where status = 'disposed')`
        })
        .from(assets)
        .where(eq(assets.tenantId, tenantId))
        .groupBy(assets.type);

      // Get hardware breakdown by category
      const hardwareCounts = await db
        .select({
          category: assets.category,
          total: sql<number>`count(*)`,
          deployed: sql<number>`count(*) filter (where status = 'deployed')`,
          inStock: sql<number>`count(*) filter (where status = 'in-stock')`,
          inRepair: sql<number>`count(*) filter (where status = 'in-repair')`
        })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.type, 'hardware')))
        .groupBy(assets.category);

      // Get hardware warranty/AMC status
      const hardwareWarrantyStatus = await db
        .select({
          total: sql<number>`count(*)`,
          warrantyExpiring: sql<number>`count(*) filter (where warranty_expiry IS NOT NULL AND warranty_expiry <= current_date + interval '30 days' and warranty_expiry > current_date)`,
          warrantyExpired: sql<number>`count(*) filter (where warranty_expiry IS NOT NULL AND warranty_expiry <= current_date)`,
          amcDue: sql<number>`count(*) filter (where amc_expiry IS NOT NULL AND amc_expiry <= current_date + interval '30 days' and amc_expiry > current_date)`,
          amcExpired: sql<number>`count(*) filter (where amc_expiry IS NOT NULL AND amc_expiry <= current_date)`
        })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.type, 'Hardware')));

      // Get software license status
      const softwareStatus = await db
        .select({
          total: sql<number>`count(*)`,
          assigned: sql<number>`sum(COALESCE(used_licenses, 0))`,
          totalLicenses: sql<number>`sum(COALESCE(total_licenses, 0))`,
          renewalDue: sql<number>`count(*) filter (where renewal_date IS NOT NULL AND renewal_date <= current_date + interval '30 days' and renewal_date > current_date)`,
          expired: sql<number>`count(*) filter (where renewal_date IS NOT NULL AND renewal_date <= current_date)`
        })
        .from(softwareLicenses)
        .where(eq(softwareLicenses.tenantId, tenantId));

      // Get peripheral breakdown by category
      const peripheralCounts = await db
        .select({
          category: assets.category,
          total: sql<number>`count(*)`,
          deployed: sql<number>`count(*) filter (where status = 'deployed')`,
          inStock: sql<number>`count(*) filter (where status = 'in-stock')`,
          inRepair: sql<number>`count(*) filter (where status = 'in-repair')`
        })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.type, 'Peripherals')))
        .groupBy(assets.category);

      // Get "Others" type assets breakdown by category
      const othersCounts = await db
        .select({
          type: assets.type,
          category: assets.category,
          total: sql<number>`count(*)`,
          deployed: sql<number>`count(*) filter (where status = 'deployed')`,
          inStock: sql<number>`count(*) filter (where status = 'in-stock')`,
          inRepair: sql<number>`count(*) filter (where status = 'in-repair')`
        })
        .from(assets)
        .where(and(eq(assets.tenantId, tenantId), eq(assets.type, 'Others')))
        .groupBy(assets.type, assets.category);

      // Get ticket counts
      const ticketCounts = await db
        .select({
          total: sql<number>`count(*)`,
          open: sql<number>`count(*) filter (where status = 'open')`,
          inProgress: sql<number>`count(*) filter (where status = 'in-progress')`,
          resolved: sql<number>`count(*) filter (where status = 'resolved')`,
          closed: sql<number>`count(*) filter (where status = 'closed')`
        })
        .from(tickets)
        .where(eq(tickets.tenantId, tenantId));

      // NEW: Get detailed unused hardware assets (in-stock status)
      const unusedHardwareAssets = await db
        .select({
          id: assets.id,
          name: assets.name,
          category: assets.category,
          manufacturer: assets.manufacturer,
          model: assets.model,
          purchaseDate: assets.purchaseDate,
          purchaseCost: assets.purchaseCost,
          location: assets.location
        })
        .from(assets)
        .where(and(
          eq(assets.tenantId, tenantId),
          eq(assets.type, 'Hardware'),
          eq(assets.status, 'in-stock')
        ))
        .limit(10);

      // NEW: Get detailed unused software licenses
      const unusedSoftwareLicenses = await db
        .select({
          id: softwareLicenses.id,
          name: softwareLicenses.name,
          vendor: softwareLicenses.vendor,
          version: softwareLicenses.version,
          totalLicenses: softwareLicenses.totalLicenses,
          usedLicenses: softwareLicenses.usedLicenses,
          costPerLicense: softwareLicenses.costPerLicense,
          renewalDate: softwareLicenses.renewalDate
        })
        .from(softwareLicenses)
        .where(and(
          eq(softwareLicenses.tenantId, tenantId),
          sql`${softwareLicenses.usedLicenses} < ${softwareLicenses.totalLicenses}`
        ))
        .limit(10);

      // NEW: Get detailed expiring assets (warranties within 30 days) - using JS date for portability
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const today = new Date();

      const expiringWarranties = await db
        .select({
          id: assets.id,
          name: assets.name,
          category: assets.category,
          manufacturer: assets.manufacturer,
          model: assets.model,
          serialNumber: assets.serialNumber,
          purchaseDate: assets.purchaseDate,
          warrantyExpiry: assets.warrantyExpiry,
          amcExpiry: assets.amcExpiry,
          location: assets.location,
          assignedUserName: assets.assignedUserName
        })
        .from(assets)
        .where(and(
          eq(assets.tenantId, tenantId),
          or(
            and(
              sql`warranty_expiry IS NOT NULL`,
              sql`warranty_expiry <= ${thirtyDaysFromNow}`,
              sql`warranty_expiry >= ${today}`
            ),
            and(
              sql`amc_expiry IS NOT NULL`,
              sql`amc_expiry <= ${thirtyDaysFromNow}`,
              sql`amc_expiry >= ${today}`
            )
          )
        ))
        .orderBy(sql`COALESCE(warranty_expiry, amc_expiry)`)
        .limit(10);

      // NEW: Get detailed expiring software licenses - using JS date for portability
      const expiringSoftwareLicenses = await db
        .select({
          id: softwareLicenses.id,
          name: softwareLicenses.name,
          vendor: softwareLicenses.vendor,
          version: softwareLicenses.version,
          licenseKey: softwareLicenses.licenseKey,
          createdAt: softwareLicenses.createdAt,
          renewalDate: softwareLicenses.renewalDate,
          totalLicenses: softwareLicenses.totalLicenses,
          costPerLicense: softwareLicenses.costPerLicense
        })
        .from(softwareLicenses)
        .where(and(
          eq(softwareLicenses.tenantId, tenantId),
          sql`renewal_date IS NOT NULL`,
          sql`renewal_date <= ${thirtyDaysFromNow}`,
          sql`renewal_date >= ${today}`
        ))
        .orderBy(softwareLicenses.renewalDate)
        .limit(10);

      // NEW: Get recent activity logs
      const recentActivities = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          userEmail: auditLogs.userEmail,
          userRole: auditLogs.userRole,
          description: auditLogs.description,
          createdAt: auditLogs.createdAt
        })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(sql`created_at DESC`)
        .limit(10);

      // Process results
      const assetsByType = assetTypesCounts.reduce((acc: any, item) => {
        acc[item.type] = {
          total: Number(item.total),
          deployed: Number(item.deployed),
          inStock: Number(item.inStock),
          inRepair: Number(item.inRepair),
          disposed: Number(item.disposed)
        };
        return acc;
      }, {});

      const hardwareBreakdown = hardwareCounts.reduce((acc: any, item) => {
        if (item.category) {
          acc[item.category] = {
            total: Number(item.total),
            deployed: Number(item.deployed),
            inStock: Number(item.inStock),
            inRepair: Number(item.inRepair)
          };
        }
        return acc;
      }, {});

      const peripheralBreakdown = peripheralCounts.reduce((acc: any, item) => {
        if (item.category) {
          acc[item.category] = {
            total: Number(item.total),
            deployed: Number(item.deployed),
            inStock: Number(item.inStock),
            inRepair: Number(item.inRepair)
          };
        }
        return acc;
      }, {});

      const othersBreakdown = othersCounts.reduce((acc: any, item) => {
        if (item.category) {
          acc[item.category] = {
            total: Number(item.total),
            deployed: Number(item.deployed),
            inStock: Number(item.inStock),
            inRepair: Number(item.inRepair),
            type: item.type
          };
        }
        return acc;
      }, {});

      const warrantyStatus = hardwareWarrantyStatus[0] || { 
        total: 0, warrantyExpiring: 0, warrantyExpired: 0, amcDue: 0, amcExpired: 0 
      };

      const licenseStatus = softwareStatus[0] || { 
        total: 0, assigned: 0, totalLicenses: 0, renewalDue: 0, expired: 0 
      };

      const ticketStats = ticketCounts[0] || { 
        total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 
      };

      const totalAssets = assetTypesCounts.reduce((sum, item) => sum + Number(item.total), 0);
      
      // Calculate utilization percentage for software licenses
      const utilizationPct = licenseStatus.totalLicenses > 0 
        ? Math.round((licenseStatus.assigned * 100) / licenseStatus.totalLicenses) 
        : 0;

      // Maintain backward compatibility with existing UI
      const assetStatusBreakdown = [
        { status: "deployed", count: assetTypesCounts.reduce((sum, item) => sum + Number(item.deployed), 0) },
        { status: "in-stock", count: assetTypesCounts.reduce((sum, item) => sum + Number(item.inStock), 0) },
        { status: "in-repair", count: assetTypesCounts.reduce((sum, item) => sum + Number(item.inRepair), 0) },
        { status: "disposed", count: assetTypesCounts.reduce((sum, item) => sum + Number(item.disposed), 0) }
      ];

      // Calculate comprehensive metrics for the response
      const unassignedLicenses = Math.max(0, licenseStatus.totalLicenses - licenseStatus.assigned);
      const utilizationPctFinal = licenseStatus.totalLicenses > 0 
        ? Math.round((licenseStatus.assigned * 100) / licenseStatus.totalLicenses) 
        : 0;

      // Create assetStatusCounts object for frontend compatibility
      const assetStatusCounts = {
        deployed: assetTypesCounts.reduce((sum, item) => sum + Number(item.deployed), 0),
        inStock: assetTypesCounts.reduce((sum, item) => sum + Number(item.inStock), 0),
        inRepair: assetTypesCounts.reduce((sum, item) => sum + Number(item.inRepair), 0),
        retired: assetTypesCounts.reduce((sum, item) => sum + Number(item.disposed), 0) // Map 'disposed' to 'retired' for frontend
      };

      return {
        // Legacy compatibility - maintain existing structure for current UI
        totalAssets,
        activeLicenses: licenseStatus.totalLicenses - licenseStatus.expired,
        complianceScore: totalAssets > 0 ? Math.round(((totalAssets - warrantyStatus.warrantyExpired) / totalAssets) * 100) : 100,
        assetStatusBreakdown,
        assetStatusCounts, // Add the object that frontend expects

        // Enhanced metrics for new dashboard tiles
        pendingActions: warrantyStatus.warrantyExpiring + warrantyStatus.amcDue + licenseStatus.renewalDue,
        assetsByType,
        
        // Hardware detailed breakdown
        hardware: {
          overview: assetsByType.Hardware || { total: 0, deployed: 0, inStock: 0, inRepair: 0, disposed: 0 },
          byCategory: hardwareBreakdown,
          warrantyStatus: {
            total: warrantyStatus.total,
            expiring: warrantyStatus.warrantyExpiring,
            expired: warrantyStatus.warrantyExpired,
            amcDue: warrantyStatus.amcDue,
            amcExpired: warrantyStatus.amcExpired
          }
        },

        // Software detailed breakdown
        software: {
          overview: assetsByType.Software || { total: 0, deployed: 0, inStock: 0, inRepair: 0, disposed: 0 },
          licenseStatus: {
            totalLicenses: licenseStatus.totalLicenses,
            assigned: licenseStatus.assigned,
            unassigned: unassignedLicenses,
            unutilized: unassignedLicenses, // Same as unassigned for now
            renewalDue: licenseStatus.renewalDue,
            expired: licenseStatus.expired,
            utilizationPct: utilizationPctFinal
          }
        },

        // Peripheral detailed breakdown
        peripherals: {
          overview: assetsByType.Peripherals || { total: 0, deployed: 0, inStock: 0, inRepair: 0, disposed: 0 },
          byCategory: peripheralBreakdown
        },

        // Others detailed breakdown (special categories like CCTV, access control)
        others: {
          overview: {
            total: Object.values(othersBreakdown).reduce((sum: number, item: any) => sum + Number(item.total), 0),
            deployed: Object.values(othersBreakdown).reduce((sum: number, item: any) => sum + Number(item.deployed), 0),
            inStock: Object.values(othersBreakdown).reduce((sum: number, item: any) => sum + Number(item.inStock), 0),
            inRepair: Object.values(othersBreakdown).reduce((sum: number, item: any) => sum + Number(item.inRepair), 0)
          },
          byCategory: othersBreakdown
        },

        // Ticket metrics
        tickets: ticketStats,

        // NEW: Enhanced ITAM Insights
        itamInsights: {
          // Unused Assets
          unusedAssets: {
            hardware: unusedHardwareAssets.map(asset => ({
              id: asset.id,
              name: asset.name,
              category: asset.category,
              manufacturer: asset.manufacturer,
              model: asset.model,
              purchaseDate: asset.purchaseDate,
              purchaseCost: asset.purchaseCost,
              location: asset.location,
              type: 'hardware'
            })),
            software: unusedSoftwareLicenses.map(license => ({
              id: license.id,
              name: license.name,
              vendor: license.vendor,
              version: license.version,
              totalLicenses: license.totalLicenses,
              usedLicenses: license.usedLicenses,
              availableLicenses: (license.totalLicenses || 0) - (license.usedLicenses || 0),
              costPerLicense: license.costPerLicense,
              renewalDate: license.renewalDate,
              type: 'software'
            }))
          },

          // Expiring Items
          expiringItems: {
            warranties: expiringWarranties.map(asset => ({
              id: asset.id,
              name: asset.name,
              category: asset.category,
              manufacturer: asset.manufacturer,
              model: asset.model,
              serialNumber: asset.serialNumber,
              purchaseDate: asset.purchaseDate,
              warrantyExpiry: asset.warrantyExpiry,
              amcExpiry: asset.amcExpiry,
              location: asset.location,
              assignedUser: asset.assignedUserName, // Fixed: renamed from assignedUserName
              type: 'warranty',
              expiryDate: asset.warrantyExpiry || asset.amcExpiry, // Fixed: explicit mapping
              contractType: asset.warrantyExpiry ? 'Warranty' : 'AMC' // Fixed: explicit contract type
            })),
            licenses: expiringSoftwareLicenses.map(license => ({
              id: license.id,
              name: license.name,
              vendor: license.vendor,
              version: license.version,
              licenseKey: license.licenseKey,
              purchaseDate: license.createdAt, // Use createdAt as purchase date equivalent
              renewalDate: license.renewalDate,
              totalLicenses: license.totalLicenses,
              costPerLicense: license.costPerLicense,
              type: 'license',
              expiryDate: license.renewalDate, // Fixed: explicit mapping
              contractType: 'Software License' // Fixed: explicit contract type
            }))
          },

          // Recent Activities
          recentActivities: recentActivities.map(activity => ({
            id: activity.id,
            action: activity.action,
            resourceType: activity.resourceType,
            resourceId: activity.resourceId,
            userEmail: activity.userEmail,
            userRole: activity.userRole,
            description: activity.description,
            createdAt: activity.createdAt,
            timeAgo: this.getTimeAgo(activity.createdAt)
          })),

          // Asset Age Analysis
          assetAgeAnalysis: await this.getAssetAgeAnalysis(tenantId),

          // Summary Metrics
          summary: {
            totalUnusedHardware: unusedHardwareAssets.length,
            totalUnusedLicenses: unusedSoftwareLicenses.reduce((sum, license) => sum + ((license.totalLicenses || 0) - (license.usedLicenses || 0)), 0),
            totalExpiringWarranties: expiringWarranties.length,
            totalExpiringLicenses: expiringSoftwareLicenses.length,
            totalPendingActions: (warrantyStatus.warrantyExpiring || 0) + (warrantyStatus.amcDue || 0) + (licenseStatus.renewalDue || 0),
            complianceRisk: (warrantyStatus.warrantyExpired || 0) + (licenseStatus.expired || 0) // Fixed: ensure numeric value
          }
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  // Global Search functionality
  async performGlobalSearch(tenantId: string, query: string, searchType?: string, userRole?: string, limit: number = 10): Promise<any> {
    try {
      const results: any = {
        assets: [],
        users: [],
        vendors: [],
        locations: [],
        softwareLicenses: []
      };

      // Search assets
      if (!searchType || searchType === 'all' || searchType === 'assets') {
        results.assets = await db
          .select()
          .from(assets)
          .where(and(
            eq(assets.tenantId, tenantId),
            or(
              ilike(assets.name, `%${query}%`),
              ilike(assets.category, `%${query}%`),
              ilike(assets.manufacturer, `%${query}%`),
              ilike(assets.model, `%${query}%`),
              ilike(assets.serialNumber, `%${query}%`),
              ilike(assets.location, `%${query}%`)
            )
          ))
          .limit(limit);
      }

      // Search users (only for admin and it-manager roles)
      if (userRole === 'admin' || userRole === 'it-manager') {
        if (!searchType || searchType === 'all' || searchType === 'users') {
          results.users = await db
            .select()
            .from(users)
            .where(and(
              eq(users.tenantId, tenantId),
              or(
                ilike(users.firstName, `%${query}%`),
                ilike(users.lastName, `%${query}%`),
                ilike(users.email, `%${query}%`),
                ilike(users.username, `%${query}%`),
                ilike(users.department, `%${query}%`)
              )
            ))
            .limit(limit);
        }
      }

      // Search software licenses
      if (!searchType || searchType === 'all' || searchType === 'licenses') {
        results.softwareLicenses = await db
          .select()
          .from(softwareLicenses)
          .where(and(
            eq(softwareLicenses.tenantId, tenantId),
            or(
              ilike(softwareLicenses.name, `%${query}%`),
              ilike(softwareLicenses.vendor, `%${query}%`),
              ilike(softwareLicenses.version, `%${query}%`),
              ilike(softwareLicenses.licenseType, `%${query}%`)
            )
          ))
          .limit(limit);
      }

      // Search vendors (extract from assets and licenses)
      if (!searchType || searchType === 'all' || searchType === 'vendors') {
        const vendorAssets = await db
          .select({
            vendorName: assets.vendorName,
            vendorEmail: assets.vendorEmail,
            vendorPhone: assets.vendorPhone
          })
          .from(assets)
          .where(and(
            eq(assets.tenantId, tenantId),
            ilike(assets.vendorName, `%${query}%`)
          ))
          .groupBy(assets.vendorName, assets.vendorEmail, assets.vendorPhone)
          .limit(limit);

        const vendorLicenses = await db
          .select({
            vendorName: softwareLicenses.vendor,
            vendorEmail: sql<string>`null`,
            vendorPhone: sql<string>`null`
          })
          .from(softwareLicenses)
          .where(and(
            eq(softwareLicenses.tenantId, tenantId),
            ilike(softwareLicenses.vendor, `%${query}%`),
            isNotNull(softwareLicenses.vendor)
          ))
          .groupBy(softwareLicenses.vendor)
          .limit(limit);

        results.vendors = [...vendorAssets, ...vendorLicenses].slice(0, limit);
      }

      // Search locations (extract from assets)
      if (!searchType || searchType === 'all' || searchType === 'locations') {
        results.locations = await db
          .select({
            location: assets.location,
            count: sql<number>`count(*)`
          })
          .from(assets)
          .where(and(
            eq(assets.tenantId, tenantId),
            ilike(assets.location, `%${query}%`)
          ))
          .groupBy(assets.location)
          .limit(limit);
      }

      return { results };
    } catch (error) {
      console.error('Error performing global search:', error);
      throw error;
    }
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
      mustChangePassword: false, // Demo admin doesn't need to change password
    });

    // Create sample users with different roles for testing
    const managerUser = await storage.createUser({
      username: "manager",
      email: "manager@techcorp.com",
      password: hashedPassword,
      firstName: "Michael",
      lastName: "Davis",
      role: "manager",
      avatar: null,
      phone: null,
      department: "IT",
      jobTitle: "IT Manager",
      manager: null,
      lastLoginAt: null,
      isActive: true,
      tenantId: tenant.id,
      invitedBy: adminUser.id,
      mustChangePassword: false, // Demo user
    });

    const technicianUser = await storage.createUser({
      username: "technician",
      email: "technician@techcorp.com",
      password: hashedPassword,
      firstName: "Alex",
      lastName: "Thompson",
      role: "technician",
      avatar: null,
      phone: null,
      department: "IT",
      jobTitle: "IT Technician",
      manager: managerUser.id,
      lastLoginAt: null,
      isActive: true,
      tenantId: tenant.id,
      invitedBy: managerUser.id,
      mustChangePassword: false, // Demo user
    });

    const employeeUser = await storage.createUser({
      username: "employee",
      email: "employee@techcorp.com",
      password: hashedPassword,
      firstName: "Emma",
      lastName: "Wilson",
      role: "employee",
      avatar: null,
      phone: null,
      department: "Marketing",
      jobTitle: "Marketing Specialist",
      manager: null,
      lastLoginAt: null,
      isActive: true,
      tenantId: tenant.id,
      invitedBy: adminUser.id,
      mustChangePassword: false, // Demo user
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
        type: "Hardware" as const,
        category: "laptop",
        manufacturer: "Apple",
        model: "MacBook Pro",
        serialNumber: "A1234567890",
        status: "deployed",
        location: "Office Floor 2, Desk 45",
        assignedUserId: null,
        assignedUserName: null,
        purchaseDate: new Date("2024-01-15"),
        purchaseCost: 2499.00,
        warrantyExpiry: new Date("2027-01-15"),
        specifications: { ram: "16GB", storage: "512GB SSD", processor: "M1 Pro" },
        tenantId: tenant.id,
        createdBy: adminUser.id,
      },
      {
        name: "Dell OptiPlex 7090",
        type: "Hardware" as const,
        category: "desktop",
        manufacturer: "Dell",
        model: "OptiPlex 7090",
        serialNumber: "D9876543210",
        status: "available",
        location: "Storage Room A",
        assignedUserId: null,
        assignedUserName: null,
        purchaseDate: new Date("2024-02-01"),
        purchaseCost: 899.00,
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