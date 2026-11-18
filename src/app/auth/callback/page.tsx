"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("กำลังยืนยันการเข้าสู่ระบบ...");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await authClient.getSession().catch(() => null);
        if (cancelled) return;

        if (typeof window !== "undefined" && window.opener && window.opener !== window) {
          try {
            window.close();
          } catch {
            // ignore close error in restricted browsers
          }
        }

        const params =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const cb = params?.get("callbackUrl");
        const safeDest = cb && cb.startsWith("/") ? cb : "/";
        router.replace(safeDest);
      } catch {
        if (!cancelled) {
          setStatusText("กำลังพากลับไปยังหน้าเข้าสู่ระบบ...");
          router.replace("/login");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-[var(--color-background-body)] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] rounded-[16px] border border-[var(--color-border)] bg-[var(--color-background-card)] px-6 py-8 flex flex-col items-center gap-3 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-primary)]" />
        <p className="ty-body-strong text-[var(--color-text-primary)]">{statusText}</p>
        <p className="ty-caption text-[var(--color-text-secondary)]">
          Completing authentication...
        </p>
      </div>
    </div>
  );
}

