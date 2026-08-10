import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';

// The bottom-bar icons, shared by both roles. The same concept looks the same in
// either app — a sale is a receipt, a product is a cube, the POS cart is a cart.
const TAB_ICON = {
  home: 'home-outline',
  products: 'cube-outline',
  cart: 'cart-outline',
  sales: 'receipt-outline',
  more: 'ellipsis-horizontal-outline',
} as const;

type TabKey = keyof typeof TAB_ICON;

// The active tab lifts its icon into a rounded pill in the role's tint (amber-soft
// for the seller, cool grey for the admin), the icon inked navy; inactive tabs
// show a muted outline glyph.
// `colors` is passed in from the navigator (where `useTheme()` is valid) so the
// returned render function closes over it — no hooks inside, since React
// Navigation calls it as a plain function per tab, not as a component.
export function tabIcon(key: TabKey, colors: Palette) {
  const outline = TAB_ICON[key];

  return ({ focused }: { color: string; size: number; focused: boolean }) => (
    <View style={[styles.pill, focused && { backgroundColor: colors.tabActiveBg }]}>
      <Ionicons name={outline} size={20} color={focused ? colors.primary : 'rgba(22, 33, 58, 0.42)'} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
