import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, Product, Variation } from '../types';
import { linePrice, lineStock, makeCartKey } from '../utils/cart';

// Bump the suffix if the persisted CartItem shape ever changes.
const CART_STORAGE_KEY = 'cart_items_v1';

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: Product, variation?: Variation | null, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Don't persist until the saved cart has been loaded, otherwise the empty
  // initial state would overwrite it on first mount.
  const hydrated = useRef(false);

  // Restore the persisted cart once on mount so an accidental app close (or
  // logout) doesn't lose an in-progress sale.
  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved)) setItems(saved);
        }
      })
      .catch(() => {
        /* corrupt/unavailable storage → just start empty */
      })
      .finally(() => {
        hydrated.current = true;
      });
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items]);

  function addItem(product: Product, variation: Variation | null = null, quantity = 1) {
    const key = makeCartKey(product.id, variation?.id ?? null);
    const maxStock = variation?.stock ?? product.stock;

    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key
            ? { ...i, quantity: Math.min(i.quantity + quantity, maxStock) }
            : i
        );
      }
      return [...prev, { key, product, variation, quantity: Math.min(quantity, maxStock) }];
    });
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQuantity(key: string, quantity: number) {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.key !== key) return [i];
        if (quantity <= 0) return []; // removing when it hits zero
        return [{ ...i, quantity: Math.min(quantity, lineStock(i)) }];
      })
    );
  }

  function clear() {
    setItems([]);
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + linePrice(i) * i.quantity, 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
