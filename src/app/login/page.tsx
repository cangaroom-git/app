"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Loader2,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import {
  authClient,
  resolveDestinationByRole,
} from "@/lib/auth/client";
import { useHotelApp } from "@/components/HotelAppShell";
import { UserAvatarCircle } from "@/components/navigation/UserProfileDropdown";
import { StandardButton, StatusPill } from "@/components/ui/standards";

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang, theme, toggleTheme, user, refreshMe, signOutUser } =
    useHotelApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cb = new URLSearchParams(window.location.search).get("callbackUrl");
    if (cb && cb.startsWith("/")) setCallbackUrl(cb);
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl ? `${origin}${callbackUrl}` : `${origin}/login`,
      });
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
        const { error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (error) {
          setErrorMessage(error.message || "สมัครสมาชิกไม่สำเร็จ");
          setIsLoading(false);
          return;
        }
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorMessage(
            lang === "th"
              ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
              : "Invalid email or password"
          );
          setIsLoading(false);
          return;
        }
      }

      await refreshMe();
      const meRes = await fetch("/api/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => ({}));
      const dest =
        callbackUrl || resolveDestinationByRole(meData?.user?.role ?? "TRAVELLER");
      router.push(dest);
    } catch {
      setErrorMessage(
        lang === "th" ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "Authentication error"
      );
      setIsLoading(false);
    }
  };

  const destinationHref =
    callbackUrl || resolveDestinationByRole(user?.role ?? "TRAVELLER");

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--color-background-body)] text-[var(--color-text-primary)] flex flex-col justify-between select-none">
      <header className="w-full h-14 bg-[var(--color-background-card)] border-b border-[var(--color-border)] px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="btn-fw-secondary !h-9">
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === "th" ? "กลับหน้าแรก" : "Home"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="btn-icon ty-caption font-bold"
          >
            {lang === "th" ? "EN" : "TH"}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="btn-icon"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      <main className="w-full max-w-[420px] mx-auto px-4 py-8 space-y-4">
        <div className="app-card p-5 sm:p-6 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="ty-display text-[var(--color-text-primary)]">Cangaroom</h1>
            <p className="ty-body-muted">
              {lang === "th"
                ? "บันทึกบอร์ดที่พัก เก็บคูปอง และจองตรง 0% GP"
                : "Save stays, collect coupons & book direct 0% GP"}
            </p>
          </div>

          {user ? (
            <div className="space-y-4 pt-1">
              <div className="rounded-[12px] bg-[var(--color-background-muted)] p-3.5 flex items-center gap-3">
                <UserAvatarCircle user={user} sizeClass="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="ty-subtitle font-bold truncate">{user.name}</p>
                    <StatusPill variant="accent">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{user.role}</span>
                    </StatusPill>
                  </div>
                  <p className="ty-caption truncate">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <StandardButton
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => router.push(destinationHref)}
                >
                  <span>
                    {user.role === "SUPER_ADMIN"
                      ? "เข้าสู่หน้า Super Admin"
                      : user.role === "HOTEL_OWNER"
                      ? "เข้าสู่ Hotel Studio"
                      : "ไปหน้าแรกสำรวจที่พัก"}
                  </span>
                </StandardButton>

                {user.ownedHotels.length === 0 && (
                  <StandardButton
                    type="button"
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={() => router.push("/register-hotel")}
                  >
                    <Building2 className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>เปิดเพจที่พักฟรี 0% GP ตลอดชีพ</span>
                  </StandardButton>
                )}

                <StandardButton
                  type="button"
                  variant="subtle"
                  size="md"
                  fullWidth
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    await signOutUser();
                    setIsLoading(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </StandardButton>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleLogin}
                className="w-full h-11 rounded-[10px] border border-[var(--color-border-emphasized)] bg-[var(--color-background-card)] hover:bg-[var(--color-background-muted)] ty-body font-semibold inline-flex items-center justify-center gap-2.5 px-4 transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 shrink-0"
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
                    ? "ดำเนินการต่อด้วย Google"
                    : "Continue with Google"}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="ty-caption">
                  {lang === "th" ? "หรือใช้อีเมล" : "or"}
                </span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              {errorMessage && (
                <p className="w-full rounded-[10px] bg-[var(--color-error-muted)] px-3.5 py-2.5 ty-caption font-semibold text-[var(--color-error)] text-center">
                  {errorMessage}
                </p>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === "signup" && (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === "th" ? "ชื่อผู้ใช้งาน" : "Your name"}
                    className="fw-input w-full"
                  />
                )}

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === "th" ? "อีเมล" : "Email address"}
                  className="fw-input w-full"
                />

                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    lang === "th"
                      ? "รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
                      : "Password"
                  }
                  className="fw-input w-full"
                />

                <StandardButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {mode === "signin"
                      ? lang === "th"
                        ? "เข้าสู่ระบบ"
                        : "Log In"
                      : lang === "th"
                      ? "สร้างบัญชีใหม่"
                      : "Create Account"}
                  </span>
                </StandardButton>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setErrorMessage(null);
                  }}
                  className="ty-caption font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
                >
                  {mode === "signin"
                    ? lang === "th"
                      ? "สร้างบัญชีใหม่ด้วยอีเมล"
                      : "Create new email account"
                    : lang === "th"
                    ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"
                    : "Already have an account? Log in"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/register-hotel"
            className="ty-body text-[var(--color-text-secondary)] hover:underline"
          >
            <strong className="text-[var(--color-text-primary)]">
              {lang === "th"
                ? "เปิดเพจที่พักฟรี 0% GP ตลอดชีพ"
                : "Create a Free 0% GP Hotel Profile"}
            </strong>{" "}
            {lang === "th"
              ? "สำหรับโรงแรม รีสอร์ท และพูลวิลล่าของคุณ"
              : "for your resort, hotel, or pool villa."}
          </Link>
        </div>
      </main>

      <footer className="w-full py-5 px-4 text-center ty-caption">
        Cangaroom © {new Date().getFullYear()} · Direct Stay Platform
      </footer>
    </div>
  );
}
