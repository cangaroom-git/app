"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bookmark, Check, Loader2, Plus, X } from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";
import { getOptimizedPinImageUrl } from "@/lib/mediaUtils";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { useModalPresence } from "@/lib/useModalPresence";
import { StandardInput } from "@/components/ui/standards";
import type { SavedBoardDto } from "@/types/cangaroom";

/**
 * Shared 1-image or 2x2 Airbnb Folder Collage thumbnail used in modals & /board
 */
export function BoardFolderThumb({
  coverUrls,
  sizeClass = "h-14 w-14 rounded-[12px]",
}: {
  coverUrls: string[];
  sizeClass?: string;
}) {
  if (coverUrls.length === 0) {
    return (
      <div
        className={`${sizeClass} bg-[var(--color-background-muted)] flex items-center justify-center text-[var(--color-text-secondary)] shrink-0`}
      >
        <Bookmark className="w-4 h-4" />
      </div>
    );
  }

  if (coverUrls.length === 1) {
    return (
      <div
        className={`${sizeClass} overflow-hidden bg-[var(--color-background-muted)] shrink-0`}
      >
        <img
          src={getOptimizedPinImageUrl(coverUrls[0], "thumb")}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const slots = [0, 1, 2, 3];
  return (
    <div
      className={`${sizeClass} overflow-hidden grid grid-cols-2 grid-rows-2 gap-[1.5px] bg-[var(--color-background-body)] shrink-0`}
    >
      {slots.map((idx) => {
        const url = coverUrls[idx];
        return url ? (
          <img
            key={idx}
            src={getOptimizedPinImageUrl(url, "thumb")}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover bg-[var(--color-background-muted)]"
          />
        ) : (
          <div
            key={idx}
            className="w-full h-full bg-[var(--color-background-subtle)]"
          />
        );
      })}
    </div>
  );
}

/* ============================================================================
   1. CREATE BOARD MODAL (Matches Airbnb "Create wishlist" — Image 5!)
============================================================================ */
export function CreateBoardModal({
  isOpen,
  language,
  isSubmitting = false,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  language: LanguageCode;
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (boardName: string) => Promise<void>;
}) {
  const isTh = language === "th";
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { shouldRender, dataState } = useModalPresence(isOpen, 270);
  useBodyScrollLock(shouldRender);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setErrorMsg(null);
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

  if (!shouldRender) return null;

  const trimmed = name.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || isSubmitting) return;
    setErrorMsg(null);
    try {
      await onCreate(trimmed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isTh
          ? "สร้างบอร์ดไม่สำเร็จ"
          : "Failed to create board"
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "สร้างบอร์ดใหม่" : "Create board"}
      data-state={dataState}
      onClick={onClose}
      className="fixed inset-0 z-[92] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/48 cgr-modal-backdrop"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[460px] rounded-t-[24px] sm:rounded-[20px] bg-[var(--color-background-popover)] border-t sm:border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-hidden cgr-modal-surface-sm"
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        {/* Header */}
        <div className="relative px-6 py-4 flex items-center justify-center border-b border-[var(--color-border)]">
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
            {isTh ? "สร้างบอร์ดใหม่" : "Create board"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-2">
            <StandardInput
              label={isTh ? "ชื่อบอร์ด" : "Board name"}
              optionalText={`${name.length}/50`}
              type="text"
              autoFocus
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isTh ? "เช่น ทริปน่านปลายปี" : "e.g. Nan Winter Trip"
              }
            />
            {errorMsg && (
              <p className="text-[12.5px] text-[var(--color-error)] px-0.5">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[14.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
            >
              {isTh ? "ยกเลิก" : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={!trimmed || isSubmitting}
              className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isTh ? "สร้างบอร์ด" : "Create"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   2. CHOOSE / MOVE BOARD MODAL (Triggered by "Change" on bottom-left Toast)
============================================================================ */
export function ChooseBoardModal({
  isOpen,
  language,
  boards,
  currentBoardId,
  isBusy = false,
  onClose,
  onSelectBoard,
  onOpenCreateNew,
}: {
  isOpen: boolean;
  language: LanguageCode;
  boards: SavedBoardDto[];
  currentBoardId: string | null;
  isBusy?: boolean;
  onClose: () => void;
  onSelectBoard: (board: SavedBoardDto) => Promise<void>;
  onOpenCreateNew: () => void;
}) {
  const isTh = language === "th";
  const { shouldRender, dataState } = useModalPresence(isOpen, 270);
  useBodyScrollLock(shouldRender);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "เลือกบอร์ดที่ต้องการบันทึก" : "Save to board"}
      data-state={dataState}
      onClick={onClose}
      className="fixed inset-0 z-[92] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/48 cgr-modal-backdrop"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[440px] max-h-[80dvh] flex flex-col rounded-t-[24px] sm:rounded-[20px] bg-[var(--color-background-popover)] border-t sm:border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-hidden cgr-modal-surface-sm"
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        <div className="relative px-6 py-4 flex items-center justify-center border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
            {isTh ? "เลือกบอร์ดสำหรับบันทึก" : "Save to board"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-[var(--color-border)]">
          {boards.map((board) => {
            const isSelected = board.id === currentBoardId;
            const covers = board.items
              .slice(0, 4)
              .map((it) => it.pin.coverImageUrl);
            return (
              <button
                key={board.id}
                type="button"
                disabled={isBusy}
                onClick={() => void onSelectBoard(board)}
                className="w-full py-3 px-2 rounded-[12px] hover:bg-[var(--color-background-muted)] flex items-center gap-3.5 text-left cursor-pointer transition-colors disabled:opacity-60"
              >
                <BoardFolderThumb
                  coverUrls={covers}
                  sizeClass="h-12 w-12 rounded-[10px]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)] truncate">
                    {board.name}
                  </p>
                  <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                    {isTh
                      ? `บันทึกแล้ว ${board.pinCount} แห่ง`
                      : `${board.pinCount} saved`}
                  </p>
                </div>
                {isSelected && (
                  <span className="h-7 w-7 rounded-[9px] bg-[#222222] dark:bg-[#f5f5f5] text-white dark:text-[#222222] inline-flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4 border-t border-[var(--color-border)] shrink-0">
          <button
            type="button"
            onClick={onOpenCreateNew}
            className="w-full h-11 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isTh ? "สร้างบอร์ดใหม่" : "Create new board"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. DELETE BOARD CONFIRM MODAL (Matches Airbnb "Delete this wishlist?" — Image 2!)
============================================================================ */
export function DeleteBoardConfirmModal({
  board,
  language,
  isDeleting = false,
  onClose,
  onConfirmDelete,
}: {
  board: SavedBoardDto | null;
  language: LanguageCode;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}) {
  const isTh = language === "th";
  const { shouldRender, dataState } = useModalPresence(Boolean(board), 270);
  useBodyScrollLock(shouldRender);
  const lastBoardRef = useRef<SavedBoardDto | null>(board);
  if (board) lastBoardRef.current = board;
  const activeBoard = board ?? lastBoardRef.current;

  useEffect(() => {
    if (!board) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board, onClose]);

  if (!shouldRender || !activeBoard) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? "ยืนยันการลบบอร์ด" : "Delete board"}
      data-state={dataState}
      onClick={onClose}
      className="fixed inset-0 z-[92] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/48 cgr-modal-backdrop"
    >
      <div
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[400px] rounded-t-[24px] sm:rounded-[20px] bg-[var(--color-background-popover)] border-t sm:border border-black/[0.06] dark:border-white/[0.1] shadow-[var(--shadow-popover)] overflow-hidden cgr-modal-surface-sm"
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-emphasized)]" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={isTh ? "ปิด" : "Close"}
          className="absolute top-4 right-4 h-8 w-8 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-primary)] inline-flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-8 pb-6 text-center space-y-2">
          <h2 className="text-[19px] font-semibold text-[var(--color-text-primary)]">
            {isTh ? "ลบบอร์ดนี้หรือไม่?" : "Delete this board?"}
          </h2>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            {isTh
              ? `“${activeBoard.name}” จะถูกลบออกอย่างถาวร`
              : `“${activeBoard.name}” will be permanently deleted.`}
          </p>
        </div>

        <div className="px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-[10px] hover:bg-[var(--color-background-muted)] text-[14.5px] font-semibold text-[var(--color-text-primary)] cursor-pointer transition-colors"
          >
            {isTh ? "ยกเลิก" : "Cancel"}
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void onConfirmDelete()}
            className="h-11 px-6 rounded-[12px] bg-[#222222] hover:bg-[#3f3f3f] dark:bg-[#f5f5f5] dark:hover:bg-[#e5e5e5] !text-white dark:!text-[#222222] text-[14.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isTh ? "ลบ" : "Delete"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. FLOATING BOTTOM-LEFT "SAVED TO BOARD" TOAST (Matches Airbnb Image 4!)
============================================================================ */
export interface BoardSaveToastState {
  pinId: string;
  thumbnailUrl: string;
  boardId: string | null;
  boardName: string | null;
  action: "saved" | "removed";
}

export function BoardSaveToast({
  toast,
  language,
  onChangeBoard,
  onDismiss,
}: {
  toast: BoardSaveToastState | null;
  language: LanguageCode;
  onChangeBoard: () => void;
  onDismiss: () => void;
}) {
  const isTh = language === "th";
  if (!toast || toast.action !== "saved" || !toast.boardName) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 lg:inset-x-auto lg:bottom-6 lg:left-[92px] z-[94] lg:w-auto lg:max-w-[360px] animate-slide-up-sheet">
      <div className="rounded-t-[22px] lg:rounded-[16px] border-t lg:border border-[var(--color-border)] lg:border-black/[0.06] lg:dark:border-white/[0.1] bg-[var(--color-background-popover)] shadow-[var(--shadow-popover)] px-4 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))] lg:p-2.5 lg:pr-4">
        <div
          aria-hidden="true"
          className="lg:hidden h-1 w-9 rounded-full bg-[var(--color-border-emphasized)] mx-auto mb-2.5"
        />

        <div className="flex items-center gap-3">
          <img
            src={getOptimizedPinImageUrl(toast.thumbnailUrl, "thumb")}
            alt=""
            className="h-11 w-11 rounded-[10px] object-cover bg-[var(--color-background-muted)] shrink-0"
          />

          <div className="flex-1 min-w-0 text-[13.5px] text-[var(--color-text-primary)] leading-snug">
            <span>{isTh ? "บันทึกไปที่ " : "Saved to "}</span>
            <strong className="font-semibold">{toast.boardName}</strong>
          </div>

          <button
            type="button"
            onClick={onChangeBoard}
            className="text-[13.5px] font-semibold text-[var(--color-text-primary)] underline underline-offset-2 hover:opacity-75 shrink-0 cursor-pointer"
          >
            {isTh ? "เปลี่ยน" : "Change"}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            aria-label={isTh ? "ปิด" : "Dismiss"}
            className="h-7 w-7 rounded-[8px] hover:bg-[var(--color-background-muted)] text-[var(--color-text-secondary)] inline-flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
