"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import {
  clearReturningAccountHint,
  maskEmailForDisplay,
  readReturningAccountHint,
  saveReturningAccountHint,
  type ReturningAccountHint,
} from "@/lib/auth/accountHint";
import type { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  StandardFieldGroup,
  StandardInput,
} from "@/components/ui/standards";

export interface AuthPromptModalProps {
  isOpen: boolean;
  language: LanguageCode;
  reasonText?: string | null;
  onClose: () => void;
  onAuthenticated: () => Promise<void> | void;
}

function GoogleMarkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

export function AuthPromptModal({
  isOpen,
  language,
  reasonText,
  onClose,
  onAuthenticated,
}: AuthPromptModalProps) {
  const isTh = language === "th";
  useBodyScrollLock(isOpen);

  const [returningHint, setReturningHint] =
    useState<ReturningAccountHint | null>(null);
  const [step, setStep] = useState<"welcome-back" | "email-entry" | "password">(
    "email-entry"
  );
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const hint = readReturningAccountHint();
    setReturningHint(hint);
    setAvatarFailed(false);
    setErrorMsg(null);
    setPassword("");
    setName("");
    setAuthMode("signin");
    if (hint) {
      setEmail(hint.email);
      setStep("welcome-back");
    } else {
      setEmail("");
      setStep("email-entry");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (returningHint) {
        saveReturningAccountHint({ ...returningHint, lastProvider: "google" });
      }
      const callbackURL =
        typeof window !== "undefined" ? window.location.href : "/";
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (res && "error" in res && res.error) {
        setErrorMsg(
          res.error.message ||
            (isTh
              ? "เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่"
              : "Failed to connect Google sign-in")
        );
        setIsLoading(false);
      }
    } catch {
      setErrorMsg(
        isTh
          ? "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google"
          : "Google sign-in failed"
      );
      setIsLoading(false);
    }
  };

  const handleReturningLoginClick = async () => {
    if (!returningHint) {
      setStep("email-entry");
      return;
    }
    if (returningHint.lastProvider === "google") {
      await handleGoogleSignIn();
      return;
    }
    setEmail(returningHint.email);
    setAuthMode("signin");
    setErrorMsg(null);
    setStep("password");
  };

  const handleNotYou = () => {
    clearReturningAccountHint();
    setReturningHint(null);
    setEmail("");
    setPassword("");
    setErrorMsg(null);
    setStep("email-entry");
  };

  const handleContinueEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg(
        isTh ? "กรุณากรอกอีเมลให้ถูกต้อง" : "Please enter a valid email address"
      );
      return;
    }
    setErrorMsg(null);
    setStep("password");
  };

  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (authMode === "signup") {
        const displayName = name.trim() || trimmedEmail.split("@")[0];
        const { error } = await authClient.signUp.email({
          email: trimmedEmail,
          password,
          name: displayName,
        });
        if (error) {
          setErrorMsg(
            error.message ||
              (isTh ? "สมัครสมาชิกไม่สำเร็จ" : "Sign up failed")
          );
          setIsLoading(false);
          return;
        }
        saveReturningAccountHint({
          name: displayName,
          email: trimmedEmail,
          avatarUrl: null,
          lastProvider: "email",
        });
      } else {
        const { error } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        });
        if (error) {
          setErrorMsg(
            isTh
              ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
              : "Invalid email or password"
          );
          setIsLoading(false);
          return;
        }
        saveReturningAccountHint({
          name: returningHint?.name || trimmedEmail.split("@")[0],
          email: trimmedEmail,
          avatarUrl: returningHint?.avatarUrl ?? null,
          lastProvider: "email",
        });
      }

      await onAuthenticated();
      setIsLoading(false);
      onClose();
    } catch {
      setErrorMsg(
        isTh ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "Authentication error"
      );
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "เข้าสู่ระบบหรือสมัครสมาชิก" : "Log in or sign up"}
      onClick={onClose}
      className="fixed inset-0 z-[92] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 animate-fade-in-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[432px] max-h-[82dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[20px] bg-[var(--color-background-popover)] border-t sm:border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] px-6 pt-3 sm:pt-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:pb-7 animate-slide-up-sheet sm:animate-none"
      >
        {/* Mobile Sheet Drag Handle */}
        <div className="sm:hidden pb-2 flex justify-center">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        {/* Close (X) Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={isTh ? "ปิด" : "Close"}
          className="absolute top-4 right-4 h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ================================================================
            VIEW A: RETURNING USER ("Welcome back, {Name}") — Images 2 & 3
        ================================================================ */}
        {step === "welcome-back" && returningHint ? (
          <div className="pt-4 pb-1 flex flex-col items-center text-center space-y-5">
            {returningHint.avatarUrl && !avatarFailed ? (
              <img
                src={returningHint.avatarUrl}
                alt={returningHint.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-16 w-16 rounded-full object-cover bg-[var(--color-background-muted)]"
              />
            ) : (
              <span className="h-16 w-16 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center text-[22px] font-semibold">
                {(returningHint.name[0] || "U").toUpperCase()}
              </span>
            )}

            <div className="space-y-1.5">
              <h2 className="text-[21px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                {isTh
                  ? `ยินดีต้อนรับกลับ, ${returningHint.name}`
                  : `Welcome back, ${returningHint.name}`}
              </h2>
              <p className="inline-flex items-center justify-center gap-1.5 text-[14px] text-[var(--color-text-secondary)]">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{maskEmailForDisplay(returningHint.email)}</span>
              </p>
            </div>

            {reasonText && (
              <p className="text-[13px] text-[var(--color-text-secondary)] max-w-[300px]">
                {reasonText}
              </p>
            )}

            {errorMsg && (
              <div className="w-full rounded-[10px] bg-[var(--color-error-muted)] px-3.5 py-2.5 text-[13px] text-[var(--color-error)]">
                {errorMsg}
              </div>
            )}

            <div className="w-full space-y-3 pt-1">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleReturningLoginClick}
                className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {returningHint.lastProvider === "google"
                    ? isTh
                      ? "เข้าสู่ระบบด้วย Google"
                      : "Continue with Google"
                    : isTh
                    ? "เข้าสู่ระบบ"
                    : "Log in"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNotYou}
                className="w-full h-10 rounded-[10px] text-[14px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)] underline underline-offset-2 cursor-pointer transition-colors"
              >
                {isTh ? "ไม่ใช่บัญชีของคุณ?" : "Not you?"}
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================
              VIEW B: FIRST-TIME / EMAIL ENTRY & PASSWORD — Image 1
          ================================================================ */
          <div className="pt-2 space-y-5">
            <div className="text-center space-y-1.5">
              <span className="inline-flex h-10 w-10 rounded-[12px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] items-center justify-center text-[17px] font-semibold mx-auto">
                C
              </span>
              <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
                {step === "password"
                  ? authMode === "signup"
                    ? isTh
                      ? "สร้างบัญชี Cangaroom"
                      : "Finish signing up"
                    : isTh
                    ? "กรอกรหัสผ่านเพื่อเข้าสู่ระบบ"
                    : "Enter your password"
                  : isTh
                  ? "เข้าสู่ระบบหรือสมัครสมาชิก"
                  : "Log in or sign up"}
              </h2>
              {reasonText && (
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  {reasonText}
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="rounded-[10px] bg-[var(--color-error-muted)] px-3.5 py-2.5 text-[13px] text-[var(--color-error)] text-center">
                {errorMsg}
              </div>
            )}

            {step === "email-entry" ? (
              <form onSubmit={handleContinueEmail} className="space-y-3.5">
                <StandardInput
                  label={isTh ? "อีเมล" : "Email address"}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
                <button
                  type="submit"
                  className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold cursor-pointer transition-colors"
                >
                  {isTh ? "ดำเนินการต่อ" : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitCredentials} className="space-y-3.5">
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[12px] bg-[var(--color-background-muted)] text-[13.5px]">
                  <span className="truncate text-[var(--color-text-primary)] font-medium">
                    {email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email-entry");
                      setErrorMsg(null);
                    }}
                    className="text-[12.5px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 shrink-0 cursor-pointer"
                  >
                    {isTh ? "เปลี่ยน" : "Change"}
                  </button>
                </div>

                <StandardFieldGroup>
                  {authMode === "signup" && (
                    <StandardInput
                      grouped
                      label={isTh ? "ชื่อที่แสดง" : "Display name"}
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isTh ? "เช่น คุณกานต์" : "Your name"}
                    />
                  )}

                  <StandardInput
                    grouped
                    label={isTh ? "รหัสผ่าน" : "Password"}
                    optionalText={isTh ? "อย่างน้อย 6 ตัวอักษร" : "Min 6 chars"}
                    type="password"
                    required
                    minLength={6}
                    autoFocus
                    autoComplete={
                      authMode === "signup" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </StandardFieldGroup>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[15px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {authMode === "signup"
                      ? isTh
                        ? "สมัครสมาชิก"
                        : "Create account"
                      : isTh
                      ? "เข้าสู่ระบบ"
                      : "Log in"}
                  </span>
                </button>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode((m) => (m === "signin" ? "signup" : "signin"));
                      setErrorMsg(null);
                    }}
                    className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2 cursor-pointer"
                  >
                    {authMode === "signin"
                      ? isTh
                        ? "ยังไม่มีบัญชี? สมัครสมาชิกใหม่"
                        : "New to Cangaroom? Create an account"
                      : isTh
                      ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"
                      : "Already have an account? Log in"}
                  </button>
                </div>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-[var(--color-border)]" />
              <span className="relative bg-[var(--color-background-popover)] px-3 text-[12.5px] text-[var(--color-text-secondary)]">
                {isTh ? "หรือ" : "or"}
              </span>
            </div>

            {/* Google OAuth Squircle Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full h-12 px-4 rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-primary)] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2.5 cursor-pointer transition-colors disabled:opacity-60"
            >
              <GoogleMarkIcon className="w-5 h-5 shrink-0" />
              <span>
                {isTh ? "ดำเนินการต่อด้วย Google" : "Continue with Google"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
