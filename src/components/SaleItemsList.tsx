import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, RADIUS, SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import type { SaleItem } from '../types';

type Props = {
  /** null until the full sale (with line items) has been fetched. */
  items: SaleItem[] | null;
  loading: boolean;
};

// The "Productos" section of a sale's detail: a quantity badge, the snapshotted
// name + code + unit price, and the line total. Identical on the seller's order
// detail and the admin's sale detail — it was the same block and stylesheet in
// both. The line items are snapshots, so they render even for a deleted product.
export default function SaleItemsList({ items, loading }: Props) {
  return (
    <>
      <Text style={styles.sectionTitle}>Productos</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : items && items.length > 0 ? (
        <View style={styles.itemsBox}>
          {items.map((item, idx) => (
            <View key={item.id} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{item.quantity}×</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.productCode} · {formatPrice(item.unitPrice)} c/u
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatPrice(item.subtotal)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.itemsError}>
          No se pudo cargar el detalle. Puedes descargar la boleta.
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: FONT_SIZE.heading,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.md,
  },
  loader: { marginVertical: SPACING.lg },
  itemsError: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
  itemsBox: { backgroundColor: colors.surface, borderRadius: RADIUS.card, paddingHorizontal: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  qtyBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: RADIUS.badge,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  qtyText: { color: colors.primary, fontFamily: FONT_FAMILY.bold, fontSize: FONT_SIZE.bodySm },
  itemInfo: { flex: 1, gap: SPACING.hairline },
  itemName: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.medium, color: colors.textPrimary },
  itemMeta: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.caption, color: colors.textSecondary },
  itemTotal: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
});
