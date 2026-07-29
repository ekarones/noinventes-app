import { Ionicons } from '@expo/vector-icons';

// The bottom-bar icons, shared by both roles. The same concept has to look the
// same whichever app you are in — and the vocabulary is the app's own: a sale is
// a receipt (8 places), a product is a cube (6), the POS cart is a cart.
//
// The seller's bar used to contradict all of it: a grid for the catalogue (an
// icon used nowhere else) and a clock for the sales history, while the admin's
// showed the same two screens as a cube and a receipt.
const TAB_ICON = {
  home: 'home-outline',
  products: 'cube-outline',
  cart: 'cart-outline',
  sales: 'receipt-outline',
  more: 'ellipsis-horizontal-outline',
} as const;

type TabKey = keyof typeof TAB_ICON;

// Always the outline icon; the focused tab is signalled by colour alone — the
// active tint (primary) tints the same outline glyph rather than swapping it for
// a filled one.
export function tabIcon(key: TabKey) {
  const outline = TAB_ICON[key];

  return ({ color, size }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={outline} size={size} color={color} />
  );
}
