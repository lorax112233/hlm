import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "viewer";

const normalizeRole = (value: unknown): UserRole => {
  if (typeof value !== "string") {
    return "viewer";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "admin") {
    return "admin";
  }

  return "viewer";
};

export const getUserRole = (user: User | null): UserRole => {
  if (!user) {
    return "viewer";
  }

  const appRole = user.app_metadata?.role;
  if (appRole) {
    return normalizeRole(appRole);
  }

  const userRole = user.user_metadata?.role;
  return normalizeRole(userRole);
};

export const canDeleteHardware = (role: UserRole) => role === "admin";

export const canManageHardware = (role: UserRole) => role === "admin";

export const canDeleteMaintenance = (role: UserRole) =>
  role === "admin";

export const canManageMaintenance = (role: UserRole) => role === "admin";

export const formatRole = (role: UserRole) => {
  if (role === "admin") {
    return "Admin";
  }

  return "Viewer";
};
