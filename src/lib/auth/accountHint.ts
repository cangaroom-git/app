"use client";

export interface ReturningAccountHint {
  name: string;
  email: string;
  avatarUrl: string | null;
  lastProvider?: "google" | "email";
}

const LAST_ACCOUNT_HINT_KEY = "cgr-last-account-hint-v1";
const LAST_USED_BOARD_KEY = "cgr-last-used-board-id-v1";

export function readReturningAccountHint(): ReturningAccountHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ACCOUNT_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReturningAccountHint>;
    if (!parsed || typeof parsed.email !== "string" || !parsed.email.includes("@")) {
      return null;
    }
    return {
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name.trim()
          : parsed.email.split("@")[0],
      email: parsed.email.trim(),
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      lastProvider:
        parsed.lastProvider === "google" || parsed.lastProvider === "email"
          ? parsed.lastProvider
          : undefined,
    };
  } catch {
    return null;
  }
}

export function saveReturningAccountHint(hint: ReturningAccountHint): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readReturningAccountHint();
    const inferredProvider: "google" | "email" | undefined =
      hint.lastProvider ??
      (existing?.email === hint.email ? existing.lastProvider : undefined) ??
      (hint.avatarUrl?.includes("googleusercontent.com") ? "google" : undefined);

    const payload: ReturningAccountHint = {
      name: hint.name || hint.email.split("@")[0],
      email: hint.email,
      avatarUrl: hint.avatarUrl ?? null,
      lastProvider: inferredProvider,
    };
    localStorage.setItem(LAST_ACCOUNT_HINT_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage restriction
  }
}

export function clearReturningAccountHint(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_ACCOUNT_HINT_KEY);
  } catch {
    // ignore
  }
}

export function maskEmailForDisplay(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function readLastUsedBoardId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_USED_BOARD_KEY);
  } catch {
    return null;
  }
}

export function saveLastUsedBoardId(boardId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!boardId) {
      localStorage.removeItem(LAST_USED_BOARD_KEY);
    } else {
      localStorage.setItem(LAST_USED_BOARD_KEY, boardId);
    }
  } catch {
    // ignore
  }
}
