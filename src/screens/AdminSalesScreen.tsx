import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  fetchAdminSales,
  fetchAdminSaleSummaryById,
} from '../api/admin/sales';
import { fetchAdminBranches } from '../api/admin/branches';
import { fetchAdminUsers } from '../api/admin/users';
import { ApiError } from '../api/client';
import { usePagedList } from '../hooks/usePagedList';
import { SALE_DEFAULT_SORT, SALE_SORT_OPTIONS } from '../utils/sortOptions';
import { colors } from '../theme/colors';
import { FONT_FAMILY, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import SaleRow from '../components/SaleRow';
import FilterPill from '../components/FilterPill';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import PagedList from '../components/PagedList';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import EmptyState from '../components/EmptyState';
import Select from '../components/Select';
import { ymd } from '../utils/format';
import { PAYMENT_METHODS } from '../utils/payment';
import { useDebounce } from '../hooks/useDebounce';
import { SortControl } from '../components/FilterControls';
import type { AdminBranch, AdminSaleSummary, AdminUser, PaymentMethod } from '../types';
import type { AdminSalesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminSalesStackParamList, 'AdminSales'>;

const PER_PAGE = 20;

// "5 jul" — short enough for two of them to share a row.
function shortDate(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}



export default function AdminSalesScreen({ navigation }: Props) {

  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  // Same filters as the seller's history: an explicit date range and a payment
  // method, instead of the fixed period chips this screen used to carry.
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [iosPicking, setIosPicking] = useState<'from' | 'to' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const paymentOptions = useMemo(
    () => PAYMENT_METHODS.map((m) => ({ id: m.value, label: m.label, icon: m.icon })),
    []
  );

  const [sortIndex, setSortIndex] = useState(SALE_DEFAULT_SORT);
  const sort = SALE_SORT_OPTIONS[sortIndex];

  // Cross-seller scoping. null = no filter.
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [sellers, setSellers] = useState<AdminUser[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [picker, setPicker] = useState<'branch' | 'seller' | null>(null);

  useEffect(() => {
    fetchAdminBranches()
      .then(setBranches)
      .catch(() => {});
    // Pull a generous page of sellers — enough for a picker without paging it.
    fetchAdminUsers({ role: 'seller', perPage: 100 })
      .then((r) => setSellers(r.items))
      .catch(() => {});
  }, []);

  const branchName = branches.find((b) => b.id === branchId)?.name ?? 'Sucursal';
  const sellerName = sellers.find((s) => s.id === sellerId)?.name ?? 'Vendedor';

  const range = useMemo(
    () => ({ dateFrom: dateFrom ? ymd(dateFrom) : undefined, dateTo: dateTo ? ymd(dateTo) : undefined }),
    [dateFrom, dateTo]
  );

  const hasFilters =
    query.length > 0 ||
    dateFrom != null ||
    dateTo != null ||
    paymentMethod != null ||
    branchId != null ||
    sellerId != null;

  // Clears everything — used by the "no results" empty state. Each control also
  // clears itself in place (the dates and the payment pill each carry an "×").
  function clearFilters() {
    setSearchText('');
    setDateFrom(null);
    setDateTo(null);
    setPaymentMethod(null);
    setBranchId(null);
    setSellerId(null);
  }

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
        onValueChange: (_e, d) => applyDate(which, d),
      });
    } else {
      setIosPicking(which);
    }
  }

  const fetchPage = useCallback(
    async (page: number) => {
      const trimmed = query.trim();
      // Numeric query = exact sale-number lookup (list search only matches
      // customer names) → hit GET /admin/sales/{id}. One result, nothing to page.
      if (/^\d+$/.test(trimmed)) {
        try {
          const sale = await fetchAdminSaleSummaryById(Number(trimmed));
          return { items: [sale], meta: { currentPage: 1, lastPage: 1, perPage: 1, total: 1 } };
        } catch (e) {
          if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
            return { items: [], meta: { currentPage: 1, lastPage: 1, perPage: PER_PAGE, total: 0 } };
          }
          throw e;
        }
      }
      return fetchAdminSales({
        search: query || undefined,
        paymentMethod: paymentMethod ?? undefined,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        branchId: branchId ?? undefined,
        sellerId: sellerId ?? undefined,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
        page,
        perPage: PER_PAGE,
      });
    },
    [query, paymentMethod, range, sort, branchId, sellerId]
  );
  const list = usePagedList<AdminSaleSummary>(fetchPage, 'No se pudieron cargar las ventas.');

  // Runs on focus and whenever a filter changes — either way the result set is
  // new, so it starts at page 1.
  useFocusEffect(
    useCallback(() => {
      list.loadPage(1);
    }, [list.loadPage])
  );

  function renderItem({ item }: { item: AdminSaleSummary }) {
    return (
      <SaleRow
        card
        id={item.id}
        customerName={item.customerName}
        total={item.total}
        paymentMethod={item.paymentMethod}
        createdAt={item.createdAt}
        // The admin's extra scope: who sold it and where.
        seller={item.seller?.name}
        branch={item.branch?.name}
        onPress={() => navigation.navigate('AdminSaleDetail', { sale: item })}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScreenTitle
        title="Ventas"
        subtitle={
          list.meta ? `${list.meta.total} ${hasFilters ? 'coinciden' : 'en total'}` : undefined
        }
        actions={
          <TouchableOpacity
            style={styles.papeleraBtn}
            onPress={() => navigation.navigate('AdminSalesTrash')}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Papelera"
          >
            <Ionicons name="trash-outline" size={17} color="#16213A" />
            <Text style={styles.papeleraText}>Papelera</Text>
          </TouchableOpacity>
        }
      />

      {/* Filters below the header, on a white band. The search leads (full width),
          then the pickers, dates and scope. */}
      <View style={styles.filters}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por cliente o N° de venta..."
          bordered
          badge={/^\d+$/.test(searchText.trim()) ? 'N° EXACTO' : undefined}
        />

        {/* Rows 1 and 2 mirror the seller's history exactly, so both roles read
            the same header; the scope row below is the admin's only extra. */}
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

        <View style={styles.filterRow}>
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

        {/* Branch / seller scope */}
        <View style={styles.scopeRow}>
          <FilterPill
            icon="storefront-outline"
            label={branchId == null ? 'Sucursal' : branchName}
            active={branchId != null}
            onPress={() => setPicker('branch')}
            onClear={() => setBranchId(null)}
            accent
            bordered
          />
          <FilterPill
            icon="person-outline"
            label={sellerId == null ? 'Vendedor' : sellerName}
            active={sellerId != null}
            onPress={() => setPicker('seller')}
            onClear={() => setSellerId(null)}
            accent
            bordered
          />
        </View>
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
                : 'Las ventas de todos los vendedores aparecerán aquí.'
            }
            action={hasFilters ? { label: 'Limpiar filtros', onPress: clearFilters } : undefined}
          />
        }
      />

      {/* Branch / seller picker — one sheet, driven by `picker`. */}
      {/* One sheet serves both scopes — they only differ in their options. */}
      <BottomSheet
        visible={picker !== null}
        onClose={() => setPicker(null)}
        title={picker === 'branch' ? 'Sucursal' : 'Vendedor'}
        scrollable
      >
        {(() => {
          const isBranch = picker === 'branch';
          const selectedId = isBranch ? branchId : sellerId;
          const select = (id: number | null) => {
            isBranch ? setBranchId(id) : setSellerId(id);
            setPicker(null);
          };
          const options = isBranch ? branches : sellers;
          return (
            <>
              <SheetOption
                label={isBranch ? 'Todas las sucursales' : 'Todos los vendedores'}
                active={selectedId == null}
                onPress={() => select(null)}
              />
              {options.map((o) => (
                <SheetOption
                  key={o.id}
                  label={o.name}
                  active={selectedId === o.id}
                  onPress={() => select(o.id)}
                />
              ))}
            </>
          );
        })()}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // The filter block, below the header, on a white band — same as the catalogue.
  // `gap` spaces its rows; the padding insets them.
  filters: {
    backgroundColor: colors.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // Each filter carries the "botón bordeado" grey border — same as the catalogue.
  filterItem: { flex: 1, borderColor: colors.border },
  scopeRow: { flexDirection: 'row', gap: SPACING.sm },
  // Each sale is its own card; the list just spaces them and pays the screen
  // margins. flexGrow lets a short list still fill the page.
  list: { padding: SPACING.sm, gap: SPACING.sm, flexGrow: 1 },
  // The amber "Papelera" pill on the navy header — a navy border + shadow so it
  // reads as a raised chip over the amber decorative circle.
  papeleraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 15,
    backgroundColor: '#FFC20E',
    borderWidth: 2,
    borderColor: '#16213A',
    shadowColor: '#0A0F1C',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  papeleraText: { fontSize: 13, fontFamily: FONT_FAMILY.black, color: '#16213A' },
});
