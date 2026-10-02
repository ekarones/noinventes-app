import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchSales, fetchSaleSummaryById } from '../api/sales';
import { ApiError } from '../api/client';
import { usePagedList } from '../hooks/usePagedList';
import { SALE_DEFAULT_SORT, SALE_SORT_OPTIONS } from '../utils/sortOptions';
import { colors } from '../theme/colors';
import { FONT_FAMILY, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { ymd } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
import SaleRow from '../components/SaleRow';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import FilterPill from '../components/FilterPill';
import PagedList from '../components/PagedList';
import Select from '../components/Select';
import PrinterSheet from '../components/PrinterSheet';
import { usePrinter } from '../context/PrinterContext';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
  // An admin in "modo venta" sees only the sales they personally registered here.
  const isAdmin = user?.role === 'admin';

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
  const list = usePagedList<SaleSummary>(fetchPage, 'No se pudieron cargar las ventas.');

  // Runs on focus (a sale may have been made meanwhile) and whenever a filter
  // changes — either way the result set is new, so it starts at page 1.
  useFocusEffect(
    useCallback(() => {
      list.loadPage(1);
    }, [list.loadPage])
  );

  function renderItem({ item }: { item: SaleSummary }) {
    return (
      <SaleRow
        card
        id={item.id}
        customerName={item.customerName}
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
          list.meta
            ? `${list.meta.total} ${hasFilters ? 'coinciden' : 'en total'}`
            : undefined
        }
        actions={
          // Hidden entirely where Bluetooth isn't available (iOS, Expo Go).
          printer.supported ? (
            <TouchableOpacity
              style={[styles.printerBtn, printer.connected && styles.printerBtnOn]}
              onPress={() => setPrinterOpen(true)}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
              accessibilityLabel={
                printer.connected
                  ? `Impresora conectada: ${printer.device?.name ?? ''}`
                  : 'Conectar impresora'
              }
            >
              <Ionicons
                name={printer.connected ? 'print' : 'print-outline'}
                size={17}
                color={printer.connected ? '#fff' : colors.primary}
              />
              <Text style={[styles.printerText, printer.connected && styles.printerTextOn]}>
                {printer.connected ? 'Conectada' : 'Impresora'}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isAdmin && (
        <View style={styles.adminBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.adminBannerText}>
            Estás viendo solo tus ventas. Para ver todas las del comercio, usá Ventas en el panel admin.
          </Text>
        </View>
      )}

      {/* Filters below the header, on a white band. The search leads (full width),
          then the pickers and the date range. */}
      <View style={styles.filters}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por cliente o N° de venta..."
          bordered
          badge={/^\d+$/.test(searchText.trim()) ? 'N° EXACTO' : undefined}
        />

        {/* Payment picker and sort share the width equally. Payment clears via its
            own ×; the sort always has a value, so it just names it. */}
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
          <FilterPill
            icon="calendar-outline"
            label={dateFrom ? shortDate(dateFrom) : 'Desde'}
            active={!!dateFrom}
            onPress={() => pickDate('from')}
            onClear={() => setDateFrom(null)}
            accent
            bordered
            accessibilityLabel="Fecha desde"
          />
          <FilterPill
            icon="calendar-outline"
            label={dateTo ? shortDate(dateTo) : 'Hasta'}
            active={!!dateTo}
            onPress={() => pickDate('to')}
            onClear={() => setDateTo(null)}
            accent
            bordered
            accessibilityLabel="Fecha hasta"
          />
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
      </View>

      <PagedList
        list={list}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        empty={
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

      <PrinterSheet visible={printerOpen} onClose={() => setPrinterOpen(false)} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // The filter block, below the header, on a white band — same as the catalogue.
  // `gap` spaces the search from the rows below it.
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.fill,
  },
  adminBannerText: { flex: 1, fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.primary, lineHeight: 16 },
  filters: {
    backgroundColor: colors.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  // First row: payment picker + sort (+ clear when active).
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // Second row: the two date pickers split the full width below.
  filterRow2: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // Payment picker and sort share the row equally, each carrying the "botón
  // bordeado" grey border — same as the catalogue filters.
  filterItem: { flex: 1, borderColor: colors.border },
  // Each sale is its own card; the list just spaces them and pays the screen
  // margins. flexGrow lets a short list still fill the page.
  list: { padding: SPACING.sm, gap: SPACING.sm, flexGrow: 1 },
  // A labelled card button on the amber header: white when there's no printer,
  // navy-filled once one is connected.
  printerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(22, 33, 58, 0.14)',
    backgroundColor: colors.surface,
  },
  printerBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  printerText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
  printerTextOn: { color: '#fff' },
});
