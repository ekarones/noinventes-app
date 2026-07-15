import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconLabel, { IconLabelRow } from './IconLabel';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { formatDate, formatPrice, formatRelative } from '../utils/format';
import { paymentMethodLabel } from '../utils/payment';
import type { PaymentMethod } from '../types';

type Props = {
  id: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  /**
   * "hace 2 h" instead of "12 jul 2026, 14:32". The dashboards show the last few
   * sales, where the gap matters more than the timestamp; the history is a log,
   * where you look a sale up by when it happened.
   */
  relativeDate?: boolean;
  /** The history names the customer. The dashboards deliberately don't. */
  customerName?: string | null;
  itemsCount?: number | null;
  /** The admin's extra scope: who sold it and where. */
  seller?: string | null;
  branch?: string | null;
  onPress: () => void;
  /**
   * Stand alone as its own bordered card — the sales history. Left off, it is a
   * plain row for a panel that already has the border (the dashboards' recent
   * sales), and `divided` draws the separators between those rows.
   */
  card?: boolean;
  /** Separator from the row above — the first row of a panel doesn't need one. */
  divided?: boolean;
};

// A sale, wherever it appears: the two dashboards' "Ventas recientes", the seller's
// history, the admin's. It was three components — two sale cards and a dashboard
// row — that agreed on nothing: one wasn't tappable, one dropped the payment
// method, and they had reordered the same summary line between them.
//
// The receipt number leads: it identifies the sale, and it is what you quote when
// someone comes back with the paper in their hand.
export default function SaleRow({
  id,
  total,
  paymentMethod,
  createdAt,
  relativeDate,
  customerName,
  itemsCount,
  seller,
  branch,
  onPress,
  card,
  divided,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, card ? styles.card : divided && styles.divided]}
      activeOpacity={ROW_PRESS_OPACITY}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Venta ${id}, ${formatPrice(total)}`}
    >
      <View style={styles.iconBox}>
        <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} />
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          #{id}
        </Text>

        {!!customerName && (
          <IconLabelRow>
            <IconLabel icon="person-outline" text={customerName} />
          </IconLabelRow>
        )}

        {(!!seller || !!branch) && (
          <IconLabelRow>
            {!!seller && <IconLabel icon="person-circle-outline" text={seller} />}
            {!!branch && <IconLabel icon="storefront-outline" text={branch} />}
          </IconLabelRow>
        )}

        {itemsCount != null && (
          <IconLabelRow>
            <IconLabel
              icon="cube-outline"
              text={`${itemsCount} ${itemsCount === 1 ? 'artículo' : 'artículos'}`}
            />
          </IconLabelRow>
        )}

        <IconLabelRow>
          <IconLabel
            icon="time-outline"
            text={relativeDate ? formatRelative(createdAt) : formatDate(createdAt)}
          />
        </IconLabelRow>
      </View>

      <View style={styles.right}>
        <Text style={styles.total} numberOfLines={1}>
          {formatPrice(total)}
        </Text>
        <Text style={styles.payment}>{paymentMethodLabel(paymentMethod)}</Text>
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
  // The standalone card: same border and radius as a product card, so the two
  // lists read as one family.
  card: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.control,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  right: { alignItems: 'flex-end', gap: SPACING.xs, flexShrink: 0 },
  // Same style as the best-seller's total and the catalogue's price: one kind of
  // figure, one look, wherever you meet it.
  total: { fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  payment: { fontSize: FONT_SIZE.caption, color: colors.textSecondary },
});
