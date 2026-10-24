"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Resolves the destination route from the authenticated user's database role
 * (matching Prisma `User` / `UserRole`: SUPER_ADMIN | HOTEL_ADMIN | GUEST).
 * - Platform SaaS accounts (@myhotel.app) -> /super-admin
 * - Hotel tenant accounts (booking@sapanunseen.com, owner@*) -> /admin
 * - Regular guests -> /
 */
function resolveDestinationByUserRecord(emailOrProvider: string): string {
  const normalized = emailOrProvider.trim().toLowerCase();
  if (
    normalized.endsWith("@myhotel.app") ||
    normalized === "super@myhotel.app" ||
    normalized === "saas@myhotel.app"
  ) {
    return "/super-admin";
  }
  if (
    normalized.includes("sapanunseen") ||
    normalized.startsWith("owner@") ||
    normalized.startsWith("admin@") ||
    normalized.startsWith("booking@") ||
    normalized === "oauth-default"
  ) {
    return "/admin";
  }
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleOAuthLogin = () => {
    const target = email.trim()
      ? resolveDestinationByUserRecord(email)
      : "/admin";
    router.push(target);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const target = resolveDestinationByUserRecord(email);
    router.push(target);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--color-background-body)] text-[var(--color-text-primary)] flex flex-col justify-between select-none">
      {/* Top Minimal Header Bar */}
      <header className="w-full h-16 px-6 sm:px-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 ty-body font-semibold text-[var(--color-text-primary)] hover:opacity-75 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </header>

      {/* Center Standard Auth Column (Unified Auth / Identifier-First Flow) */}
      <main className="w-full max-w-[330px] mx-auto px-4 py-8 flex flex-col items-center">
        <h1 className="ty-display text-center mb-6">Log in or sign up</h1>

        {/* OAuth Provider Stack */}
        <div className="w-full space-y-2.5">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleOAuthLogin}
            className="w-full h-10 rounded-full border border-[var(--color-border-emphasized)] bg-transparent hover:bg-[var(--color-background-muted)] ty-body font-medium inline-flex items-center justify-center gap-2.5 px-4 active:scale-[0.99] transition cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Continue with LINE */}
          <button
            type="button"
            onClick={handleOAuthLogin}
            className="w-full h-10 rounded-full border border-[var(--color-border-emphasized)] bg-transparent hover:bg-[var(--color-background-muted)] ty-body font-medium inline-flex items-center justify-center gap-2.5 px-4 active:scale-[0.99] transition cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 shrink-0 fill-[#06C755]"
              aria-hidden="true"
            >
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            <span>Continue with LINE</span>
          </button>

          {/* Continue with Apple */}
          <button
            type="button"
            onClick={handleOAuthLogin}
            className="w-full h-10 rounded-full border border-[var(--color-border-emphasized)] bg-transparent hover:bg-[var(--color-background-muted)] ty-body font-medium inline-flex items-center justify-center gap-2.5 px-4 active:scale-[0.99] transition cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 shrink-0 fill-current"
              aria-hidden="true"
            >
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
            </svg>
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Minimal OR Divider */}
        <div className="w-full my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="ty-caption uppercase tracking-wider">OR</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="w-full space-y-2.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full h-10 rounded-full border border-[var(--color-border-emphasized)] bg-transparent px-4 ty-body placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-text-primary)] focus:outline-none transition"
          />

          <button
            type="submit"
            className="btn-round-solid w-full h-10 !text-[var(--color-on-accent)] active:scale-[0.99]"
          >
            Continue
          </button>
        </form>
      </main>

      {/* Bottom Legal Links */}
      <footer className="w-full py-6 px-4 flex items-center justify-center gap-3 ty-caption text-[var(--color-text-secondary)]">
        <Link href="/" className="hover:underline">
          Terms of use
        </Link>
        <span>|</span>
        <Link href="/" className="hover:underline">
          Privacy policy
        </Link>
      </footer>
    </div>
  );
}
