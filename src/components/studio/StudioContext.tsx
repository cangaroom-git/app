"use client";

import React, {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { useHotelApp } from "@/components/HotelAppShell";
import type { StudioPayload } from "@/components/studio/studioTypes";

interface StudioContextValue {
  data: StudioPayload;
  isLoading: boolean;
  notice: string | null;
  reload: () => Promise<void>;
  notify: (msg: string) => void;
  switchHotel: (nextSlug: string) => void;
  buildHref: (path: string) => string;
  requestedHotelSlug: string | null;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudio must be used within StudioProvider");
  }
  return ctx;
}

function StudioProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/studio";
  const searchParams = useSearchParams();
  const requestedHotelSlug = searchParams.get("hotel");

  const { user, isCheckingSession } = useHotelApp();

  const [studioData, setStudioData] = useState<StudioPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const loadStudioData = useCallback(async () => {
    if (!user) {
      setStudioData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);
    try {
      const qs = requestedHotelSlug
        ? `?hotel=${encodeURIComponent(requestedHotelSlug)}`
        : "";
      const res = await fetch(`/api/studio/hotel${qs}`, { cache: "no-store" });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorStatus(res.status);
        setErrorMessage(errJson.error || "ไม่สามารถโหลดข้อมูล Hotel Studio ได้");
        setStudioData(null);
        return;
      }
      const payload = (await res.json()) as StudioPayload;
      setStudioData(payload);
    } catch {
      setErrorStatus(500);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [user, requestedHotelSlug]);

  useEffect(() => {
    if (isCheckingSession) return;
    void loadStudioData();
  }, [isCheckingSession, loadStudioData]);

  const buildHref = useCallback(
    (path: string) => {
      if (!requestedHotelSlug) return path;
      const sep = path.includes("?") ? "&" : "?";
      return `${path}${sep}hotel=${encodeURIComponent(requestedHotelSlug)}`;
    },
    [requestedHotelSlug]
  );

  const switchHotel = useCallback(
    (nextSlug: string) => {
      // Keep current section when switching properties, but avoid stale room codes
      const basePath = pathname.startsWith("/studio/calendar/")
        ? "/studio/calendar"
        : pathname;
      router.push(`${basePath}?hotel=${encodeURIComponent(nextSlug)}`);
    },
    [pathname, router]
  );

  const contextValue = useMemo<StudioContextValue | null>(() => {
    if (!studioData) return null;
    return {
      data: studioData,
      isLoading,
      notice,
      reload: loadStudioData,
      notify,
      switchHotel,
      buildHref,
      requestedHotelSlug,
    };
  }, [
    studioData,
    isLoading,
    notice,
    loadStudioData,
    notify,
    switchHotel,
    buildHref,
    requestedHotelSlug,
  ]);

  if (isCheckingSession || (isLoading && !studioData)) {
    return (
      <div className="min-h-screen bg-[var(--color-background-body)] flex flex-col">
        <div className="h-16 border-b border-[var(--color-border)] px-4 sm:px-8 lg:px-10 flex items-center justify-between">
          <div className="h-6 w-36 rounded-[8px] bg-[var(--color-background-muted)] animate-pulse" />
          <div className="hidden lg:flex items-center gap-6">
            <div className="h-5 w-14 rounded-[8px] bg-[var(--color-background-muted)] animate-pulse" />
            <div className="h-5 w-16 rounded-[8px] bg-[var(--color-background-muted)] animate-pulse" />
            <div className="h-5 w-14 rounded-[8px] bg-[var(--color-background-muted)] animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-[10px] bg-[var(--color-background-muted)] animate-pulse" />
        </div>
        <div className="max-w-[1360px] w-full mx-auto px-6 lg:px-12 py-12 space-y-6 animate-pulse">
          <div className="h-8 w-56 rounded-[10px] bg-[var(--color-background-muted)]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-56 rounded-[16px] bg-[var(--color-background-muted)]" />
            <div className="h-56 rounded-[16px] bg-[var(--color-background-muted)]" />
            <div className="h-56 rounded-[16px] bg-[var(--color-background-muted)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-background-body)] flex items-center justify-center px-6 py-16">
        <div className="max-w-[440px] w-full text-center space-y-5">
          <span className="h-14 w-14 mx-auto rounded-[16px] bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)]">
            <Building2 className="w-7 h-7" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[24px] font-semibold text-[var(--color-text-primary)]">
              เข้าสู่ระบบเจ้าของสถานที่
            </h1>
            <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
              จัดการหน้าโปรไฟล์สถานที่ โพสต์ โปรโมชั่น และระบบจองตรง 0% GP ของคุณในที่เดียว
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/login?next=/studio"
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14.5px] font-semibold inline-flex items-center transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/"
              className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center transition-colors"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!contextValue) {
    return (
      <div className="min-h-screen bg-[var(--color-background-body)] flex items-center justify-center px-6 py-16">
        <div className="max-w-[480px] w-full text-center space-y-5">
          <span className="h-14 w-14 mx-auto rounded-[16px] bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[var(--color-text-primary)]">
            <Building2 className="w-7 h-7" />
          </span>
          <div className="space-y-2">
            <h1 className="text-[24px] font-semibold text-[var(--color-text-primary)]">
              {errorStatus === 404
                ? "เริ่มต้นเปิดหน้าธุรกิจฟรีกับ Nondii"
                : "ไม่สามารถเปิด Nondii Studio ได้"}
            </h1>
            <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
              {errorStatus === 404
                ? "เปิดหน้าโปรไฟล์โรงแรม คาเฟ่ ร้านอาหาร ที่เที่ยว หรือสปา พร้อมปักหมุดแผนที่และลงโปรโมชั่นได้ฟรีตลอดชีพ"
                : errorMessage || "กรุณาลองใหม่อีกครั้ง"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/register"
              className="h-11 px-6 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] !text-[var(--color-on-accent)] text-[14.5px] font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>ลงทะเบียนสถานที่ฟรี (0% GP)</span>
            </Link>
            <Link
              href="/"
              className="h-11 px-5 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] text-[14.5px] font-semibold text-[var(--color-text-primary)] inline-flex items-center transition-colors"
            >
              กลับโหมดนักเดินทาง
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudioContext.Provider value={contextValue}>
      {children}
    </StudioContext.Provider>
  );
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-background-body)] flex items-center justify-center text-[14.5px] text-[var(--color-text-secondary)]">
          กำลังโหลด Hotel Studio...
        </div>
      }
    >
      <StudioProviderInner>{children}</StudioProviderInner>
    </Suspense>
  );
}
