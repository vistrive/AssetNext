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
    role: user.role,
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

export function checkPermission(userRole: string, requiredRole: string): boolean {
  const roles = ["read-only", "it-manager", "admin"];
  const userLevel = roles.indexOf(userRole);
  const requiredLevel = roles.indexOf(requiredRole);
  
  return userLevel >= requiredLevel;
}
