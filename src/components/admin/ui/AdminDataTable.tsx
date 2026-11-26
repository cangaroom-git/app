"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";

export interface AdminColumn<T> {
  header: string | (() => React.ReactNode);
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  stickyLeft?: boolean;
}

interface AdminDataTableProps<T> {
  data: T[];
  columns: AdminColumn<T>[];
  keyField?: keyof T;
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  getViewUrl?: (item: T) => string;
  customRowAction?: (item: T) => React.ReactNode;
  /** Optional mobile (< md) native list-row renderer — replaces wide horizontal-scroll tables on phones */
  renderMobileRow?: (item: T) => React.ReactNode;
  enableMultiSelect?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  footer?: React.ReactNode;
  emptyLabel?: string;
}

/**
 * Unified Nondii Workspace DataTable
 * - Desktop (`>= md`): Pure-white sticky-header table with `whitespace-nowrap` column headers
 * - Mobile (`< md`): Native hairline-divided list rows (`renderMobileRow`) with zero horizontal scrolling
 */
export function AdminDataTable<T extends { id?: string }>({
  data,
  columns,
  keyField = "id" as keyof T,
  onRowClick,
  onEdit,
  onDelete,
  getViewUrl,
  customRowAction,
  renderMobileRow,
  enableMultiSelect = false,
  selectedIds = [],
  onSelectionChange,
  footer,
  emptyLabel = "No data available",
}: AdminDataTableProps<T>) {
  const lastSelectedIndexRef = useRef<number | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(data.map((item) => String(item[keyField])));
    } else {
      onSelectionChange([]);
    }
  };

  const handleRowSelect = (
    checked: boolean,
    item: T,
    index: number,
    event: React.MouseEvent,
  ) => {
    if (!onSelectionChange) return;
    const id = String(item[keyField]);
    let next = [...selectedIds];

    if (checked) {
      if (
        event.shiftKey &&
        lastSelectedIndexRef.current !== null &&
        lastSelectedIndexRef.current !== index
      ) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        data.slice(start, end + 1).forEach((row) => {
          const rid = String(row[keyField]);
          if (!next.includes(rid)) next.push(rid);
        });
      } else if (!next.includes(id)) {
        next.push(id);
      }
      lastSelectedIndexRef.current = index;
    } else {
      next = next.filter((existing) => existing !== id);
      lastSelectedIndexRef.current = null;
    }

    onSelectionChange(next);
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div
      className="h-auto md:h-full flex flex-col bg-[var(--color-background-body)] md:overflow-hidden"
      style={{ overflowX: "clip" }}
    >
      {/* ═══ MOBILE (< md): Native Hairline List Rows (Zero Horizontal Scroll) ═══ */}
      {renderMobileRow && (
        <div className="md:hidden">
          {data.length === 0 ? (
            <div className="px-4 py-12 text-center ws-caption">{emptyLabel}</div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {data.map((item, rowIdx) => {
                const itemId = String(item[keyField] ?? rowIdx);
                return (
                  <div
                    key={itemId}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={
                      onRowClick
                        ? "cursor-pointer active:bg-[var(--color-background-muted)] transition-colors"
                        : ""
                    }
                  >
                    {renderMobileRow(item)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ DESKTOP (>= md, or fallback when renderMobileRow is not supplied) ═══ */}
      <div
        className={`${
          renderMobileRow ? "hidden md:block" : "block"
        } flex-1 overflow-x-auto md:overflow-auto cgr-scroll-autohide overscroll-auto`}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-background-body)] border-b border-[var(--color-border)] shrink-0">
              {enableMultiSelect && (
                <th className="ws-table-th whitespace-nowrap w-10 md:sticky md:top-0 z-20 bg-[var(--color-background-body)] hidden lg:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="wg-checkbox align-middle"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}

              {columns.map((col, idx) => {
                const stickyLeftTh = col.stickyLeft
                  ? "sticky left-0 z-30 bg-[var(--color-background-body)]"
                  : "";
                return (
                  <th
                    key={idx}
                    className={`ws-table-th whitespace-nowrap md:sticky md:top-0 z-20 bg-[var(--color-background-body)] ${stickyLeftTh} ${
                      col.className || ""
                    }`}
                  >
                    {typeof col.header === "function"
                      ? col.header()
                      : col.header}
                  </th>
                );
              })}

              {(onEdit || onDelete) && (
                <th className="ws-table-th whitespace-nowrap text-right md:sticky md:top-0 z-20 bg-[var(--color-background-body)]">
                  จัดการ
                </th>
              )}

              {(getViewUrl || customRowAction) && (
                <th className="ws-table-th whitespace-nowrap w-10 md:sticky md:top-0 z-20 bg-[var(--color-background-body)]" />
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-border)]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (onEdit || onDelete ? 1 : 0) +
                    (enableMultiSelect ? 1 : 0) +
                    (getViewUrl || customRowAction ? 1 : 0)
                  }
                  className="px-6 py-14 text-center ws-caption"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const itemId = String(item[keyField] ?? rowIdx);
                const isSelected = selectedIds.includes(itemId);

                return (
                  <tr
                    key={itemId}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors ${
                      isSelected ? "bg-[var(--color-accent-muted)]/70" : ""
                    } ${
                      onRowClick
                        ? "cursor-pointer hover:bg-[var(--color-background-muted)]/60"
                        : "hover:bg-[var(--color-background-muted)]/40"
                    }`}
                  >
                    {enableMultiSelect && (
                      <td
                        className="ws-table-td w-10 hidden lg:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center h-full">
                          <input
                            type="checkbox"
                            aria-label={`Select row ${rowIdx + 1}`}
                            className="wg-checkbox"
                            checked={isSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowSelect(
                                (e.target as HTMLInputElement).checked,
                                item,
                                rowIdx,
                                e,
                              );
                            }}
                            onChange={() => {}}
                          />
                        </div>
                      </td>
                    )}

                    {columns.map((col, colIdx) => {
                      const stickyLeftTd = col.stickyLeft
                        ? "sticky left-0 z-[5] bg-[var(--color-background-body)]"
                        : "";
                      return (
                        <td
                          key={colIdx}
                          className={`ws-table-td ${stickyLeftTd} ${
                            col.className || ""
                          }`}
                        >
                          {col.cell
                            ? col.cell(item)
                            : (item[col.accessorKey!] as React.ReactNode)}
                        </td>
                      );
                    })}

                    {(onEdit || onDelete) && (
                      <td
                        className="px-4 py-1.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1.5">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              title="Edit"
                              className="w-8 h-8 rounded-full inline-flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors cursor-pointer"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(item)}
                              title="Delete"
                              className="w-8 h-8 rounded-full inline-flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                    {(getViewUrl || customRowAction) && (
                      <td
                        className="px-3 py-1.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {customRowAction && customRowAction(item)}
                          {getViewUrl &&
                            (getViewUrl(item) ? (
                              <Link
                                href={getViewUrl(item)}
                                target="_blank"
                                title="View public page"
                                className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                              >
                                <Eye size={16} />
                              </Link>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-200 cursor-default">
                                <Eye size={16} />
                              </span>
                            ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
