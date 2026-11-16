"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import {
  authClient,
  resolveDestinationByEmail,
  resolveRoleFromEmail,
} from "@/lib/auth/client";
import { useHotelApp } from "@/components/HotelAppShell";
import { StandardButton, StatusPill } from "@/components/ui/standards";

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang, theme, toggleTheme } = useHotelApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    authClient
      .getSession()
      .then((res) => {
        const userEmail = res?.data?.user?.email;
        if (userEmail) {
          setCurrentUserEmail(userEmail);
        }
      })
      .catch(() => {});
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const callbackOrigin =
        typeof window !== "undefined" ? `${window.location.origin}/login` : "/";
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackOrigin,
      });
      if (error) {
        setErrorMessage(
          error.message ||
            (lang === "th"
              ? "ไม่สามารถเชื่อมต่อ Google Login ได้ กรุณาลองอีกครั้ง"
              : "Could not start Google login")
        );
        setIsLoading(false);
      }
    } catch {
      setErrorMessage(
        lang === "th"
          ? "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google"
          : "Google login failed"
      );
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (mode === "signup") {
        const { data, error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (error) {
          setErrorMessage(error.message || "สมัครสมาชิกไม่สำเร็จ");
          setIsLoading(false);
          return;
        }
        const target = resolveDestinationByEmail(
          data?.user?.email || email.trim()
        );
        router.push(target);
        return;
      }

      const { data, error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          lang === "th"
            ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง (หากยังไม่มีบัญชี กดสมัครสมาชิกด้านล่าง)"
            : "Invalid email or password"
        );
        setIsLoading(false);
        return;
      }

      const target = resolveDestinationByEmail(
        data?.user?.email || email.trim()
      );
      router.push(target);
    } catch {
      setErrorMessage(
        lang === "th" ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "Authentication error"
      );
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await authClient.signOut().catch(() => {});
    setCurrentUserEmail(null);
    setIsLoading(false);
  };

  const activeRole = resolveRoleFromEmail(currentUserEmail);

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--color-background-body)] text-[var(--color-text-primary)] flex flex-col justify-between select-none">
      {/* Top Minimal Header Bar */}
      <header className="w-full max-w-[1140px] mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="btn-fw-secondary">
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === "th" ? "กลับหน้าหลัก" : "Back to Home"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="btn-icon cursor-pointer ty-caption font-bold"
            title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
            aria-label={lang === "th" ? "Switch language" : "เปลี่ยนภาษา"}
          >
            {lang === "th" ? "EN" : "TH"}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="btn-icon cursor-pointer"
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            aria-label={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Open-Canvas Centered Auth Form */}
      <main className="w-full max-w-[360px] mx-auto px-4 py-8 flex flex-col items-center">
        <h1 className="ty-display text-center mb-1.5">
          {lang === "th" ? "เข้าสู่ระบบ / สมัครสมาชิก" : "Log in or sign up"}
        </h1>
        <p className="ty-caption text-center mb-6">
          {lang === "th"
            ? "เชื่อมต่อด้วย Gmail แยกสิทธิ์ลูกค้า แอดมินที่พัก และ Super Admin อัตโนมัติ"
            : "Sign in with Gmail for automatic Guest, Hotel Admin & Super Admin access"}
        </p>

        {currentUserEmail ? (
          <div className="w-full rounded-[16px] bg-[var(--color-background-muted)] p-5 space-y-4 text-center">
            <div className="flex justify-center">
              <StatusPill variant="accent">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{activeRole}</span>
              </StatusPill>
            </div>
            <div>
              <p className="ty-caption">เข้าสู่ระบบในชื่อ</p>
              <p className="ty-body font-bold text-[var(--color-text-primary)] truncate mt-0.5">
                {currentUserEmail}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <StandardButton
                type="button"
                variant="primary"
                size="md"
                fullWidth
                onClick={() =>
                  router.push(resolveDestinationByEmail(currentUserEmail))
                }
              >
                <span>
                  {activeRole === "SUPER_ADMIN"
                    ? "เข้าสู่หน้า Super Admin →"
                    : activeRole === "HOTEL_ADMIN"
                    ? "เข้าสู่หน้า Admin ที่พัก →"
                    : "กลับสู่หน้าจองห้องพัก →"}
                </span>
              </StandardButton>

              <StandardButton
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={isLoading}
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </StandardButton>
            </div>
          </div>
        ) : (
          <>
            {/* Google (Gmail) OAuth Primary Button */}
            <div className="w-full space-y-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleLogin}
                className="w-full h-11 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] ty-body font-semibold inline-flex items-center justify-center gap-2.5 px-4 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
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
                )}
                <span>
                  {lang === "th"
                    ? "ดำเนินการต่อด้วย Google (Gmail)"
                    : "Continue with Google"}
                </span>
              </button>
            </div>

            <span className="my-4 ty-caption uppercase tracking-wider text-[var(--color-text-secondary)]">
              {lang === "th" ? "หรือใช้อีเมลและรหัสผ่าน" : "OR WITH EMAIL"}
            </span>

            {errorMessage && (
              <p className="w-full mb-3 rounded-[12px] bg-[var(--color-error-muted)] px-3.5 py-2.5 ty-caption font-semibold text-[var(--color-error)] text-center">
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleEmailAuth} className="w-full space-y-2.5">
              {mode === "signup" && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === "th" ? "ชื่อผู้ใช้งาน" : "Your name"}
                  className="w-full h-10 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none transition"
                />
              )}

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  lang === "th" ? "อีเมล (เช่น cangaroomapp@gmail.com)" : "Email address"
                }
                className="w-full h-10 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none transition"
              />

              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  lang === "th" ? "รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" : "Password"
                }
                className="w-full h-10 rounded-[12px] bg-[var(--color-background-muted)] px-3.5 ty-body text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:outline-none transition"
              />

              <StandardButton
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {mode === "signin"
                    ? lang === "th"
                      ? "เข้าสู่ระบบ"
                      : "Sign in"
                    : lang === "th"
                    ? "สมัครสมาชิก"
                    : "Create account"}
                </span>
              </StandardButton>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErrorMessage(null);
              }}
              className="mt-4 ty-caption font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {mode === "signin"
                ? lang === "th"
                  ? "ยังไม่มีรหัสผ่าน? กดสมัครสมาชิกที่นี่"
                  : "Need an account? Sign up"
                : lang === "th"
                ? "มีบัญชีแล้ว? กดเข้าสู่ระบบ"
                : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </main>

      {/* Bottom Legal Links */}
      <footer className="w-full py-6 px-4 flex items-center justify-center gap-3 ty-caption text-[var(--color-text-secondary)]">
        <Link href="/" className="hover:underline">
          {lang === "th" ? "เงื่อนไขการใช้งาน" : "Terms of use"}
        </Link>
        <span>|</span>
        <Link href="/" className="hover:underline">
          {lang === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy policy"}
        </Link>
      </footer>
    </div>
  );
}
