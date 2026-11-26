import React, { Suspense } from "react";
import type { Metadata } from "next";
import { AccountSettingsClient } from "@/components/account/AccountSettingsClient";

export const metadata: Metadata = {
  title: "ตั้งค่าบัญชี | Nondii",
  description:
    "จัดการข้อมูลส่วนตัว การแจ้งเตือนโปรใกล้หมดเขต ความเป็นส่วนตัว PDPA และคูปองของคุณบน Nondii",
};

export default function AccountSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="cgr-admin-page">
          <div className="max-w-[1160px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="h-8 w-44 rounded-full bg-[var(--color-background-muted)] mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-10">
              <div className="space-y-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-[14px] bg-[var(--color-background-muted)]"
                  />
                ))}
              </div>
              <div className="hidden md:block space-y-4 max-w-[680px]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-[16px] bg-[var(--color-background-muted)]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <AccountSettingsClient />
    </Suspense>
  );
}
