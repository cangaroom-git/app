"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DropAnimation,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export interface SortableHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  isOverlay?: boolean;
  disabled?: boolean;
}

/**
 * Ergonomic Touch-Safe Drag Handle
 * - `touch-none select-none` strictly isolated to the handle so mobile/tablet users
 *   can scroll the page smoothly anywhere else on the card without scroll-hijacking!
 * - Generous 44px vertical touch target (`h-11 w-8 sm:w-9`) for effortless thumb grip.
 */
export function SortableDragHandle({
  attributes,
  listeners,
  isDragging,
  isOverlay = false,
  disabled = false,
  ariaLabel = "ลากเพื่อจัดลำดับ",
}: SortableHandleProps & { ariaLabel?: string }) {
  if (disabled) return null;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Keep keyboard Space/Enter on the handle for DnD without triggering parent row click
        e.stopPropagation();
      }}
      {...attributes}
      {...listeners}
      className={`h-11 w-8 sm:w-9 -ml-1.5 sm:-ml-2 rounded-[10px] inline-flex items-center justify-center shrink-0 touch-none select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] dark:focus-visible:ring-[#f5f5f5] ${
        isOverlay || isDragging
          ? "cursor-grabbing text-[var(--color-text-primary)] bg-[var(--color-background-muted)]"
          : "cursor-grab text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]"
      }`}
    >
      <GripVertical className="w-4 h-4 stroke-[2]" />
    </button>
  );
}

const dropAnimation: DropAnimation = {
  duration: 210,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.3",
      },
    },
  }),
};

interface SortableRowWrapperProps<T> {
  id: string;
  item: T;
  index: number;
  disabled: boolean;
  renderItem: (
    item: T,
    ctx: {
      index: number;
      isDragging: boolean;
      isOverlay: boolean;
      handle: React.ReactNode;
    }
  ) => React.ReactNode;
}

function SortableRowWrapper<T>({
  id,
  item,
  index,
  disabled,
  renderItem,
}: SortableRowWrapperProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
  };

  const handle = (
    <SortableDragHandle
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
      disabled={disabled}
    />
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${
        isDragging
          ? "opacity-25 rounded-[16px] bg-[var(--color-background-muted)]/60 z-0"
          : ""
      }`}
    >
      {renderItem(item, {
        index,
        isDragging,
        isOverlay: false,
        handle,
      })}
    </div>
  );
}

export interface SortableListProps<T> {
  items: ReadonlyArray<T>;
  getId: (item: T) => string;
  onReorder: (nextItems: T[], oldIndex: number, newIndex: number) => void;
  disabled?: boolean;
  className?: string;
  renderItem: (
    item: T,
    ctx: {
      index: number;
      isDragging: boolean;
      isOverlay: boolean;
      handle: React.ReactNode;
    }
  ) => React.ReactNode;
}

/**
 * Pro-Grade Vertical Sortable List (Desktop / Tablet / Mobile)
 * - Uses @dnd-kit MouseSensor + TouchSensor + KeyboardSensor (zero buggy HTML5 DnD!)
 * - Strict Y-axis lock (`restrictToVerticalAxis`) + Portal `DragOverlay`
 * - Native touch scroll preserved outside the `touch-none` drag handle
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  disabled = false,
  className = "divide-y divide-[var(--color-border)]",
  renderItem,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const canDrag = !disabled && items.length > 1;

  const itemIds = useMemo(() => items.map(getId), [items, getId]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 60,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeIndex = activeId ? itemIds.indexOf(activeId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore browsers blocking vibrate
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const nextItems = arrayMove([...items], oldIndex, newIndex);
    onReorder(nextItems, oldIndex, newIndex);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      autoScroll={{
        threshold: { x: 0, y: 0.18 },
        acceleration: 12,
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, idx) => (
            <SortableRowWrapper
              key={getId(item)}
              id={getId(item)}
              item={item}
              index={idx}
              disabled={!canDrag}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>

      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay
            dropAnimation={dropAnimation}
            modifiers={[restrictToVerticalAxis]}
            zIndex={90}
          >
            {activeItem ? (
              <div className="rounded-[16px] bg-[var(--color-background-card)] shadow-[var(--shadow-popover)] ring-1 ring-[#222222]/15 dark:ring-white/15 select-none">
                {renderItem(activeItem, {
                  index: activeIndex,
                  isDragging: true,
                  isOverlay: true,
                  handle: (
                    <SortableDragHandle
                      attributes={{} as DraggableAttributes}
                      listeners={undefined}
                      isDragging
                      isOverlay
                      disabled={false}
                    />
                  ),
                })}
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
