import { useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminTopSuppliers } from '../api/admin/dashboard';
import { usePagedList } from '../hooks/usePagedList';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import PushedHeader from '../components/PushedHeader';
import type { DashboardTopSupplier, StatsPeriod } from '../types';
import type { AdminHomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'AdminTopSuppliers'>;

const PERIOD_LABEL: Record<StatsPeriod, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

const PER_PAGE = 20;

// The full supplier ranking (Σ received-order totals) behind the dashboard's
// purchasing "Ver todos", keeping its period + branch scope.
export default function AdminTopSuppliersScreen({ route, navigation }: Props) {
  const { period, branchId } = route.params;
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const fetchPage = useCallback(
    (page: number) => fetchAdminTopSuppliers(period, branchId, page, PER_PAGE),
    [period, branchId]
  );
  const { items, meta, page, loading, refreshing, error, listRef, loadPage } =
    usePagedList<DashboardTopSupplier>(fetchPage, 'No se pudo cargar el ranking.');

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  function renderItem({ item, index }: { item: DashboardTopSupplier; index: number }) {
    return (
      <View style={[styles.row, index > 0 && styles.rowDivided]}>
        <Text style={styles.rank}>{index + 1}</Text>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={styles.meta}>
            {item.ordersCount} {item.ordersCount === 1 ? 'orden recibida' : 'órdenes recibidas'}
          </Text>
        </View>
        <Text style={styles.total}>{formatPrice(item.total)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Top proveedores"
        subtitle={`Por gasto · ${PERIOD_LABEL[period]}`}
        onBack={() => navigation.goBack()}
      />

      {loading && items.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadPage(1) }}
        />
      ) : items.length === 0 ? (
        <EmptyState icon="briefcase-outline" message="Aún no hay compras recibidas en este período." />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(s) => String(s.supplierId)}
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
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // The rows read as one continuous card, like the dashboard block they come from.
    list: {
      marginTop: 14,
      marginHorizontal: 18,
      marginBottom: 24,
      paddingHorizontal: 15,
      backgroundColor: colors.surface,
      borderRadius: 18,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    rowDivided: { borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    rank: { width: 22, textAlign: 'center', fontSize: 14, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.4)' },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    meta: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    total: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
  });
