import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import ProductImage from './ProductImage';

type Props = {
  imageUri: string | null;
  name: string;
  /** Already formatted — a single price, or a range ("S/ 39.90 – S/ 59.90"). */
  price: string;
  /** The line ABOVE the name — the category, in bold near-black. */
  overline?: string;
  /** Any further facts, under the price — one `<IconLabelRow>` per line. */
  meta?: ReactNode;
  /** Top of the right column: the stock. */
  stat?: ReactNode;
  /** Bottom of the right column: the "+" button, or the badge that replaces it. */
  action?: ReactNode;
  onPress: () => void;
};

// A product in a catalogue, as its own card. The seller browses to sell and the
// admin browses to manage, so what they read off it differs — but it is the same
// card: a big thumbnail, a column that reads top-down (what it is → which one →
// what it costs), and a right column with the number you check and the thing you
// do.
export default function ProductRow({
  imageUri,
  name,
  price,
  overline,
  meta,
  stat,
  action,
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
      <ProductImage uri={imageUri} style={styles.thumb} iconSize={32} />

      <View style={styles.info}>
        {!!overline && (
          <Text style={styles.overline} numberOfLines={1}>
            {overline}
          </Text>
        )}
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          {price}
        </Text>
        {meta}
      </View>

      {/* Stock at the top, aligned with the name; the action at the bottom. */}
      <View style={styles.right}>
        {stat}
        {action}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    // Top-aligned, not centred: the thumbnail, the name and the stock all start on
    // the same line, and the card reads as one block instead of three things
    // floating at different heights.
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Bigger than the dashboard's 40px thumbnail: here the picture is how you find
  // the product, not a decoration on a ranking you already read by name. Every
  // pixel past 88 comes straight out of the name's width.
  thumb: { width: 88, height: 88, borderRadius: RADIUS.control },
  info: { flex: 1 },
  // Monochrome and heavy, echoing the product-card reference: the category is a
  // bold near-black overline, the name reads under it, the price under that — all
  // black, no accent colour.
  overline: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  name: { fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  price: {
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    marginTop: SPACING.xs,
  },
  // Stretches to the row's height so `space-between` has something to work with.
  right: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.md,
    flexShrink: 0,
  },
});
