import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { stockColor } from '../utils/stock';
import ProductImage from '../components/ProductImage';
import type { LowStockItem } from '../types';
import type { AdminHomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'AdminLowStock'>;

export default function AdminLowStockScreen({ route, navigation }: Props) {
  const { items, threshold, hasMore } = route.params;

  // Jump to the product detail to fix its stock. The detail refetches everything
  // from the id, so it only needs the seed.
  function openProduct(item: LowStockItem) {
    // Pushed on Inicio's own stack — this screen lives there, and so does the
    // product detail. Sending it to the Catálogo tab instead would mean going
    // back from the product lands on that tab's list, not on this alert.
    navigation.navigate('AdminProductDetail', {
      product: { id: item.productId, name: item.productName },
    });
  }

  function renderItem({ item }: { item: LowStockItem }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={ROW_PRESS_OPACITY}
        onPress={() => openProduct(item)}
      >
        <ProductImage uri={item.imageThumbUrl} style={styles.thumb} iconSize={20} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.productName}
          </Text>
          <Text style={styles.code}>{item.productCode}</Text>
          <View style={styles.branchRow}>
            <Ionicons name="storefront-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.branch} numberOfLines={1}>
              {item.branchName}
            </Text>
          </View>
        </View>
        <View style={[styles.stockPill, { backgroundColor: stockColor(item.stock) + '22' }]}>
          <Text style={[styles.stockText, { color: stockColor(item.stock) }]}>
            {item.stock} uds.
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Stock bajo" onBack={() => navigation.goBack()} />

      <FlatList
        data={items}
        keyExtractor={(i) => `${i.productId}-${i.branchId}`}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: SPACING['2xl'] }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.caption}>
            Combinaciones producto-sucursal con menos de {threshold} uds.
          </Text>
        }
        ListFooterComponent={
          hasMore ? (
            <Text style={styles.footer}>
              Mostrando las 50 más críticas. Revisa el catálogo para ver el resto.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            title="Sin stock crítico"
            message="Todos los productos están por encima del umbral."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: SPACING.sm, paddingTop: SPACING.xs, gap: SPACING.sm, flexGrow: 1 },
  caption: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs },
  footer: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.lg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: RADIUS.card, padding: SPACING.md, gap: SPACING.md },
  thumb: { width: 52, height: 52, borderRadius: RADIUS.control },
  info: { flex: 1, gap: SPACING.hairline },
  name: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  code: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.hairline },
  branch: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, flex: 1 },
  stockPill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.badge },
  stockText: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold },
});
