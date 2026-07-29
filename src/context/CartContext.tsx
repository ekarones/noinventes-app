import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, Product, Variation } from '../types';
import { roundMoney, toCents } from '../utils/format';
import { linePrice, lineStock, makeCartKey } from '../utils/cart';

// Bump the suffix if the persisted CartItem shape ever changes.
const CART_STORAGE_KEY = 'cart_items_v1';
const CART_DISCOUNT_KEY = 'cart_discount_v1';

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  /** Sum of the lines, before the discount. */
  totalPrice: number;
  /** Money off the sale, set in the cart. Never exceeds `totalPrice`. */
  discount: number;
  /** What the customer pays: `totalPrice - discount`. */
  total: number;
  addItem: (product: Product, variation?: Variation | null, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  setDiscount: (amount: number) => void;
  clear: () => void;
  /** Bumped every time a sale commits, so catalog lists can re-fetch fresh stock
   *  without each screen having to know a sale happened elsewhere. */
  stockVersion: number;
  invalidateStock: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState(0);
  // A counter, not a boolean: every sale bumps it, so a listener re-runs on each
  // one rather than only on the first flip.
  const [stockVersion, setStockVersion] = useState(0);
  // Don't persist until the saved cart has been loaded, otherwise the empty
  // initial state would overwrite it on first mount.
  const hydrated = useRef(false);

  // Restore the persisted cart once on mount so an accidental app close (or
  // logout) doesn't lose an in-progress sale.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CART_STORAGE_KEY),
      AsyncStorage.getItem(CART_DISCOUNT_KEY),
    ])
      .then(([rawItems, rawDiscount]) => {
        if (rawItems) {
          const saved = JSON.parse(rawItems);
          if (Array.isArray(saved)) setItems(saved);
        }
        const saved = parseFloat(rawDiscount ?? '');
        if (Number.isFinite(saved) && saved > 0) setDiscountInput(saved);
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

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(CART_DISCOUNT_KEY, String(discountInput)).catch(() => {});
  }, [discountInput]);

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

  function setDiscount(amount: number) {
    setDiscountInput(Number.isFinite(amount) ? Math.max(0, roundMoney(amount)) : 0);
  }

  function clear() {
    setItems([]);
    // The discount belongs to the sale that just closed, not to the next one.
    setDiscountInput(0);
  }

  function invalidateStock() {
    setStockVersion((v) => v + 1);
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  // Summed in cents: `39.90 * 3` in floating point is 119.69999999999999, and the
  // error compounds with every line. The server recomputes the real total anyway
  // — this is what the seller reads off the screen before charging.
  const totalPrice = useMemo(
    () => items.reduce((cents, i) => cents + toCents(linePrice(i)) * i.quantity, 0) / 100,
    [items]
  );

  // Clamped to the subtotal, so dropping a line can't leave a discount bigger than
  // the sale — checkout would otherwise sit on an invalid amount it can no longer
  // edit. Clamping on read (not on write) means putting the line back restores the
  // seller's original number instead of the trimmed one.
  const discount = useMemo(
    () => Math.min(discountInput, totalPrice),
    [discountInput, totalPrice]
  );

  const total = useMemo(
    () => (toCents(totalPrice) - toCents(discount)) / 100,
    [totalPrice, discount]
  );

  const value: CartContextValue = {
    items,
    totalItems,
    totalPrice,
    discount,
    total,
    addItem,
    removeItem,
    updateQuantity,
    setDiscount,
    clear,
    stockVersion,
    invalidateStock,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
