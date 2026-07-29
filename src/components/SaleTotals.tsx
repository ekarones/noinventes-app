import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, RADIUS, SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';

type Props = {
  subtotal: number;
  discount: number;
  total: number;
};

// The money block of a sale: subtotal, discount, grand total. The seller's
// receipt and the admin's showed the same numbers from two identical copies.
export default function SaleTotals({ subtotal, discount, total }: Props) {
  return (
    <View style={styles.box}>
      <Line label="Subtotal" value={formatPrice(subtotal)} />
      {discount > 0 && <Line label="Descuento" value={`- ${formatPrice(discount)}`} discount />}
      <View style={styles.divider} />
      <Line label="Total" value={formatPrice(total)} big />
    </View>
  );
}

function Line({
  label,
  value,
  big,
  discount,
}: {
  label: string;
  value: string;
  big?: boolean;
  discount?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.label, big && styles.grandLabel]}>{label}</Text>
      <Text style={[styles.value, big && styles.grandValue, discount && styles.discount]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    gap: SPACING.sm,
    marginTop: SPACING['2xl'],
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
  value: { fontSize: FONT_SIZE.bodySm, color: colors.textPrimary, fontFamily: FONT_FAMILY.medium },
  grandLabel: { fontSize: FONT_SIZE.heading, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  grandValue: { fontSize: FONT_SIZE.title, fontFamily: FONT_FAMILY.bold, color: colors.primary },
  discount: { color: colors.success },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: SPACING.md },
});
