import { useState, useCallback } from "react";

/**
 * Generic hook to manage a Set<string> selection of item ids (checkboxes in a list).
 * Extracted from the duplicated pattern previously repeated 6x in AdminModeration.tsx
 * (one `useState<Set<string>>` + inline toggle per tab: comments/tools/reviews/
 * questions/launchComments/flagged).
 *
 * Usage:
 *   const toolsSelection = useBulkSelection();
 *   toolsSelection.isSelected(tool.id)
 *   toolsSelection.toggle(tool.id)
 *   toolsSelection.toggleAll(pendingTools)   // tri-state "select all" checkbox behavior
 *   toolsSelection.clear()
 *   Array.from(toolsSelection.selected)      // ids for bulk action calls
 */
export function useBulkSelection<T extends { id: string }>() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelected(new Set(items.map((i) => i.id)));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  /** Tri-state "select all" toggle: if every item is already selected -> clear, else select all. */
  const toggleAll = useCallback((items: T[]) => {
    setSelected((prev) => {
      const allSelected = items.length > 0 && items.every((i) => prev.has(i.id));
      return allSelected ? new Set() : new Set(items.map((i) => i.id));
    });
  }, []);

  return { selected, isSelected, toggle, selectAll, clear, toggleAll, size: selected.size };
}

export type BulkSelectionState<T extends { id: string } = { id: string }> = ReturnType<typeof useBulkSelection<T>>;
