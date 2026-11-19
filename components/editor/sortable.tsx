"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "./dnd-modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { useId, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[];
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
}) {
  // Stable id so dnd-kit's accessibility ids match between server and client renders.
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from !== -1 && to !== -1) onReorder(from, to);
  };

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({
  id,
  children,
  className,
}: {
  id: string;
  children: (handle: { attributes: HTMLAttributes<HTMLElement>; listeners: HTMLAttributes<HTMLElement> | undefined }) => ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style} className={cn(className, isDragging && "opacity-90 shadow-lg")}>
      {children({ attributes: attributes as HTMLAttributes<HTMLElement>, listeners: listeners as HTMLAttributes<HTMLElement> })}
    </div>
  );
}

export function DragHandle({
  attributes,
  listeners,
  label,
}: {
  attributes: HTMLAttributes<HTMLElement>;
  listeners: HTMLAttributes<HTMLElement> | undefined;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
}

export { arrayMove };
