import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminSalesTrash } from '../api/admin/sales';
import type { PaginationMeta } from '../api/products';
import { colors } from '../theme/colors';
import { formatDate, formatPrice } from '../utils/format';
import type { AdminSaleSummary } from '../types';
import type { AdminSalesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminSalesStackParamList, 'AdminSalesTrash'>;

const PER_PAGE = 20;

export default function AdminSalesTrashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [sales, setSales] = useState<AdminSaleSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const { items, meta: m } = await fetchAdminSalesTrash({ page: 1, perPage: PER_PAGE });
      setSales(items);
      setMeta(m);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar la papelera.');
      setSales([]);
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
      const { items, meta: m } = await fetchAdminSalesTrash({
        page: meta.currentPage + 1,
        perPage: PER_PAGE,
      });
      setSales((prev) => [...prev, ...items]);
      setMeta(m);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }

  function renderItem({ item }: { item: AdminSaleSummary }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AdminSaleDetail', { sale: item, trashed: true })}
      >
        <View style={styles.iconBox}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.orderId}>Venta #{item.id}</Text>
          <Text style={styles.count} numberOfLines={1}>
            {item.customerName}
            {item.seller ? ` · ${item.seller.name}` : ''}
          </Text>
          {item.deletedAt && (
            <Text style={styles.deleted}>Anulada · {formatDate(item.deletedAt)}</Text>
          )}
        </View>
        <Text style={styles.total}>{formatPrice(item.total)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Papelera</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFirstPage()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(s) => String(s.id)}
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
            <View style={styles.center}>
              <Ionicons name="trash-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>Papelera vacía</Text>
              <Text style={styles.errorText}>Las ventas anuladas aparecerán aquí.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  errorText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  list: { padding: 20, gap: 14, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 2 },
  orderId: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  count: { fontSize: 13, color: colors.textSecondary },
  deleted: { fontSize: 12, color: colors.error, fontWeight: '600' },
  total: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
});
