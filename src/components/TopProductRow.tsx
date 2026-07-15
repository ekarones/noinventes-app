import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import IconLabel, { IconLabelRow } from './IconLabel';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import ProductImage from './ProductImage';

type Props = {
  rank: number;
  name: string;
  /** The variation that sold, when the product has them ("Blanco · M"). */
  variationLabel?: string | null;
  imageUri: string | null;
  quantitySold: number;
  total: number;
  onPress: () => void;
  /** The row was tapped and we're fetching the product before navigating. */
  loading?: boolean;
  /** Another row is already opening — don't queue a second navigation. */
  disabled?: boolean;
  /** Separator from the row above — the first row of the card doesn't need one. */
  divided?: boolean;
};

// Identifies a row. A variable product ranks once per variation, so several rows
// share a productId — the id alone is not unique and React would see duplicates.
export function topProductKey(tp: { productId: number; variationId: number | null }): string {
  return `${tp.productId}-${tp.variationId ?? 0}`;
}

// A best-seller on a dashboard. Both roles rank the same way; the row was
// duplicated between them, and the admin's wasn't even tappable.
export default function TopProductRow({
  rank,
  name,
  variationLabel,
  imageUri,
  quantitySold,
  total,
  onPress,
  loading,
  disabled,
  divided,
}: Props) {
  const title = variationLabel ? `${name} · ${variationLabel}` : name;

  return (
    <TouchableOpacity
      style={[styles.row, divided && styles.divided]}
      activeOpacity={ROW_PRESS_OPACITY}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${quantitySold} unidades vendidas`}
    >
      <View style={styles.thumbWrap}>
        <ProductImage uri={imageUri} style={styles.thumb} iconSize={18} />
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        {loading && (
          <View style={styles.spinner}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      {/* Name, facts, price — one per line, the same column the catalogue rows
          use. They are the same object seen from two angles, and reading a
          product should not change shape depending on which screen you are on. */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {!!variationLabel && (
          <IconLabelRow>
            {/* The same icon the catalogue uses to mark a variation, and the same
                muted grey: it is a fact about the row, not something to shout. */}
            <IconLabel icon="git-branch-outline" text={variationLabel} />
          </IconLabelRow>
        )}
      </View>

      {/* The money on the right, where it can be compared straight down the column
          — nothing competes with it for that slot here. */}
      <View style={styles.right}>
        <Text style={styles.total} numberOfLines={1}>
          {formatPrice(total)}
        </Text>
        <Text style={styles.qty}>{quantitySold} uds.</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.border },
  thumbWrap: { position: 'relative' },
  thumb: { width: 40, height: 40, borderRadius: RADIUS.control },
  // Overlaps the thumbnail's corner, so the ranking reads at a glance.
  rankBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.textOnPrimary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.badge,
  },
  // Covers the thumbnail while its product is being fetched.
  spinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: RADIUS.control,
  },
  info: { flex: 1 },
  name: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  right: { alignItems: 'flex-end', gap: SPACING.xs, flexShrink: 0 },
  // What the product BILLED in the period — not its unit price. Same style as the
  // recent sale's total and the catalogue's price: they are the same kind of
  // figure, and should not change size from screen to screen.
  total: { fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  qty: { fontSize: FONT_SIZE.caption, color: colors.textSecondary },
});
