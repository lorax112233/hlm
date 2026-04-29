import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "technician";

// Normalize unknown role strings and default to technician for safety.
const normalizeRole = (value: unknown): UserRole => {
  if (typeof value !== "string") {
    return "technician";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "admin") {
    return "admin";
  }

  return "technician";
};

// Read role from JWT app metadata first, then fallback to user metadata.
export const getUserRole = (user: User | null): UserRole => {
  if (!user) {
    return "technician";
  }

  const appRole = user.app_metadata?.role;
  if (appRole) {
    return normalizeRole(appRole);
  }

  const userRole = user.user_metadata?.role;
  return normalizeRole(userRole);
};

// Frontend permission helpers mirror backend policy intent.
export const canDeleteHardware = (role: UserRole) => role === "admin";

export const canManageHardware = (role: UserRole) => role === "admin";

export const canDeleteMaintenance = (role: UserRole) =>
  role === "admin";

export const canManageMaintenance = (role: UserRole) =>
  role === "admin" || role === "technician";

// Small display helper for badges and profile labels.
export const formatRole = (role: UserRole) => {
  if (role === "admin") {
    return "Admin";
  }

  return "Technician";
};

