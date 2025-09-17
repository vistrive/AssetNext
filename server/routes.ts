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
  type LoginRequest,
  type RegisterRequest
} from "@shared/schema";

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

  app.post("/api/auth/verify", authenticateToken, async (req: Request, res: Response) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
