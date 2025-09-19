import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parse } from "csv-parse/sync";
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
  inviteUserSchema,
  acceptInvitationSchema,
  updateUserRoleSchema,
  insertTicketSchema,
  updateTicketSchema,
  insertTicketCommentSchema,
  type LoginRequest,
  type RegisterRequest,
  type UpdateUserProfile,
  type InsertUserPreferences,
  type UpdateOrgSettings,
  type InviteUser,
  type AcceptInvitation,
  type UpdateUserRole
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
      
      const { email, password, firstName, lastName, tenantName, role }: RegisterRequest = 
        registerSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Check if organization already exists by name (case-insensitive)
      let tenant = await storage.getTenantByName(tenantName);
      
      if (!tenant) {
        // Create new organization if it doesn't exist
        const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
        tenant = await storage.createTenant({
          name: tenantName,
          slug: slug,
        });
      }

      // Create user - restrict self-registration roles for security
      const hashedPassword = await hashPassword(password);
      const allowedRole = role === "admin" || role === "manager" ? "employee" : role; // Prevent privilege escalation
      const user = await storage.createUser({
        username: email,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: allowedRole, // Only allow employee/technician for self-registration
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
      console.error("Registration validation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors 
        });
      }
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
      
      const updatedTenant = await storage.updateOrgSettings(req.user!.tenantId, settingsData);
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

      const assets = await storage.getAllAssets(req.user!.tenantId);
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

  app.post("/api/assets", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
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

  app.put("/api/assets/:id", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
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

  // Bulk upload endpoints
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    }
  });

  // Helper function to sanitize CSV values (prevent formula injection)
  const sanitizeCsvValue = (value: string): string => {
    if (!value) return value;
    // If value starts with risky characters, prefix with single quote
    if (/^[=+\-@]/.test(value)) {
      return `'${value}`;
    }
    return value;
  };

  // Download CSV template
  app.get("/api/assets/bulk/template", authenticateToken, requireRole("manager"), (req: Request, res: Response) => {
    const headers = [
      'name',
      'type',
      'status',
      'category',
      'manufacturer',
      'model',
      'serial_number',
      'location',
      'assigned_user_email',
      'assigned_user_name',
      'purchase_date',
      'purchase_cost',
      'warranty_expiry',
      'specifications',
      'notes',
      'software_name',
      'version',
      'license_type',
      'license_key',
      'used_licenses',
      'renewal_date',
      'vendor_name',
      'vendor_email',
      'vendor_phone',
      'company_name',
      'company_gst_number'
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="asset_template.csv"');
    res.send(headers.join(',') + '\n');
  });

  // Download CSV sample
  app.get("/api/assets/bulk/sample", authenticateToken, requireRole("manager"), (req: Request, res: Response) => {
    const headers = [
      'name',
      'type',
      'status',
      'category',
      'manufacturer',
      'model',
      'serial_number',
      'location',
      'assigned_user_email',
      'assigned_user_name',
      'purchase_date',
      'purchase_cost',
      'warranty_expiry',
      'specifications',
      'notes',
      'software_name',
      'version',
      'license_type',
      'license_key',
      'used_licenses',
      'renewal_date',
      'vendor_name',
      'vendor_email',
      'vendor_phone',
      'company_name',
      'company_gst_number'
    ];

    const sampleData = [
      [
        'MacBook Pro 16"',
        'hardware',
        'deployed',
        'laptop',
        'Apple',
        'MacBook Pro',
        'A1234567890',
        'Office Floor 2',
        'john.doe@techcorp.com',
        'John Doe',
        '2024-01-15',
        '2499.00',
        '2027-01-15',
        '{"ram":"16GB","storage":"512GB SSD","processor":"M1 Pro"}',
        'High-performance laptop for development team',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ],
      [
        'Microsoft Office 365',
        'software',
        'deployed',
        'productivity',
        'Microsoft',
        'Office 365',
        '',
        'Cloud',
        '',
        '',
        '2024-02-01',
        '150.00',
        '2025-02-01',
        '{"edition":"Business Premium","users":"unlimited"}',
        'Annual subscription for productivity suite',
        'Microsoft Office 365',
        '2024',
        'subscription',
        'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
        '50',
        '2025-02-01',
        'Microsoft',
        'support@microsoft.com',
        '+1-800-642-7676',
        'Microsoft Corporation',
        ''
      ]
    ];

    // Sanitize sample data to prevent CSV formula injection
    const sanitizedData = sampleData.map(row => row.map(cell => sanitizeCsvValue(cell)));
    const csvContent = [headers.join(','), ...sanitizedData.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="asset_sample.csv"');
    res.send(csvContent);
  });

  // Bulk upload endpoint
  app.post("/api/assets/bulk/upload", authenticateToken, requireRole("manager"), upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const validateOnly = req.query.validateOnly === 'true';
      const mode = (req.query.mode as string) || 'partial'; // partial or atomic
      
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      if (records.length > 5000) {
        return res.status(400).json({ message: "Maximum 5000 rows allowed" });
      }

      const results: any[] = [];
      const validAssets: any[] = [];
      let rowNumber = 1; // Start from 1 (header is row 0)

      for (const record of records) {
        rowNumber++;
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
          // Basic validation
          if (!record.name?.trim()) {
            errors.push("Name is required");
          }
          if (!record.type?.trim()) {
            errors.push("Type is required");
          } else if (!['hardware', 'software', 'peripheral'].includes(record.type)) {
            errors.push("Type must be hardware, software, or peripheral");
          }
          if (!record.status?.trim()) {
            errors.push("Status is required");
          } else if (!['in-stock', 'deployed', 'in-repair', 'disposed'].includes(record.status)) {
            errors.push("Status must be in-stock, deployed, in-repair, or disposed");
          }

          // Type-specific validation
          if (record.type === 'software' && !record.software_name?.trim()) {
            errors.push("Software name is required for software assets");
          }

          // Date validation
          const dateFields = ['purchase_date', 'warranty_expiry', 'renewal_date'];
          for (const field of dateFields) {
            if (record[field] && record[field].trim()) {
              const date = new Date(record[field]);
              if (isNaN(date.getTime())) {
                errors.push(`${field} must be a valid date (YYYY-MM-DD or MM/DD/YYYY)`);
              }
            }
          }

          // Number validation
          if (record.purchase_cost && record.purchase_cost.trim()) {
            const cost = parseFloat(record.purchase_cost);
            if (isNaN(cost) || cost < 0) {
              errors.push("Purchase cost must be a valid positive number");
            }
          }

          if (record.used_licenses && record.used_licenses.trim()) {
            const licenses = parseInt(record.used_licenses);
            if (isNaN(licenses) || licenses < 0) {
              errors.push("Used licenses must be a valid non-negative integer");
            }
          }

          // Build asset object if no errors
          if (errors.length === 0) {
            const assetData: any = {
              name: record.name.trim(),
              type: record.type.trim(),
              status: record.status.trim(),
              tenantId: req.user!.tenantId,
              createdBy: req.user!.userId
            };

            // Add optional fields
            const optionalFields = [
              'category', 'manufacturer', 'model', 'serial_number', 'location',
              'assigned_user_name', 'notes', 'software_name', 'version',
              'license_type', 'license_key', 'vendor_name', 'vendor_email',
              'vendor_phone', 'company_name', 'company_gst_number'
            ];

            for (const field of optionalFields) {
              if (record[field] && record[field].trim()) {
                assetData[field === 'serial_number' ? 'serialNumber' : 
                          field === 'assigned_user_name' ? 'assignedUserName' :
                          field === 'software_name' ? 'softwareName' :
                          field === 'license_type' ? 'licenseType' :
                          field === 'license_key' ? 'licenseKey' :
                          field === 'vendor_name' ? 'vendorName' :
                          field === 'vendor_email' ? 'vendorEmail' :
                          field === 'vendor_phone' ? 'vendorPhone' :
                          field === 'company_name' ? 'companyName' :
                          field === 'company_gst_number' ? 'companyGstNumber' :
                          field] = record[field].trim();
              }
            }

            // Handle dates
            if (record.purchase_date && record.purchase_date.trim()) {
              assetData.purchaseDate = new Date(record.purchase_date);
            }
            if (record.warranty_expiry && record.warranty_expiry.trim()) {
              assetData.warrantyExpiry = new Date(record.warranty_expiry);
            }
            if (record.renewal_date && record.renewal_date.trim()) {
              assetData.renewalDate = new Date(record.renewal_date);
            }

            // Handle numbers
            if (record.purchase_cost && record.purchase_cost.trim()) {
              assetData.purchaseCost = record.purchase_cost.trim();
            }
            if (record.used_licenses && record.used_licenses.trim()) {
              assetData.usedLicenses = parseInt(record.used_licenses);
            }

            // Handle JSON specifications
            if (record.specifications && record.specifications.trim()) {
              try {
                assetData.specifications = JSON.parse(record.specifications);
              } catch (e) {
                warnings.push("Invalid JSON in specifications field, treating as text");
                assetData.specifications = { note: record.specifications.trim() };
              }
            }

            // Validate with schema
            const validatedAsset = insertAssetSchema.parse(assetData);
            validAssets.push(validatedAsset);

            results.push({
              rowNumber,
              status: 'valid',
              errors: [],
              warnings
            });
          } else {
            results.push({
              rowNumber,
              status: 'invalid',
              errors,
              warnings
            });
          }
        } catch (error) {
          results.push({
            rowNumber,
            status: 'invalid',
            errors: [error instanceof Error ? error.message : 'Validation failed'],
            warnings
          });
        }
      }

      const summary = {
        total: records.length,
        valid: validAssets.length,
        invalid: records.length - validAssets.length,
        inserted: 0
      };

      // If validation only, return results
      if (validateOnly) {
        return res.json({ summary, rows: results });
      }

      // Insert assets if not validation-only
      if (validAssets.length > 0) {
        if (mode === 'atomic' && summary.invalid > 0) {
          return res.status(400).json({
            message: "Atomic mode: Cannot import any assets because some rows have errors",
            summary,
            rows: results
          });
        }

        try {
          const insertedAssets = await storage.createAssetsBulk(validAssets);
          summary.inserted = insertedAssets.length;

          // Log audit activity
          await storage.logActivity({
            action: "bulk_asset_import",
            resourceType: "asset",
            resourceId: null,
            details: `Imported ${summary.inserted} assets from CSV upload`,
            userId: req.user!.userId,
            tenantId: req.user!.tenantId
          });

          res.json({ 
            summary, 
            rows: results,
            message: `Successfully imported ${summary.inserted} assets`
          });
        } catch (error) {
          res.status(500).json({ message: "Failed to import assets" });
        }
      } else {
        res.json({ 
          summary, 
          rows: results,
          message: "No valid assets to import"
        });
      }

    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  // Software License routes
  app.get("/api/licenses", authenticateToken, async (req: Request, res: Response) => {
    try {
      const licenses = await storage.getAllSoftwareLicenses(req.user!.tenantId);
      res.json(licenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.post("/api/licenses", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
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

  app.post("/api/recommendations/generate", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const assets = await storage.getAssets(req.user!.tenantId);
      const licenses = await storage.getAllSoftwareLicenses(req.user!.tenantId);
      
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

  app.put("/api/recommendations/:id", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
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

  app.post("/api/master", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
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

  // Get technicians for ticket assignment (Managers and Admins only)
  app.get("/api/users/technicians", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const users = await storage.getTenantUsers(req.user!.tenantId);
      
      // Filter to only technicians and remove sensitive information
      const technicians = users
        .filter(user => user.role === "technician" && user.isActive)
        .map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          jobTitle: user.jobTitle,
        }));

      res.json(technicians);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  // User Management Routes (Admin only)
  app.get("/api/users", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const users = await storage.getTenantUsers(req.user!.tenantId);
      
      // Remove sensitive information
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        invitedBy: user.invitedBy,
        createdAt: user.createdAt,
      }));

      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users/invite", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const inviteData: InviteUser = inviteUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(inviteData.email);
      if (existingUser && existingUser.tenantId === req.user!.tenantId) {
        return res.status(400).json({ message: "User already exists in your organization" });
      }

      // Check if invitation already exists
      const existingInvitation = await storage.getInvitationByEmail(inviteData.email, req.user!.tenantId);
      if (existingInvitation) {
        return res.status(400).json({ message: "Invitation already sent to this email" });
      }

      // Create invitation
      const invitation = await storage.createInvitation({
        email: inviteData.email,
        firstName: inviteData.firstName,
        lastName: inviteData.lastName,
        role: inviteData.role,
        tenantId: req.user!.tenantId,
        invitedBy: req.user!.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      // Log the activity
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "user_invited",
        resourceType: "user_invitation",
        resourceId: invitation.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        description: `Invited ${inviteData.email} with role ${inviteData.role}`,
      });

      res.status(201).json({
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invitation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get("/api/users/invitations", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const invitations = await storage.getTenantInvitations(req.user!.tenantId);
      
      // Include inviter information
      const invitationsWithInviter = await Promise.all(
        invitations.map(async (invitation) => {
          const inviter = await storage.getUser(invitation.invitedBy);
          return {
            ...invitation,
            inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : "Unknown",
          };
        })
      );
      
      res.json(invitationsWithInviter);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.patch("/api/users/:userId/role", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const roleData: UpdateUserRole = updateUserRoleSchema.parse(req.body);
      
      // Prevent self-role modification
      if (userId === req.user!.userId) {
        return res.status(400).json({ message: "Cannot modify your own role" });
      }

      const updatedUser = await storage.updateUserRole(userId, req.user!.tenantId, roleData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "user_role_updated",
        resourceType: "user",
        resourceId: userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        description: `Updated user role to ${roleData.role}`,
      });

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/users/:userId/deactivate", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      
      // Prevent self-deactivation
      if (userId === req.user!.userId) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      const success = await storage.deactivateUser(userId, req.user!.tenantId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "user_deactivated",
        resourceType: "user",
        resourceId: userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        description: "User account deactivated",
      });

      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  app.patch("/api/users/:userId/activate", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      
      const success = await storage.activateUser(userId, req.user!.tenantId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the activity
      await storage.logActivity({
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        action: "user_activated",
        resourceType: "user",
        resourceId: userId,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        description: "User account activated",
      });

      res.json({ message: "User activated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate user" });
    }
  });

  // Invitation acceptance route (public - no auth required)
  app.post("/api/auth/accept-invitation", async (req: Request, res: Response) => {
    try {
      const acceptData: AcceptInvitation = acceptInvitationSchema.parse(req.body);
      
      const result = await storage.acceptInvitation(acceptData.token, acceptData.password);
      if (!result) {
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }

      const { user, invitation } = result;
      const token = generateToken(user);
      const tenant = await storage.getTenant(user.tenantId);

      // Log the activity
      await storage.logActivity({
        userId: user.id,
        tenantId: user.tenantId,
        action: "invitation_accepted",
        resourceType: "user",
        resourceId: user.id,
        userEmail: user.email,
        userRole: user.role,
        description: "User accepted invitation and joined organization",
      });

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
        tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invitation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Get invitation details (public - no auth required)
  app.get("/api/auth/invitation/:token", async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const invitation = await storage.getInvitation(token);
      
      if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      const tenant = await storage.getTenant(invitation.tenantId);
      const inviter = await storage.getUser(invitation.invitedBy);

      res.json({
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        organizationName: tenant?.name || "Unknown Organization",
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : "Unknown",
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  // ====================== TICKET MANAGEMENT API ======================
  
  // Get tickets (role-based access)
  app.get("/api/tickets", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      let tickets;

      // Role-based access control
      switch (user.role) {
        case "employee":
          // Employees can only see their own tickets
          tickets = await storage.getTicketsByRequestor(user.userId, user.tenantId);
          break;
        case "technician":
          // Technicians can see tickets assigned to them
          tickets = await storage.getTicketsByAssignee(user.userId, user.tenantId);
          break;
        case "manager":
        case "admin":
          // Managers and admins can see all tickets in their tenant
          tickets = await storage.getAllTickets(user.tenantId);
          break;
        default:
          return res.status(403).json({ message: "Invalid role" });
      }

      res.json(tickets);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get specific ticket
  app.get("/api/tickets/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      
      const ticket = await storage.getTicket(ticketId, user.tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Role-based access control
      const canAccess = user.role === "admin" || 
                       user.role === "manager" ||
                       ticket.requestorId === user.userId ||
                       ticket.assignedToId === user.userId;
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // Create new ticket
  app.post("/api/tickets", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // Get full user details for name
      const fullUser = await storage.getUser(user.userId);
      if (!fullUser || fullUser.tenantId !== user.tenantId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Parse and validate request body
      const ticketData = insertTicketSchema.parse({
        ...req.body,
        requestorId: user.userId,
        requestorName: `${fullUser.firstName} ${fullUser.lastName}`,
        tenantId: user.tenantId
      });

      const ticket = await storage.createTicket(ticketData);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid ticket data", 
          errors: error.errors 
        });
      }
      console.error("Failed to create ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // Update ticket details (only specific fields allowed)
  app.put("/api/tickets/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      
      // Check if ticket exists and user has access
      const existingTicket = await storage.getTicket(ticketId, user.tenantId);
      if (!existingTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Role-based access control
      const canUpdate = user.role === "admin" || 
                       user.role === "manager" ||
                       existingTicket.requestorId === user.userId;
      
      if (!canUpdate) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Parse and validate update data (only description, category, priority, assetId, assetName allowed)
      const updateData = updateTicketSchema.parse(req.body);
      
      const updatedTicket = await storage.updateTicket(ticketId, user.tenantId, updateData);
      res.json(updatedTicket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid update data", 
          errors: error.errors 
        });
      }
      console.error("Failed to update ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // Assign ticket (managers and admins only)
  app.put("/api/tickets/:id/assign", authenticateToken, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      const { assignedToId, assignedToName } = req.body;
      
      if (!assignedToId || !assignedToName) {
        return res.status(400).json({ message: "assignedToId and assignedToName are required" });
      }

      // Verify the assignee exists and belongs to the same tenant
      const assignee = await storage.getUser(assignedToId);
      if (!assignee || assignee.tenantId !== user.tenantId) {
        return res.status(400).json({ message: "Invalid assignee" });
      }

      // Get full user details for name
      const fullUser = await storage.getUser(user.userId);
      if (!fullUser || fullUser.tenantId !== user.tenantId) {
        return res.status(401).json({ message: "User not found" });
      }

      const updatedTicket = await storage.assignTicket(
        ticketId, 
        user.tenantId, 
        assignedToId, 
        assignedToName,
        user.userId,
        `${fullUser.firstName} ${fullUser.lastName}`
      );
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(updatedTicket);
    } catch (error) {
      console.error("Failed to assign ticket:", error);
      res.status(500).json({ message: "Failed to assign ticket" });
    }
  });

  // Update ticket status (technicians, managers, and admins only)
  app.put("/api/tickets/:id/status", authenticateToken, requireRole("technician"), async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      const { status, resolution, resolutionNotes } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Check if ticket exists and user has access
      const existingTicket = await storage.getTicket(ticketId, user.tenantId);
      if (!existingTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Role-based access control
      const canUpdateStatus = user.role === "admin" || 
                             user.role === "manager" ||
                             existingTicket.assignedToId === user.userId;
      
      if (!canUpdateStatus) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTicket = await storage.updateTicketStatus(
        ticketId, 
        user.tenantId, 
        status, 
        resolution, 
        resolutionNotes
      );

      res.json(updatedTicket);
    } catch (error) {
      console.error("Failed to update ticket status:", error);
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  // Delete ticket (admins only)
  app.delete("/api/tickets/:id", authenticateToken, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      
      const success = await storage.deleteTicket(ticketId, user.tenantId);
      if (!success) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json({ message: "Ticket deleted successfully" });
    } catch (error) {
      console.error("Failed to delete ticket:", error);
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  // Get ticket comments
  app.get("/api/tickets/:id/comments", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      
      // Check if ticket exists and user has access
      const ticket = await storage.getTicket(ticketId, user.tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const canAccess = user.role === "admin" || 
                       user.role === "manager" ||
                       ticket.requestorId === user.userId ||
                       ticket.assignedToId === user.userId;
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const comments = await storage.getTicketComments(ticketId, user.tenantId);
      res.json(comments);
    } catch (error) {
      console.error("Failed to fetch ticket comments:", error);
      res.status(500).json({ message: "Failed to fetch ticket comments" });
    }
  });

  // Add ticket comment
  app.post("/api/tickets/:id/comments", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      
      // Check if ticket exists and user has access
      const ticket = await storage.getTicket(ticketId, user.tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const canComment = user.role === "admin" || 
                        user.role === "manager" ||
                        ticket.requestorId === user.userId ||
                        ticket.assignedToId === user.userId;
      
      if (!canComment) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get full user details for name
      const fullUser = await storage.getUser(user.userId);
      if (!fullUser || fullUser.tenantId !== user.tenantId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Parse and validate comment data
      const commentData = insertTicketCommentSchema.parse({
        ...req.body,
        ticketId,
        authorId: user.userId,
        authorName: `${fullUser.firstName} ${fullUser.lastName}`,
        authorRole: user.role,
        tenantId: user.tenantId
      });

      const comment = await storage.addTicketComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid comment data", 
          errors: error.errors 
        });
      }
      console.error("Failed to add ticket comment:", error);
      res.status(500).json({ message: "Failed to add ticket comment" });
    }
  });

  // Update ticket comment
  app.put("/api/tickets/:id/comments/:commentId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const commentId = req.params.commentId;
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }

      const updatedComment = await storage.updateTicketComment(commentId, user.tenantId, content);
      if (!updatedComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      res.json(updatedComment);
    } catch (error) {
      console.error("Failed to update ticket comment:", error);
      res.status(500).json({ message: "Failed to update ticket comment" });
    }
  });

  // Delete ticket comment
  app.delete("/api/tickets/:id/comments/:commentId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const commentId = req.params.commentId;
      
      const success = await storage.deleteTicketComment(commentId, user.tenantId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Failed to delete ticket comment:", error);
      res.status(500).json({ message: "Failed to delete ticket comment" });
    }
  });

  // Get ticket activities
  app.get("/api/tickets/:id/activities", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const ticketId = req.params.id;
      
      // Check if ticket exists and user has access
      const ticket = await storage.getTicket(ticketId, user.tenantId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const canAccess = user.role === "admin" || 
                       user.role === "manager" ||
                       ticket.requestorId === user.userId ||
                       ticket.assignedToId === user.userId;
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const activities = await storage.getTicketActivities(ticketId, user.tenantId);
      res.json(activities);
    } catch (error) {
      console.error("Failed to fetch ticket activities:", error);
      res.status(500).json({ message: "Failed to fetch ticket activities" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
