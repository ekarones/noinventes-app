import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import EmptyState from '../components/EmptyState';
import PushedHeader from '../components/PushedHeader';
import StockBadge from '../components/StockBadge';
import ProductImage from '../components/ProductImage';
import type { LowStockItem } from '../types';
import type { AdminHomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'AdminLowStock'>;

export default function AdminLowStockScreen({ route, navigation }: Props) {
  const { items, threshold, hasMore } = route.params;
  const styles = useThemedStyles(makeStyles);

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
        accessibilityRole="button"
        accessibilityLabel={`${item.productName}, ${item.branchName}, ${item.stock} unidades`}
      >
        <ProductImage uri={item.imageThumbUrl} style={styles.thumb} iconSize={20} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.productName}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.codeChip}>
              <Text style={styles.codeText}>{item.productCode}</Text>
            </View>
          </View>
          <View style={styles.branchRow}>
            <Ionicons name="storefront-outline" size={12} color="rgba(22, 33, 58, 0.5)" />
            <Text style={styles.branch} numberOfLines={1}>
              {item.branchName}
            </Text>
          </View>
        </View>
        <StockBadge stock={item.stock} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Stock bajo"
        subtitle={`Producto·sucursal con menos de ${threshold} uds.`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={items}
        keyExtractor={(i) => `${i.productId}-${i.branchId}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 18, gap: 10, flexGrow: 1 },
    footer: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.45)', textAlign: 'center', marginTop: 16, paddingHorizontal: 18, lineHeight: 16 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    thumb: { width: 52, height: 52, borderRadius: 15 },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    codeChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.fill },
    codeText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.55)' },
    branchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    branch: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', flex: 1 },
  });
