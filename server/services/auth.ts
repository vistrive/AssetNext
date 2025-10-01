import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { type User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "fallback-secret";

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: migrateRole(user.role), // Ensure JWT contains migrated role
    email: user.email,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Role constants to ensure consistency across the application
export const ROLES = {
  TECHNICIAN: "technician",
  IT_MANAGER: "it-manager", 
  ADMIN: "admin",
  SUPER_ADMIN: "super-admin"
} as const;

export const ROLE_HIERARCHY = [ROLES.TECHNICIAN, ROLES.IT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

export function checkPermission(userRole: string, requiredRole: string): boolean {
  
  // Migrate old roles to new roles for backward compatibility
  const migratedUserRole = migrateRole(userRole);
  const migratedRequiredRole = migrateRole(requiredRole);
  
  // Special case: Both super-admin and admin have identical privileges across all features
  // The only difference is in admin creation, which is handled by canAssignRole()
  const normalizedUserRole = (migratedUserRole === ROLES.SUPER_ADMIN) ? ROLES.ADMIN : migratedUserRole as any;
  const normalizedRequiredRole = (migratedRequiredRole === ROLES.SUPER_ADMIN) ? ROLES.ADMIN : migratedRequiredRole as any;
  
  const userLevel = ROLE_HIERARCHY.indexOf(normalizedUserRole as any);
  const requiredLevel = ROLE_HIERARCHY.indexOf(normalizedRequiredRole as any);
  
  // Security guard: reject unknown roles to prevent privilege escalation
  if (userLevel === -1 || requiredLevel === -1) {
    console.error(`Unknown role detected - user: ${normalizedUserRole}, required: ${normalizedRequiredRole}`);
    return false;
  }
  
  return userLevel >= requiredLevel;
}

// Helper function to migrate old roles to new roles
export function migrateRole(oldRole: string): string {
  const roleMigration: Record<string, string> = {
    "read-only": "technician",
    "employee": "technician", 
    "manager": "it-manager"
  };
  
  return roleMigration[oldRole] || oldRole;
}

// Helper function to check if a user can assign a specific role
export function canAssignRole(currentUserRole: string, targetRole: string): boolean {
  const migratedCurrentRole = migrateRole(currentUserRole);
  const migratedTargetRole = migrateRole(targetRole);
  
  // Super admin can assign any role except super-admin (only one per tenant)
  if (migratedCurrentRole === ROLES.SUPER_ADMIN) {
    return [ROLES.ADMIN, ROLES.IT_MANAGER, ROLES.TECHNICIAN].includes(migratedTargetRole as any);
  }
  
  // Admin can assign only IT Manager and Technician roles
  if (migratedCurrentRole === ROLES.ADMIN) {
    return [ROLES.IT_MANAGER, ROLES.TECHNICIAN].includes(migratedTargetRole as any);
  }
  
  // IT Managers and Technicians cannot assign roles
  return false;
}

// Helper function to get allowed roles for a user to assign
export function getAllowedRolesForAssignment(currentUserRole: string): string[] {
  const migratedCurrentRole = migrateRole(currentUserRole);
  
  if (migratedCurrentRole === ROLES.SUPER_ADMIN) {
    return [ROLES.ADMIN, ROLES.IT_MANAGER, ROLES.TECHNICIAN];
  }
  
  if (migratedCurrentRole === ROLES.ADMIN) {
    return [ROLES.IT_MANAGER, ROLES.TECHNICIAN];
  }
  
  return [];
}
