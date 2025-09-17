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
  type InsertMasterData
} from "@shared/schema";
import { randomUUID } from "crypto";
import { hashPassword } from "./services/auth";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;

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
      tenantId: tenant.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

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

    // Seed sample master data
    const sampleMasterData: MasterData[] = [
      // Manufacturers
      { id: "master-1", type: "manufacturer", value: "Apple", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-2", type: "manufacturer", value: "Dell", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-3", type: "manufacturer", value: "HP", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-4", type: "manufacturer", value: "Lenovo", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-5", type: "manufacturer", value: "Microsoft", tenantId: tenant.id, createdAt: new Date() },
      
      // Models
      { id: "master-6", type: "model", value: "MacBook Pro", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-7", type: "model", value: "MacBook Air", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-8", type: "model", value: "OptiPlex 7090", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-9", type: "model", value: "EliteBook 850", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-10", type: "model", value: "ThinkPad X1 Carbon", tenantId: tenant.id, createdAt: new Date() },
      
      // Categories
      { id: "master-11", type: "category", value: "laptop", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-12", type: "category", value: "desktop", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-13", type: "category", value: "server", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-14", type: "category", value: "monitor", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-15", type: "category", value: "printer", tenantId: tenant.id, createdAt: new Date() },
      
      // Locations
      { id: "master-16", type: "location", value: "Office Floor 1", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-17", type: "location", value: "Office Floor 2", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-18", type: "location", value: "Storage Room A", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-19", type: "location", value: "Storage Room B", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-20", type: "location", value: "Warehouse", tenantId: tenant.id, createdAt: new Date() },
      
      // Vendor Names
      { id: "master-21", type: "vendor", value: "Apple Inc.", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-22", type: "vendor", value: "Dell Technologies", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-23", type: "vendor", value: "HP Inc.", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-24", type: "vendor", value: "Lenovo Group", tenantId: tenant.id, createdAt: new Date() },
      
      // Company Names
      { id: "master-25", type: "company", value: "Apple Inc.", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-26", type: "company", value: "Dell Technologies Inc.", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-27", type: "company", value: "HP Inc.", tenantId: tenant.id, createdAt: new Date() },
      { id: "master-28", type: "company", value: "Lenovo Group Ltd.", tenantId: tenant.id, createdAt: new Date() },
    ];

    sampleMasterData.forEach(data => this.masterData.set(data.id, data));
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
    
    const updatedUser = { ...user, ...updateUser, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
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
