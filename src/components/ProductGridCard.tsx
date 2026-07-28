import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import ProductImage from './ProductImage';

type Props = {
  imageUri: string | null;
  /** The small line above the name — the category, grey and upper-cased. */
  overline?: string;
  name: string;
  /** The product code, shown small under the name with a barcode icon. */
  code?: string;
  price: string;
  /** Overlaid on the image, top-left — the stock badge. */
  badge?: ReactNode;
  /** Sits beside the price — the "+" (seller only), off the image so it never
   *  covers the product. */
  action?: ReactNode;
  /** A line under the price — the admin's status. */
  meta?: ReactNode;
  onPress: () => void;
};

// A product as a tall grid card: a big square image on top, then the category,
// the name, the code and the price stacked beneath it — the shop-window layout,
// two per row. Both catalogues (seller and admin) render it; only the "+" and the
// status line differ.
export default function ProductGridCard({
  imageUri,
  overline,
  name,
  code,
  price,
  badge,
  action,
  meta,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={ROW_PRESS_OPACITY}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${price}`}
    >
      <View style={styles.imageWrap}>
        <ProductImage uri={imageUri} style={styles.image} iconSize={40} />
        {!!badge && <View style={styles.badge}>{badge}</View>}
      </View>

      <View style={styles.body}>
        {!!overline && (
          <Text style={styles.overline} numberOfLines={1}>
            {overline}
          </Text>
        )}
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {!!code && (
          <View style={styles.codeRow}>
            <Ionicons name="barcode-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.code} numberOfLines={1}>
              {code}
            </Text>
          </View>
        )}

        {/* Price and the add button share the last row, so the "+" lives off the
            image and the photo is never covered. */}
        <View style={styles.priceRow}>
          <Text style={styles.price} numberOfLines={2}>
            {price}
          </Text>
          {action}
        </View>
        {meta}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // flex:1 with a `gap` on the row: two per line share the width evenly with a
    // fixed gap between them. maxWidth caps a lone last card at half so it sits on
    // the left instead of stretching to the full row.
    flex: 1,
    maxWidth: '50%',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    // Padding, not a flush image: the picture floats inside the card with a white
    // margin all around rather than bleeding to the border.
    padding: SPACING.sm,
  },
  // A landscape 4:3 frame (wider than tall) on the muted fill, rounded on all four
  // corners (overflow clips the photo to them), inset from the card by the padding.
  imageWrap: {
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
    borderRadius: RADIUS.control,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  image: { width: '100%', aspectRatio: 4 / 3 },
  badge: { position: 'absolute', top: SPACING.sm, left: SPACING.sm },
  // flex:1 so the body fills the card's (stretched) height; the price row then
  // pins itself to the bottom, lining up across cards whatever the name's length.
  body: { flex: 1, gap: SPACING.hairline },
  overline: {
    fontSize: FONT_SIZE.nano,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  code: { fontSize: FONT_SIZE.nano, color: colors.textSecondary, flexShrink: 1 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    // Auto top margin eats the free space in a short-named card, dropping the
    // price/button to the bottom edge so it aligns with the taller card beside it.
    marginTop: 'auto',
  },
  // Up to two lines: a single price fits on one, a range ("S/ 39.90 – S/ 59.90")
  // wraps rather than truncating in the narrow column. `flex` lets it wrap while
  // the button holds the right edge.
  price: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
});
