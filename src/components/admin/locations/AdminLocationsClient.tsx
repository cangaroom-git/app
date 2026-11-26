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
    <div className="cgr-admin-page">
      {notice && (
        <div className="px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-background-muted)] flex items-center justify-between gap-2 text-[12.5px] font-medium shrink-0">
          <span className="truncate">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="ปิด"
            className="h-5 w-5 rounded-full hover:bg-[var(--color-background-subtle)] inline-flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <SuperAdminLocationsManager onNotice={handleNotice} />
    </div>
  );
}
