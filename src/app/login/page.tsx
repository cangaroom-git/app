"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  User,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { AnimatedAiBotAvatar } from "@/components/AnimatedAiBot";

type LoginRole = "HOTEL_ADMIN" | "GUEST" | "SUPER_ADMIN";

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<LoginRole>("HOTEL_ADMIN");

  const handleSocialLogin = () => {
    if (selectedRole === "SUPER_ADMIN") {
      router.push("/super-admin");
    } else if (selectedRole === "HOTEL_ADMIN") {
      router.push("/admin");
    } else {
      router.push("/setting");
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px] app-card p-6 sm:p-8 space-y-6">
        {/* Top Back Button + Animated Monochrome Bot */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            title="กลับหน้าหลัก"
            className="h-9 w-9 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-overlay-hover)] inline-flex items-center justify-center text-[var(--color-text-primary)] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>

          <AnimatedAiBotAvatar size="md" isActive={false} isSpeaking={false} />

          <div className="w-9" />
        </div>

        {/* Minimalist Title */}
        <div className="text-center space-y-1">
          <h1 className="ty-display">Sign in</h1>
          <p className="ty-caption">LINE Official & Google Account</p>
        </div>

        {/* Icon-First Role Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-full bg-[var(--color-background-muted)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setSelectedRole("HOTEL_ADMIN")}
            className={`h-10 rounded-full inline-flex items-center justify-center gap-1.5 ty-caption font-semibold transition cursor-pointer ${
              selectedRole === "HOTEL_ADMIN"
                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hotel</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("GUEST")}
            className={`h-10 rounded-full inline-flex items-center justify-center gap-1.5 ty-caption font-semibold transition cursor-pointer ${
              selectedRole === "GUEST"
                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Guest</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("SUPER_ADMIN")}
            className={`h-10 rounded-full inline-flex items-center justify-center gap-1.5 ty-caption font-semibold transition cursor-pointer ${
              selectedRole === "SUPER_ADMIN"
                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SaaS</span>
          </button>
        </div>

        {/* One-Click Social Login Buttons */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleSocialLogin}
            className="w-full h-12 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] font-semibold ty-body inline-flex items-center justify-between px-5 hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
          >
            <span className="inline-flex items-center gap-3">
              {/* Minimalist LINE Bubble SVG */}
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                aria-hidden="true"
              >
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              <span>Continue with LINE</span>
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSocialLogin}
            className="w-full h-12 rounded-full bg-[var(--color-background-card)] border border-[var(--color-border-emphasized)] text-[var(--color-text-primary)] font-semibold ty-body inline-flex items-center justify-between px-5 hover:bg-[var(--color-overlay-hover)] active:scale-[0.98] transition cursor-pointer"
          >
            <span className="inline-flex items-center gap-3">
              {/* Minimalist Google G SVG */}
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                aria-hidden="true"
              >
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              <span>Continue with Google</span>
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
