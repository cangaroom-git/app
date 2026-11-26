"use client";

import { createAuthClient } from "@neon/auth/next";
import type { AppRole } from "@/types/cangaroom";

export const authClient = createAuthClient();

export type AppUserRole = AppRole;

const SUPER_ADMIN_EMAILS = new Set([
  "cangaroomapp@gmail.com",
  "super@cangaroom.com",
  "saas@cangaroom.com",
]);

export function resolveRoleFromEmail(email?: string | null): AppRole {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return "TRAVELLER";

  if (
    SUPER_ADMIN_EMAILS.has(normalized) ||
    normalized.endsWith("@cangaroom.com") ||
    normalized.endsWith("@nondii.com")
  ) {
    return "SUPER_ADMIN";
  }

  return "TRAVELLER";
}

export function resolveDestinationByRole(role?: AppRole | null): string {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "HOTEL_OWNER") return "/studio";
  return "/";
}
