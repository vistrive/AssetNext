import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  generateToken, 
  verifyToken, 
  hashPassword, 
  comparePassword, 
  checkPermission,
  type JWTPayload 
} from "./services/auth";
import { generateAssetRecommendations } from "./services/openai";
import { 
  loginSchema, 
  registerSchema, 
  insertAssetSchema,
  insertSoftwareLicenseSchema,
  insertMasterDataSchema,
  updateUserProfileSchema,
  insertUserPreferencesSchema,
  updateOrgSettingsSchema,
  type LoginRequest,
  type RegisterRequest,
  type UpdateUserProfile,
  type InsertUserPreferences,
  type UpdateOrgSettings
} from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Auth middleware
const authenticateToken = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = payload;
  next();
};

const requireRole = (role: string) => (req: Request, res: Response, next: Function) => {
  if (!req.user || !checkPermission(req.user.role, role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password }: LoginRequest = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user);
      const tenant = await storage.getTenant(user.tenantId);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, tenantName }: RegisterRequest = 
        registerSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create tenant
      const tenant = await storage.createTenant({
        name: tenantName,
        slug: tenantName.toLowerCase().replace(/\s+/g, '-'),
      });

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username: email,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "admin", // First user is admin
        tenantId: tenant.id,
      });

      const token = generateToken(user);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant: { id: tenant.id, name: tenant.name },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/auth/verify", authenticateToken, async (req: Request, res: Response) => {
    const user = await storage.getUser(req.user!.userId);
    const tenant = await storage.getTenant(req.user!.tenantId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
    });
  });

  // User Profile Management
  app.get("/api/users/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        department: user.department,
        jobTitle: user.jobTitle,
        manager: user.manager,
        avatar: user.avatar,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.patch("/api/users/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      const profileData: UpdateUserProfile = updateUserProfileSchema.parse(req.body);
      
      // SECURITY: Whitelist only safe profile fields, prevent privilege escalation
      const safeProfileData: UpdateUserProfile = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        department: profileData.department,
        jobTitle: profileData.jobTitle,
        manager: profileData.manager,
      };
      
      const updatedUser = await storage.updateUserProfile(req.user!.userId, req.user!.tenantId, safeProfileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "user_profile_updated",
        resourceType: "user",
        resourceId: req.user!.userId,
        userEmail: updatedUser.email,
        userRole: updatedUser.role,
        description: `User profile updated: ${Object.keys(safeProfileData).join(', ')}`,
      });

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        department: updatedUser.department,
        jobTitle: updatedUser.jobTitle,
        manager: updatedUser.manager,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        lastLoginAt: updatedUser.lastLoginAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // User Preferences Management
  app.get("/api/users/me/preferences", authenticateToken, async (req: Request, res: Response) => {
    try {
      const preferences = await storage.getUserPreferences(req.user!.userId, req.user!.tenantId);
      
      if (!preferences) {
        // Return default preferences if none exist
        const defaults = {
          emailNotifications: true,
          pushNotifications: true,
          aiRecommendationAlerts: true,
          weeklyReports: true,
          assetExpiryAlerts: true,
          theme: "light" as const,
          language: "en",
          timezone: "UTC",
          dateFormat: "MM/dd/yyyy",
          dashboardLayout: "default",
          itemsPerPage: 25,
        };
        return res.json(defaults);
      }

      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.patch("/api/users/me/preferences", authenticateToken, async (req: Request, res: Response) => {
    try {
      const preferencesData: Partial<InsertUserPreferences> = insertUserPreferencesSchema.partial().parse(req.body);
      
      let preferences = await storage.getUserPreferences(req.user!.userId, req.user!.tenantId);
      
      if (!preferences) {
        // Create new preferences if they don't exist - SECURITY: Only allow preference fields
        const safePreferencesData = {
          emailNotifications: preferencesData.emailNotifications,
          pushNotifications: preferencesData.pushNotifications,
          aiRecommendationAlerts: preferencesData.aiRecommendationAlerts,
          weeklyReports: preferencesData.weeklyReports,
          assetExpiryAlerts: preferencesData.assetExpiryAlerts,
          theme: preferencesData.theme,
          language: preferencesData.language,
          timezone: preferencesData.timezone,
          dateFormat: preferencesData.dateFormat,
          dashboardLayout: preferencesData.dashboardLayout,
          itemsPerPage: preferencesData.itemsPerPage,
        };
        
        const newPreferences: InsertUserPreferences = {
          userId: req.user!.userId,
          tenantId: req.user!.tenantId,
          emailNotifications: safePreferencesData.emailNotifications ?? true,
          pushNotifications: safePreferencesData.pushNotifications ?? true,
          aiRecommendationAlerts: safePreferencesData.aiRecommendationAlerts ?? true,
          weeklyReports: safePreferencesData.weeklyReports ?? true,
          assetExpiryAlerts: safePreferencesData.assetExpiryAlerts ?? true,
          theme: safePreferencesData.theme ?? "light",
          language: safePreferencesData.language ?? "en",
          timezone: safePreferencesData.timezone ?? "UTC",
          dateFormat: safePreferencesData.dateFormat ?? "MM/dd/yyyy",
          dashboardLayout: safePreferencesData.dashboardLayout ?? "default",
          itemsPerPage: safePreferencesData.itemsPerPage ?? 25,
        };
        preferences = await storage.createUserPreferences(newPreferences);
      } else {
        // SECURITY: Only allow preference fields, block identity field tampering
        const safePreferencesUpdate = {
          emailNotifications: preferencesData.emailNotifications,
          pushNotifications: preferencesData.pushNotifications,
          aiRecommendationAlerts: preferencesData.aiRecommendationAlerts,
          weeklyReports: preferencesData.weeklyReports,
          assetExpiryAlerts: preferencesData.assetExpiryAlerts,
          theme: preferencesData.theme,
          language: preferencesData.language,
          timezone: preferencesData.timezone,
          dateFormat: preferencesData.dateFormat,
          dashboardLayout: preferencesData.dashboardLayout,
          itemsPerPage: preferencesData.itemsPerPage,
        };
        preferences = await storage.updateUserPreferences(req.user!.userId, req.user!.tenantId, safePreferencesUpdate);
      }

      if (!preferences) {
        return res.status(404).json({ message: "Failed to update preferences" });
      }

      // Log the activity  
      const user = await storage.getUser(req.user!.userId);
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "user_preferences_updated",
        resourceType: "user_preferences",
        resourceId: preferences.id,
        userEmail: user?.email || "",
        userRole: user?.role || "read-only",
        description: `User preferences updated: ${Object.keys(preferencesData).join(', ')}`,
      });

      res.json(preferences);
    } catch (error) {
      res.status(400).json({ message: "Invalid preferences data" });
    }
  });

  // Password Change
  app.post("/api/users/me/change-password", authenticateToken, async (req: Request, res: Response) => {
    try {
      // SECURITY: Proper validation schema for password change
      const passwordChangeSchema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters long"),
        confirmNewPassword: z.string().min(1, "Password confirmation is required"),
      }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "New password and confirmation do not match",
        path: ["confirmNewPassword"],
      });

      const { currentPassword, newPassword, confirmNewPassword } = passwordChangeSchema.parse(req.body);

      const user = await storage.getUser(req.user!.userId);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      const success = await storage.updateUserPassword(req.user!.userId, req.user!.tenantId, hashedNewPassword);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      // Log the activity
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "password_changed",
        resourceType: "user",
        resourceId: req.user!.userId,
        userEmail: user.email,
        userRole: user.role,
        description: "User changed their password",
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Organization Settings
  app.get("/api/org/settings", authenticateToken, async (req: Request, res: Response) => {
    try {
      const tenant = await storage.getTenant(req.user!.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json({
        id: tenant.id,
        name: tenant.name,
        timezone: tenant.timezone,
        currency: tenant.currency,
        dateFormat: tenant.dateFormat,
        autoRecommendations: tenant.autoRecommendations,
        dataRetentionDays: tenant.dataRetentionDays,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organization settings" });
    }
  });

  app.patch("/api/org/settings", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const settingsData: UpdateOrgSettings = updateOrgSettingsSchema.parse(req.body);
      
      const updatedTenant = await storage.updateTenantSettings(req.user!.tenantId, settingsData);
      if (!updatedTenant) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Log the activity
      const user = await storage.getUser(req.user!.userId);
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "org_settings_updated",
        resourceType: "tenant",
        resourceId: req.user!.tenantId,
        userEmail: user?.email || "",
        userRole: user?.role || "read-only",
        description: `Organization settings updated: ${Object.keys(settingsData).join(', ')}`,
      });

      res.json({
        id: updatedTenant.id,
        name: updatedTenant.name,
        timezone: updatedTenant.timezone,
        currency: updatedTenant.currency,
        dateFormat: updatedTenant.dateFormat,
        autoRecommendations: updatedTenant.autoRecommendations,
        dataRetentionDays: updatedTenant.dataRetentionDays,
        createdAt: updatedTenant.createdAt,
        updatedAt: updatedTenant.updatedAt,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // User Activity History
  app.get("/api/users/me/activity", authenticateToken, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const activities = await storage.getAuditLogs(req.user!.tenantId, {
        userId: req.user!.userId,
        limit,
        offset,
      });

      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/metrics", authenticateToken, async (req: Request, res: Response) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user!.tenantId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Asset routes
  app.get("/api/assets", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { type, status } = req.query;
      const filters: any = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;

      const assets = await storage.getAssets(req.user!.tenantId, filters);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const asset = await storage.getAsset(req.params.id, req.user!.tenantId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", authenticateToken, requireRole("it-manager"), async (req: Request, res: Response) => {
    try {
      const assetData = insertAssetSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });

      const asset = await storage.createAsset(assetData);
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({ message: "Invalid asset data" });
    }
  });

  app.put("/api/assets/:id", authenticateToken, requireRole("it-manager"), async (req: Request, res: Response) => {
    try {
      const assetData = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(req.params.id, req.user!.tenantId, assetData);
      
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      res.status(400).json({ message: "Invalid asset data" });
    }
  });

  app.delete("/api/assets/:id", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteAsset(req.params.id, req.user!.tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Software License routes
  app.get("/api/licenses", authenticateToken, async (req: Request, res: Response) => {
    try {
      const licenses = await storage.getSoftwareLicenses(req.user!.tenantId);
      res.json(licenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.post("/api/licenses", authenticateToken, requireRole("it-manager"), async (req: Request, res: Response) => {
    try {
      const licenseData = insertSoftwareLicenseSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });

      const license = await storage.createSoftwareLicense(licenseData);
      res.status(201).json(license);
    } catch (error) {
      res.status(400).json({ message: "Invalid license data" });
    }
  });

  // Recommendations routes
  app.get("/api/recommendations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const recommendations = await storage.getRecommendations(
        req.user!.tenantId, 
        status as string
      );
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.post("/api/recommendations/generate", authenticateToken, requireRole("it-manager"), async (req: Request, res: Response) => {
    try {
      const assets = await storage.getAssets(req.user!.tenantId);
      const licenses = await storage.getSoftwareLicenses(req.user!.tenantId);
      
      // Get utilization data for all assets
      const utilizationPromises = assets.map(asset => 
        storage.getAssetUtilization(asset.id, req.user!.tenantId)
      );
      const utilizationResults = await Promise.all(utilizationPromises);
      const utilization = utilizationResults.flat();

      const aiRecommendations = await generateAssetRecommendations({
        assets,
        licenses,
        utilization,
      });

      // Save recommendations to storage
      const savedRecommendations = await Promise.all(
        aiRecommendations.map(rec => 
          storage.createRecommendation({
            ...rec,
            potentialSavings: rec.potentialSavings.toString(),
            tenantId: req.user!.tenantId,
          })
        )
      );

      res.json(savedRecommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.put("/api/recommendations/:id", authenticateToken, requireRole("it-manager"), async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!["pending", "accepted", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const recommendation = await storage.updateRecommendation(
        req.params.id,
        req.user!.tenantId,
        { status }
      );

      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      res.json(recommendation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update recommendation" });
    }
  });

  // Master Data routes
  app.get("/api/master", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { type, query } = req.query;
      if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: "Master data type is required" });
      }

      const masterData = await storage.getMasterData(
        req.user!.tenantId,
        type,
        query as string | undefined
      );
      res.json(masterData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch master data" });
    }
  });

  app.post("/api/master", authenticateToken, requireRole("it-manager"), async (req: Request, res: Response) => {
    try {
      const masterDataInput = insertMasterDataSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
      });

      const masterData = await storage.addMasterData(masterDataInput);
      res.status(201).json(masterData);
    } catch (error) {
      res.status(400).json({ message: "Invalid master data" });
    }
  });

  app.get("/api/master/distinct", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { field } = req.query;
      if (!field || typeof field !== 'string') {
        return res.status(400).json({ message: "Field parameter is required" });
      }

      const distinctValues = await storage.getDistinctFromAssets(
        req.user!.tenantId,
        field
      );
      res.json(distinctValues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch distinct values" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
