import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchSales, fetchSaleSummaryById } from '../api/sales';
import { ApiError } from '../api/client';
import { usePagedList } from '../hooks/usePagedList';
import { SALE_DEFAULT_SORT, SALE_SORT_OPTIONS } from '../utils/sortOptions';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { ymd } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
import SaleRow from '../components/SaleRow';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import Select from '../components/Select';
import Pagination from '../components/Pagination';
import IconButton from '../components/IconButton';
import PrinterSheet from '../components/PrinterSheet';
import { usePrinter } from '../context/PrinterContext';
import { SortControl } from '../components/FilterControls';
import EmptyState from '../components/EmptyState';
import { PAYMENT_METHODS } from '../utils/payment';
import type { PaymentMethod, SaleSummary } from '../types';
import type { OrdersStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Orders'>;

const PER_PAGE = 20;

// "5 jul" — short enough to fit two of them plus the clear button on one line.
function shortDate(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export default function OrdersScreen({ navigation }: Props) {

  // ---- Filters ----
  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const printer = usePrinter();
  const [printerOpen, setPrinterOpen] = useState(false);
  // iOS renders the picker inline; this holds which field it's editing.
  const [iosPicking, setIosPicking] = useState<'from' | 'to' | null>(null);

  // ---- Sort ----
  const [sortIndex, setSortIndex] = useState(SALE_DEFAULT_SORT);
  const sort = SALE_SORT_OPTIONS[sortIndex];

  // Payment methods as Select options (string ids), each keeping its own icon.
  const paymentOptions = useMemo(
    () => PAYMENT_METHODS.map((m) => ({ id: m.value, label: m.label, icon: m.icon })),
    []
  );

  const range = useMemo(
    () => ({ dateFrom: dateFrom ? ymd(dateFrom) : undefined, dateTo: dateTo ? ymd(dateTo) : undefined }),
    [dateFrom, dateTo]
  );

  const hasFilters = query.length > 0 || dateFrom != null || dateTo != null || paymentMethod != null;

  function applyDate(which: 'from' | 'to', d: Date) {
    if (which === 'from') setDateFrom(d);
    else setDateTo(d);
  }

  // Android shows the native dialog imperatively; iOS renders a picker inline.
  function pickDate(which: 'from' | 'to') {
    const value = (which === 'from' ? dateFrom : dateTo) ?? new Date();
    const min = which === 'to' ? dateFrom ?? undefined : undefined;
    const max = which === 'from' ? dateTo ?? new Date() : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate: min,
        maximumDate: max,
        // onValueChange fires only on "set" (dismiss goes to onDismiss, which we
        // don't need), so the date is always present — no event.type check.
        onValueChange: (_e, d) => applyDate(which, d),
      });
    } else {
      setIosPicking(which);
    }
  }

  // Clears everything — used by the "no results" empty state. Each control also
  // clears itself in place (the dates and the payment pill each carry an "×").
  function clearFilters() {
    setDateFrom(null);
    setDateTo(null);
    setPaymentMethod(null);
    setSearchText('');
  }

  const fetchPage = useCallback(
    async (page: number) => {
      const trimmed = query.trim();
      // A purely-numeric query is an exact sale-number lookup: the list `search`
      // only matches customer names, so hit GET /sales/{id} instead. One result,
      // so it reports a single page and the pagination hides itself.
      if (/^\d+$/.test(trimmed)) {
        try {
          const sale = await fetchSaleSummaryById(Number(trimmed));
          return { items: [sale], meta: { currentPage: 1, lastPage: 1, perPage: 1, total: 1 } };
        } catch (e) {
          // Not found (or cancelled) → an empty result, not an error.
          if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
            return { items: [], meta: { currentPage: 1, lastPage: 1, perPage: PER_PAGE, total: 0 } };
          }
          throw e;
        }
      }
      return fetchSales({
        search: query || undefined,
        paymentMethod: paymentMethod ?? undefined,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
        page,
        perPage: PER_PAGE,
      });
    },
    [query, paymentMethod, range, sort]
  );
  const {
    items: sales,
    meta,
    page,
    loading,
    refreshing,
    error,
    listRef,
    loadPage,
  } = usePagedList<SaleSummary>(fetchPage, 'No se pudieron cargar las ventas.');

  // Runs on focus (a sale may have been made meanwhile) and whenever a filter
  // changes — either way the result set is new, so it starts at page 1.
  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

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
        actions={
          // Hidden entirely where Bluetooth isn't available (iOS, Expo Go), so
          // the header never offers something that can't work.
          printer.supported ? (
            <IconButton
              icon={printer.connected ? 'print' : 'print-outline'}
              muted={!printer.connected}
              onPress={() => setPrinterOpen(true)}
              accessibilityLabel={
                printer.connected
                  ? `Impresora conectada: ${printer.device?.name ?? ''}`
                  : 'Conectar impresora'
              }
            />
          ) : undefined
        }
      >
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por cliente o N° de venta..."
        />

        {/* First row, same as the catalogue's: payment picker and sort share the
            width equally. Payment clears via its own ×; the sort always has a
            value, so it just names it. */}
        <View style={styles.filterRow}>
          <Select
            icon="card-outline"
            placeholder="Todos los métodos"
            value={paymentMethod}
            options={paymentOptions}
            onChange={setPaymentMethod}
            style={styles.filterItem}
          />
          <SortControl
            options={SALE_SORT_OPTIONS}
            index={sortIndex}
            onChange={setSortIndex}
            showSelection
            style={styles.filterItem}
          />
        </View>

        {/* Second row: date range — two pickers ("Desde" / "Hasta"). */}
        <View style={styles.filterRow2}>
          <TouchableOpacity
            style={[styles.dateBtn, !!dateFrom && styles.dateBtnActive]}
            onPress={() => pickDate('from')}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Fecha desde"
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={dateFrom ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.dateBtnText, !!dateFrom && styles.dateBtnTextActive]}
              numberOfLines={1}
            >
              {dateFrom ? shortDate(dateFrom) : 'Desde'}
            </Text>
            {!!dateFrom && (
              // Can't grow to the touch minimum — it lives inside the pill — so it
              // borrows the room around it.
              <TouchableOpacity
                onPress={() => setDateFrom(null)}
                hitSlop={HIT_SLOP}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityLabel="Quitar fecha desde"
              >
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateBtn, !!dateTo && styles.dateBtnActive]}
            onPress={() => pickDate('to')}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Fecha hasta"
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={dateTo ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.dateBtnText, !!dateTo && styles.dateBtnTextActive]} numberOfLines={1}>
              {dateTo ? shortDate(dateTo) : 'Hasta'}
            </Text>
            {!!dateTo && (
              <TouchableOpacity
                onPress={() => setDateTo(null)}
                hitSlop={HIT_SLOP}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityLabel="Quitar fecha hasta"
              >
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {iosPicking && (
          <DateTimePicker
            value={(iosPicking === 'from' ? dateFrom : dateTo) ?? new Date()}
            mode="date"
            minimumDate={iosPicking === 'to' ? dateFrom ?? undefined : undefined}
            maximumDate={iosPicking === 'from' ? dateTo ?? new Date() : new Date()}
            onValueChange={(_e, d) => {
              setIosPicking(null);
              applyDate(iosPicking, d);
            }}
            onDismiss={() => setIosPicking(null)}
          />
        )}
      </ScreenTitle>

      {/* Only the very first load takes over the screen. Once there's a list,
          changing page keeps it on screen and just disables the controls. */}
      {loading && sales.length === 0 ? (
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
          data={sales}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
          contentContainerStyle={sales.length ? styles.list : styles.listEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            <Pagination
              page={page}
              lastPage={meta?.lastPage ?? 1}
              onChange={loadPage}
              loading={loading}
            />
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

      <PrinterSheet visible={printerOpen} onClose={() => setPrinterOpen(false)} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // First row: payment picker + sort (+ clear when active). `sm` between the
  // controls and off the search bar above — same rhythm as the catalogue header.
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  // Second row: the two date pickers split the full width below.
  filterRow2: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  // Payment picker and sort share the row equally, with a `sm` (10) gap between —
  // same as the catalogue header.
  filterItem: { flex: 1 },
  // A flat pill, like the search / sort controls. flex:1 so the two dates split the
  // row; the clear button, when present, stays compact beside them.
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  // Selected: primary frame + soft fill, like the category filter.
  dateBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  dateBtnText: { flex: 1, fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
  dateBtnTextActive: { color: colors.primary },
  // Each sale is its own card; the list just spaces them and pays the screen
  // margins. flexGrow lets a short list still fill the page.
  list: { padding: SPACING.sm, paddingTop: SPACING.xs, gap: SPACING.sm, flexGrow: 1 },
  listEmpty: { flexGrow: 1 },
});
