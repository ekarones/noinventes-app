import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, ROW_PRESS_OPACITY } from '../theme/tokens';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { stockColor } from '../utils/stock';
import ProductImage from '../components/ProductImage';
import type { AdminProductRow, LowStockItem } from '../types';
import type { AdminHomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'AdminLowStock'>;

export default function AdminLowStockScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  // Cross-tab navigation (to the Products tab) isn't expressible through the
  // stack's typed navigation, so use an untyped handle for that hop.
  const rootNav = useNavigation<any>();
  const { items, threshold, hasMore } = route.params;

  // Jump to the product detail (in the Products tab) to fix its stock. The
  // detail refetches everything from its id, so a minimal row is enough — the
  // other fields are placeholders that are never displayed before the reload.
  function openProduct(item: LowStockItem) {
    const product: AdminProductRow = {
      id: item.productId,
      code: item.productCode,
      name: item.productName,
      type: item.productType,
      status: 'published',
      unitValue: 0,
      finalPrice: 0,
      unitOfMeasure: 'unit',
      imageUrl: item.imageUrl,
      imageThumbUrl: item.imageThumbUrl,
      variationsCount: 0,
      category: null,
      stock: null,
    };
    rootNav.navigate('AdminProductsTab', {
      screen: 'AdminProductDetail',
      initial: false,
      params: { product },
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
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
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
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 12, flexGrow: 1 },
  caption: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginBottom: 8, paddingHorizontal: 4 },
  footer: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, textAlign: 'center', marginTop: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 52, height: 52, borderRadius: 12 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  code: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  branch: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, flex: 1 },
  stockPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  stockText: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold },
});
