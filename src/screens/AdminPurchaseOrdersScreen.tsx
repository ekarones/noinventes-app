import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchPurchaseOrders } from '../api/admin/purchaseOrders';
import { usePagedList } from '../hooks/usePagedList';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice, formatDate } from '../utils/format';
import { poStatusMeta } from '../utils/purchaseOrder';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import PushedHeader from '../components/PushedHeader';
import type { AdminPurchaseOrderRow, PurchaseOrderStatus } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminPurchaseOrders'>;

const PER_PAGE = 20;

type StatusFilter = PurchaseOrderStatus | 'all';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'ordered', label: 'Enviadas' },
  { value: 'received', label: 'Recibidas' },
  { value: 'cancelled', label: 'Canceladas' },
];

export default function AdminPurchaseOrdersScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [status, setStatus] = useState<StatusFilter>('all');

  const fetchPage = useCallback(
    (page: number) => fetchPurchaseOrders({ status, page, perPage: PER_PAGE }),
    [status]
  );
  const {
    items: orders,
    meta,
    page,
    loading,
    refreshing,
    error,
    listRef,
    loadPage,
  } = usePagedList<AdminPurchaseOrderRow>(fetchPage, 'No se pudieron cargar las órdenes.');

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  function renderItem({ item }: { item: AdminPurchaseOrderRow }) {
    const st = poStatusMeta(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminPurchaseOrderDetail', { order: item })}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={`Orden ${item.code}, ${st.label}, ${formatPrice(item.total)}`}
      >
        <View style={styles.topRow}>
          <Text style={styles.code}>{item.code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.supplier} numberOfLines={1}>
          {item.supplier.displayName}
        </Text>
        <View style={styles.bottomRow}>
          <View style={styles.branchRow}>
            <Ionicons name="storefront-outline" size={13} color="rgba(22, 33, 58, 0.5)" />
            <Text style={styles.branch} numberOfLines={1}>
              {item.branch.name}
            </Text>
          </View>
          <Text style={styles.total}>{formatPrice(item.total)}</Text>
        </View>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Órdenes de compra"
        subtitle={meta ? `${meta.total} órdenes` : undefined}
        onBack={() => navigation.goBack()}
        addAction={{ label: 'Nueva', onPress: () => navigation.navigate('AdminPurchaseOrderForm', {}) }}
      />

      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {FILTERS.map((f) => {
            const on = status === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setStatus(f.value)}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && orders.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadPage(1) }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            <Pagination page={page} lastPage={meta?.lastPage ?? 1} onChange={loadPage} loading={loading} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cart-outline"
              title="Sin órdenes"
              message="Crea la primera compra a un proveedor con el botón +."
            />
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    filters: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E9EBF0',
    },
    filterChips: { paddingHorizontal: 18, gap: 7 },
    chip: { height: 34, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.6)' },
    chipTextOn: { color: '#fff' },

    list: { padding: 18, gap: 10, flexGrow: 1 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 15,
      gap: 6,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    code: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: 0.3 },
    statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
    statusText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black },
    supplier: { fontSize: 13.5, fontFamily: FONT_FAMILY.extrabold, color: 'rgba(22, 33, 58, 0.75)' },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 1 },
    branchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
    branch: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', flexShrink: 1 },
    total: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: colors.primary },
    date: { fontSize: 11, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.4)' },
  });
