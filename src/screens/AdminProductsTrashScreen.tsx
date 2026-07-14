import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  fetchAdminProductsTrash,
  forceDeleteProduct,
  restoreProduct,
} from '../api/admin/products';
import type { PaginationMeta } from '../api/products';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, HIT_SLOP, ROW_PRESS_OPACITY } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { formatPrice } from '../utils/format';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import type { AdminProductRow } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductsTrash'>;

const PER_PAGE = 20;

export default function AdminProductsTrashScreen({ navigation }: Props) {
  const { showToast } = useToast();

  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadFirstPage = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const { items, meta: m } = await fetchAdminProductsTrash({ page: 1, perPage: PER_PAGE });
      setProducts(items);
      setMeta(m);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar la papelera.');
      setProducts([]);
      setMeta(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  async function loadMore() {
    if (!meta || loadingMore || meta.currentPage >= meta.lastPage) return;
    setLoadingMore(true);
    try {
      const { items, meta: m } = await fetchAdminProductsTrash({
        page: meta.currentPage + 1,
        perPage: PER_PAGE,
      });
      setProducts((prev) => [...prev, ...items]);
      setMeta(m);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }

  async function doRestore(p: AdminProductRow) {
    if (busy) return;
    setBusy(true);
    try {
      await restoreProduct(p.id);
      showToast('Producto restaurado', 'checkmark-circle');
      loadFirstPage();
    } catch (e: any) {
      Alert.alert('No se pudo restaurar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function confirmForceDelete(p: AdminProductRow) {
    Alert.alert(
      'Eliminar permanentemente',
      `¿Borrar "${p.name}" para siempre? Se eliminarán sus imágenes, variaciones y asignaciones. Las ventas ya registradas conservarán su detalle histórico. Esta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar para siempre', style: 'destructive', onPress: () => doForceDelete(p) },
      ]
    );
  }

  async function doForceDelete(p: AdminProductRow) {
    if (busy) return;
    setBusy(true);
    try {
      await forceDeleteProduct(p.id);
      showToast('Producto eliminado', 'checkmark-circle');
      loadFirstPage();
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function renderItem({ item }: { item: AdminProductRow }) {
    return (
      <View style={styles.card}>
        <ProductImage uri={item.imageThumbUrl} style={styles.thumb} iconSize={20} />
        <View style={styles.cardInfo}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.code}>{item.code}</Text>
          <Text style={styles.price}>{formatPrice(item.finalPrice)}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => doRestore(item)}
            disabled={busy}
            hitSlop={HIT_SLOP}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Restaurar ${item.name}`}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.forceBtn}
            onPress={() => confirmForceDelete(item)}
            disabled={busy}
            hitSlop={HIT_SLOP}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar permanentemente ${item.name}`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Papelera" onBack={() => navigation.goBack()} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadFirstPage() }}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFirstPage(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="trash-outline"
              title="Papelera vacía"
              message="Los productos eliminados aparecerán aquí."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, gap: 14, flexGrow: 1 },
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
  thumb: { width: 52, height: 52, borderRadius: 12, opacity: 0.6 },
  cardInfo: { flex: 1, gap: 2 },
  name: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  code: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  price: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: 6 },
  restoreBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
