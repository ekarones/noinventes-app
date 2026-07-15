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

// Fills the icon while its tab is focused. Colour alone is a weak signal — half
// the point of the filled variant is that it reads without relying on it.
export function tabIcon(key: TabKey) {
  const outline = TAB_ICON[key];
  const filled = outline.replace('-outline', '') as keyof typeof Ionicons.glyphMap;

  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}
