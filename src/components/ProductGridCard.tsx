import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import ProductImage from './ProductImage';
import CodeBadge from './CodeBadge';

type Props = {
  imageUri: string | null;
  /** The small line above the name — the category, grey and upper-cased. */
  overline?: string;
  name: string;
  /** The product code chip under the name. */
  code?: string;
  /** Sits beside the code — the colour-coded stock. */
  codeRight?: ReactNode;
  price: string;
  /** Overlaid on the image, top-left — the admin's variations badge. */
  badge?: ReactNode;
  /** Overlaid on the image, bottom-right — the seller's "+". */
  action?: ReactNode;
  /** A line under the price — the admin's status. */
  meta?: ReactNode;
  onPress: () => void;
};

// A product as a grid card (5a): a flush image on top with an optional overlay
// control, then the category, name, code + stock and price beneath. Both
// catalogues render it; only the "+" (seller) and the status line (admin) differ.
export default function ProductGridCard({
  imageUri,
  overline,
  name,
  code,
  codeRight,
  price,
  badge,
  action,
  meta,
  onPress,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={ROW_PRESS_OPACITY}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${price}`}
    >
      <View style={styles.imageWrap}>
        <ProductImage uri={imageUri} style={styles.image} iconSize={34} />
        {!!badge && <View style={styles.badge}>{badge}</View>}
        {!!action && <View style={styles.action}>{action}</View>}
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
        {(!!code || !!codeRight) && (
          <View style={styles.codeRow}>
            {!!code && <CodeBadge code={code} />}
            {codeRight}
          </View>
        )}
        <Text style={styles.price} numberOfLines={1}>
          {price}
        </Text>
        {meta}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      flex: 1,
      maxWidth: '50%',
      backgroundColor: colors.surface,
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    imageWrap: { position: 'relative', height: 108, backgroundColor: colors.surfaceMuted },
    image: { width: '100%', height: 108 },
    badge: { position: 'absolute', top: 8, left: 8 },
    action: { position: 'absolute', right: 8, bottom: 8 },
    body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 5 },
    overline: {
      fontSize: 10.5,
      fontFamily: FONT_FAMILY.black,
      color: 'rgba(22, 33, 58, 0.45)',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    // Fixed 2-line height so cards align whatever the name's length.
    name: {
      fontSize: 14,
      lineHeight: 17.5,
      height: 35,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    price: { fontSize: 14, letterSpacing: -0.3, fontFamily: FONT_FAMILY.black, color: colors.primary },
  });
