import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
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
   * sales, where the gap matters more; the history is a log, looked up by when.
   */
  relativeDate?: boolean;
  /** The history names the customer. The dashboards deliberately don't. */
  customerName?: string | null;
  /** The admin's extra scope: who sold it and where. */
  seller?: string | null;
  branch?: string | null;
  onPress: () => void;
  /**
   * Stand alone as its own card — the sales history. Left off, it is a plain row
   * for a panel that already has the surface (the dashboards' recent sales), and
   * `divided` draws the separators between those rows.
   */
  card?: boolean;
  /** Separator from the row above — the first row of a panel doesn't need one. */
  divided?: boolean;
};

// A sale, wherever it appears (5a): the dashboards' "Ventas recientes" and the
// sales history. The receipt number leads — it is what you quote when someone
// comes back with the paper in hand — then the when + method, and the total.
export default function SaleRow({
  id,
  total,
  paymentMethod,
  createdAt,
  relativeDate,
  customerName,
  seller,
  branch,
  onPress,
  card,
  divided,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const when = relativeDate ? formatRelative(createdAt) : formatDate(createdAt);

  return (
    <TouchableOpacity
      style={[styles.row, card ? styles.card : divided && styles.divided]}
      activeOpacity={ROW_PRESS_OPACITY}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Venta ${id}, ${formatPrice(total)}`}
    >
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          #{id}
        </Text>
        {!!customerName && (
          <Text style={styles.customer} numberOfLines={1}>
            {customerName}
          </Text>
        )}
        <Text style={styles.meta} numberOfLines={1}>
          {when} · {paymentMethodLabel(paymentMethod)}
        </Text>
        {(!!seller || !!branch) && (
          <Text style={styles.scope} numberOfLines={1}>
            {[seller, branch].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      <Text style={styles.total} numberOfLines={1}>
        {formatPrice(total)}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="rgba(22, 33, 58, 0.3)" />
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.separator },
    // The standalone card (history): a white surface with the same radius as the
    // dashboards' panels.
    card: {
      paddingHorizontal: SPACING.md,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.card,
    },
    info: { flex: 1, minWidth: 0 },
    title: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    customer: { fontSize: 13, fontFamily: FONT_FAMILY.bold, color: colors.primary, marginTop: 2 },
    meta: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    scope: { fontSize: 12, fontFamily: FONT_FAMILY.extrabold, color: 'rgba(22, 33, 58, 0.62)', marginTop: 3 },
    total: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary, flexShrink: 0 },
  });
