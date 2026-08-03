"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface CartAddOn {
  addOnId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartLine {
  /** Unique key for this line — a plain menu item add uses its menuItemId
   * directly; a line customized with add-ons or a combo gets a composite
   * key so it doesn't collide with (or overwrite) a plain add of the same
   * item/combo. */
  key: string;
  menuItemId?: string;
  comboMealId?: string;
  name: string;
  price: number; // unit price of the item/combo itself, excluding add-ons
  imageUrl: string | null;
  quantity: number;
  notes: string;
  addOns: CartAddOn[];
}

function makeKey(base: { menuItemId?: string; comboMealId?: string }, addOns: CartAddOn[]) {
  const id = base.menuItemId ?? `combo:${base.comboMealId}`;
  if (addOns.length === 0) return id;
  const addOnPart = [...addOns]
    .sort((a, b) => a.addOnId.localeCompare(b.addOnId))
    .map((a) => `${a.addOnId}x${a.quantity}`)
    .join(",");
  return `${id}|${addOnPart}`;
}

export function useCart(storageKey: string) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage once on mount (guards against SSR mismatch —
  // sessionStorage doesn't exist on the server).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted/blocked storage — just start with an empty cart
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignore quota/private-mode errors — cart just won't survive a refresh
    }
  }, [storageKey, items, hydrated]);

  const addItem = useCallback(
    (
      item: {
        menuItemId?: string;
        comboMealId?: string;
        name: string;
        price: number;
        imageUrl: string | null;
      },
      quantity = 1,
      addOns: CartAddOn[] = []
    ) => {
      const key = makeKey(item, addOns);
      setItems((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) {
          return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l));
        }
        return [...prev, { ...item, key, quantity, notes: "", addOns }];
      });
    },
    []
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.key !== key);
      return prev.map((l) => (l.key === key ? { ...l, quantity } : l));
    });
  }, []);

  const updateNotes = useCallback((key: string, notes: string) => {
    setItems((prev) => prev.map((l) => (l.key === key ? { ...l, notes } : l)));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const lineTotal = useCallback((line: CartLine) => {
    const addOnsTotal = line.addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
    return Math.round((line.price * line.quantity + addOnsTotal) * 100) / 100;
  }, []);

  const subtotal = useMemo(
    () => Math.round(items.reduce((sum, l) => sum + lineTotal(l), 0) * 100) / 100,
    [items, lineTotal]
  );
  const itemCount = useMemo(() => items.reduce((sum, l) => sum + l.quantity, 0), [items]);

  return {
    items,
    hydrated,
    addItem,
    updateQuantity,
    updateNotes,
    removeItem,
    clear,
    subtotal,
    itemCount,
    lineTotal,
  };
}
