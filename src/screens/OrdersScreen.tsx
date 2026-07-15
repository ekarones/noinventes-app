import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchSales, fetchSaleSummaryById } from '../api/sales';
import { ApiError } from '../api/client';
import type { PaginationMeta } from '../api/products';
import { SALE_DEFAULT_SORT, SALE_SORT_OPTIONS } from '../utils/sortOptions';
import { colors } from '../theme/colors';
import { SPACING } from '../theme/tokens';
import { ymd } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
import SaleRow from '../components/SaleRow';
import Chip, { ChipRow } from '../components/Chip';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import { ClearFiltersButton, SortControl } from '../components/FilterControls';
import EmptyState from '../components/EmptyState';
import type { SaleSummary } from '../types';
import type { OrdersStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Orders'>;

const PER_PAGE = 20;

type DatePreset = 'all' | 'today' | '7d' | '30d';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
];



export default function OrdersScreen({ navigation }: Props) {
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Filters ----
  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  // ---- Sort ----
  const [sortIndex, setSortIndex] = useState(SALE_DEFAULT_SORT);
  const sort = SALE_SORT_OPTIONS[sortIndex];

  const range = useMemo(() => {
    if (datePreset === 'all') return { dateFrom: undefined, dateTo: undefined };
    const now = new Date();
    const from = new Date(now);
    if (datePreset === '7d') from.setDate(from.getDate() - 6);
    else if (datePreset === '30d') from.setDate(from.getDate() - 29);
    // 'today' → from = today
    return { dateFrom: ymd(from), dateTo: ymd(now) };
  }, [datePreset]);

  const hasFilters = query.length > 0 || datePreset !== 'all';

  function clearFilters() {
    setSearchText('');
    setDatePreset('all');
  }

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const trimmed = query.trim();
        // A purely-numeric query is an exact sale-number lookup: the list
        // `search` only matches customer names, so hit GET /sales/{id} instead.
        if (/^\d+$/.test(trimmed)) {
          try {
            const sale = await fetchSaleSummaryById(Number(trimmed));
            setSales([sale]);
            setMeta({ currentPage: 1, lastPage: 1, perPage: 1, total: 1 });
          } catch (e) {
            // Not found (or cancelled) → show an empty result, not an error.
            if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
              setSales([]);
              setMeta({ currentPage: 1, lastPage: 1, perPage: PER_PAGE, total: 0 });
            } else {
              throw e;
            }
          }
          return;
        }
        const { items, meta: m } = await fetchSales({
          search: query || undefined,
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          sortBy: sort.sortBy,
          sortDir: sort.sortDir,
          page: 1,
          perPage: PER_PAGE,
        });
        setSales(items);
        setMeta(m);
      } catch (e: any) {
        setError(e?.message ?? 'No se pudieron cargar las ventas.');
        setSales([]);
        setMeta(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query, range, sort]
  );

  // Refresh on focus and whenever a filter changes (loadFirstPage identity
  // changes with the filters, so useFocusEffect re-runs while focused).
  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  async function loadMore() {
    if (!meta || loadingMore || meta.currentPage >= meta.lastPage) return;
    setLoadingMore(true);
    try {
      const { items, meta: m } = await fetchSales({
        search: query || undefined,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
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

  function renderItem({ item }: { item: SaleSummary }) {
    return (
      <SaleRow
        card
        id={item.id}
        customerName={item.customerName}
        itemsCount={item.itemsCount}
        total={item.total}
        paymentMethod={item.paymentMethod}
        createdAt={item.createdAt}
        onPress={() => navigation.navigate('OrderDetail', { sale: item })}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScreenTitle
        title="Ventas"
        subtitle={
          meta ? `${meta.total} ${hasFilters ? 'coinciden' : 'en total'} · ${sort.label}` : undefined
        }
        actions={<SortControl options={SALE_SORT_OPTIONS} index={sortIndex} onChange={setSortIndex} />}
      >
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por cliente o N° de venta..."
        />

        {/* Date range presets */}
        <View style={styles.filterRow}>
          <ChipRow>
            {DATE_PRESETS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                active={datePreset === p.value}
                onPress={() => setDatePreset(p.value)}
              />
            ))}
          </ChipRow>
          {hasFilters && <ClearFiltersButton onPress={clearFilters} />}
        </View>
      </ScreenTitle>

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
          data={sales}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
          contentContainerStyle={sales.length ? styles.list : styles.listEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
              <ActivityIndicator style={{ marginVertical: SPACING.lg }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={hasFilters ? 'Sin resultados' : 'Aún no hay ventas'}
              message={
                hasFilters
                  ? 'Prueba con otros filtros o límpialos.'
                  : 'Registra una venta y aparecerá aquí.'
              }
              action={hasFilters ? { label: 'Limpiar filtros', onPress: clearFilters } : undefined}
            />
          }
        />
      )}

    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // Each sale is its own card; the list just spaces them and pays the screen
  // margins. flexGrow lets a short list still fill the page.
  list: { padding: SPACING.xl, paddingTop: SPACING.xs, gap: SPACING.lg, flexGrow: 1 },
  listEmpty: { flexGrow: 1 },
});
