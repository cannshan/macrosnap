"use client";

import { useCallback, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { blankItem, type FoodItem } from "@/lib/types";

/**
 * Holds the working copy of a meal's items alongside the original estimate.
 * The estimate is what the portion slider scales from, so sliding to 150% and
 * back to 100% lands exactly where it started instead of drifting.
 */
export function useItems(initial: FoodItem[] = []) {
  const [items, setItems] = useState<FoodItem[]>(initial);
  const [base, setBase] = useState<FoodItem[]>(initial);
  const [addedIndex, setAddedIndex] = useState<number | null>(null);

  const reset = useCallback((next: FoodItem[]) => {
    setItems(next);
    setBase(next);
    setAddedIndex(null);
  }, []);

  const update = useCallback(
    (index: number, next: FoodItem, options?: { resetBase?: boolean }) => {
      setItems((current) => current.map((it, i) => (i === index ? next : it)));
      if (options?.resetBase) {
        setBase((current) => current.map((it, i) => (i === index ? next : it)));
      }
    },
    [],
  );

  const remove = useCallback((index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
    setBase((current) => current.filter((_, i) => i !== index));
    setAddedIndex(null);
  }, []);

  const add = useCallback(() => {
    const item = blankItem();
    // Never call another setter inside an updater — React may run updaters twice
    // in StrictMode, and the nested set fires during render. Derive the index
    // from the array we already hold instead.
    setItems((current) => [...current, item]);
    setBase((current) => [...current, item]);
    setAddedIndex(items.length);
  }, [items.length]);

  return { items, base, addedIndex, reset, update, remove, add };
}

export function ItemList({
  list,
  emptyMessage,
}: {
  list: ReturnType<typeof useItems>;
  emptyMessage: string;
}) {
  return (
    <div className="space-y-3">
      {list.items.map((item, index) => (
        <ItemCard
          key={index}
          item={item}
          base={list.base[index] ?? item}
          startOpen={list.addedIndex === index}
          onChange={(next, options) => list.update(index, next, options)}
          onRemove={() => list.remove(index)}
        />
      ))}

      <button
        onClick={list.add}
        className="w-full rounded-2xl border border-dashed border-line py-3.5 text-sm font-medium text-muted transition hover:border-cal/40 hover:text-cal"
      >
        + Add a food it missed
      </button>

      {list.items.length === 0 && (
        <p className="pt-2 text-center text-sm text-muted">{emptyMessage}</p>
      )}
    </div>
  );
}
