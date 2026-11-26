"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { SuperAdminLocationsManager } from "@/components/super-admin/SuperAdminLocationsManager";

export function AdminLocationsClient() {
  const [notice, setNotice] = useState<string | null>(null);

  const handleNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  return (
    <SuperAdminLocationsManager
      onNotice={handleNotice}
      topBanner={
        notice ? (
          <div className="max-w-[1160px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b border-[var(--color-border)] bg-[var(--color-accent-muted)] text-[var(--color-accent)] ws-caption-medium flex items-center justify-between gap-2 shrink-0">
            <span className="truncate">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="ปิดการแจ้งเตือน"
              className="p-1 rounded-full hover:bg-[var(--color-accent)]/10 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : undefined
      }
    />
  );
}
