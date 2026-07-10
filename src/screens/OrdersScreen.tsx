import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchSales, fetchSaleSummaryById, type SaleSortBy, type SortDir } from '../api/sales';
import { ApiError } from '../api/client';
import type { PaginationMeta } from '../api/products';
import { colors } from '../theme/colors';
import { formatDate, formatPrice, ymd } from '../utils/format';
import { paymentMethodLabel } from '../utils/payment';
import { useDebounce } from '../hooks/useDebounce';
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

type SortOption = {
  key: string;
  label: string;
  sortBy: SaleSortBy;
  sortDir: SortDir;
  icon: keyof typeof Ionicons.glyphMap;
};

// User-friendly presets over the API's sort_by/sort_dir. Index 0 is the default
// (newest first), which matches the previous implicit ordering.
const SORT_OPTIONS: SortOption[] = [
  { key: 'recent', label: 'Más recientes', sortBy: 'created_at', sortDir: 'desc', icon: 'arrow-down-outline' },
  { key: 'oldest', label: 'Más antiguas', sortBy: 'created_at', sortDir: 'asc', icon: 'arrow-up-outline' },
  { key: 'highest', label: 'Mayor monto', sortBy: 'total', sortDir: 'desc', icon: 'cash-outline' },
  { key: 'lowest', label: 'Menor monto', sortBy: 'total', sortDir: 'asc', icon: 'cash-outline' },
  { key: 'customer', label: 'Cliente (A–Z)', sortBy: 'customer_name', sortDir: 'asc', icon: 'person-outline' },
];

export default function OrdersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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
  const [sortIndex, setSortIndex] = useState(0);
  const [sortModal, setSortModal] = useState(false);
  const sort = SORT_OPTIONS[sortIndex];

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
        setError(e?.message ?? 'No se pudo cargar el historial.');
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
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OrderDetail', { sale: item })}
      >
        <View style={styles.iconBox}>
          <Ionicons name="receipt-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.orderId}>Venta #{item.id}</Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.count}>
            {item.itemsCount} {item.itemsCount === 1 ? 'artículo' : 'artículos'} · {item.customerName}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.total}>{formatPrice(item.total)}</Text>
          <View style={styles.payBadge}>
            <Text style={styles.payText}>{paymentMethodLabel(item.paymentMethod)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleTexts}>
            <Text style={styles.title}>Historial de ventas</Text>
            {meta && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {meta.total} {hasFilters ? 'coinciden' : 'en total'} · {sort.label}
              </Text>
            )}
          </View>
          <View style={styles.titleActions}>
            <TouchableOpacity style={styles.sortBtn} onPress={() => setSortModal(true)} hitSlop={8}>
              <Ionicons name="swap-vertical" size={16} color={colors.primary} />
              <Text style={styles.sortText}>Ordenar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente o N° de venta..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date range presets */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {DATE_PRESETS.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                active={datePreset === p.value}
                onPress={() => setDatePreset(p.value)}
              />
            ))}
          </ScrollView>
          {hasFilters && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.primary} />
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
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
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>
                {hasFilters ? 'Sin resultados' : 'Aún no hay ventas'}
              </Text>
              <Text style={styles.errorText}>
                {hasFilters
                  ? 'Prueba con otros filtros o límpialos.'
                  : 'Registra una venta y aparecerá aquí.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Sort picker */}
      <Modal
        visible={sortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortModal(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Ordenar por</Text>
            {SORT_OPTIONS.map((opt, i) => {
              const active = i === sortIndex;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.sheetRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSortIndex(i);
                    setSortModal(false);
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.sheetLabel, active && styles.sheetLabelActive]}>
                    {opt.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  titleTexts: { flex: 1 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },
  clearText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },
  sortText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  sheetLabel: { flex: 1, fontSize: 16, color: colors.textPrimary },
  sheetLabelActive: { fontWeight: '700', color: colors.primary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary, height: '100%' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { gap: 8, paddingVertical: 10, paddingRight: 8 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary },
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
  list: { padding: 20, paddingTop: 4, gap: 14, flexGrow: 1 },
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 2 },
  orderId: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: 13, color: colors.textSecondary },
  count: { fontSize: 13, color: colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  total: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  payBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  payText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
});
