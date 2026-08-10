import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import ProductImage from './ProductImage';

type Props = {
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

// A best-seller on a dashboard (5a). Both roles rank the same way: the thumbnail,
// the name with its variation + units sold beneath, and the money it billed.
export default function TopProductRow({
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
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  const meta = variationLabel ? `${variationLabel} · ${quantitySold} uds.` : `${quantitySold} uds.`;

  return (
    <TouchableOpacity
      style={[styles.row, divided && styles.divided]}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${quantitySold} unidades vendidas`}
    >
      <View style={styles.thumbWrap}>
        <ProductImage uri={imageUri} style={styles.thumb} iconSize={18} />
        {loading && (
          <View style={styles.spinner}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      <Text style={styles.total} numberOfLines={1}>
        {formatPrice(total)}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.separator },
    thumbWrap: { position: 'relative' },
    thumb: { width: 44, height: 44, borderRadius: 13 },
    spinner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: 13,
    },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    meta: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    total: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary, flexShrink: 0 },
  });
