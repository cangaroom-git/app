"use client";

import { createAuthClient } from "@neon/auth/next";

export const authClient = createAuthClient();

export type AppUserRole = "SUPER_ADMIN" | "HOTEL_ADMIN" | "GUEST";

/**
 * Maps an authenticated user's email to one of the 3 platform roles:
 * 1. SUPER_ADMIN: Platform owner (cangaroomapp@gmail.com, *@cangaroom.com)
 * 2. HOTEL_ADMIN: Property owner/manager (sapanunseen@gmail.com, owner@*, admin@*, booking@*)
 * 3. GUEST: Direct booking customer (any other Gmail / email)
 */
export function resolveRoleFromEmail(email?: string | null): AppUserRole {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return "GUEST";

  if (
    normalized === "cangaroomapp@gmail.com" ||
    normalized.endsWith("@cangaroom.com") ||
    normalized.endsWith("@myhotel.app") ||
    normalized === "super@cangaroom.com" ||
    normalized === "saas@cangaroom.com"
  ) {
    return "SUPER_ADMIN";
  }

  if (
    normalized === "sapanunseen@gmail.com" ||
    normalized.includes("sapanunseen") ||
    normalized.startsWith("owner@") ||
    normalized.startsWith("admin@") ||
    normalized.startsWith("booking@")
  ) {
    return "HOTEL_ADMIN";
  }

  return "GUEST";
}

export function resolveDestinationByEmail(email?: string | null): string {
  const role = resolveRoleFromEmail(email);
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "HOTEL_ADMIN") return "/admin";
  return "/";
}

