"use client";

// 견적 장바구니 — localStorage 영속 + Context. 결제 없음(견적 요청용 품목 목록).

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number | null;
  qty: number;
}

interface CartApi {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const KEY = "golgius_cart";
const CartContext = createContext<CartApi | null>(null);

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i) => i && typeof i.id === "string" && i.qty > 0);
  } catch {
    return [];
  }
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const api: CartApi = {
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    add: (item, qty = 1) =>
      setItems((prev) => {
        const i = prev.findIndex((x) => x.id === item.id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], qty: Math.min(next[i].qty + qty, 999) };
          return next;
        }
        return [...prev, { ...item, qty: Math.min(qty, 999) }];
      }),
    setQty: (id, qty) =>
      setItems((prev) =>
        qty <= 0
          ? prev.filter((x) => x.id !== id)
          : prev.map((x) => (x.id === id ? { ...x, qty: Math.min(qty, 999) } : x))
      ),
    remove: (id) => setItems((prev) => prev.filter((x) => x.id !== id)),
    clear: () => setItems([]),
  };

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
