import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AdminHomeNavigation } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SIZE, FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchAdminDashboard } from '../api/admin/dashboard';
import { fetchAdminProductDetail } from '../api/admin/products';
import { ApiError } from '../api/client';
import { fetchAdminBranches } from '../api/admin/branches';
import Avatar from '../components/Avatar';
import FilterPill from '../components/FilterPill';
import SalesKpiGrid from '../components/SalesKpiGrid';
import TopProductRow, { topProductKey } from '../components/TopProductRow';
import SaleRow from '../components/SaleRow';
import ScreenTitle from '../components/ScreenTitle';
import SectionHeader from '../components/SectionHeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Select, { type SelectOption } from '../components/Select';
import LoadingState from '../components/LoadingState';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import type {
  AdminBranch,
  AdminDashboard,
  AdminRecentSale,
  DashboardTopProduct,
  StatsPeriod,
} from '../types';

const PERIOD_OPTIONS: SelectOption<StatsPeriod>[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

export default function AdminDashboardScreen() {
  const navigation = useNavigation<AdminHomeNavigation>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Branch scope: null = all branches. When set, the server scopes every KPI to
  // it and returns `sales_by_branch` empty (a 1-row breakdown is pointless).
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  // Which best-seller row is being opened. A variable product ranks once per
  // variation, so several rows share a productId — the key has to include it.
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminBranches()
      .then(setBranches)
      .catch(() => {
        /* non-fatal: the picker just stays empty */
      });
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setData(await fetchAdminDashboard(period, branchId));
      } catch (e: any) {
        setError(e?.message ?? 'No se pudo cargar el panel.');
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, branchId]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Open a top product's detail. The dashboard row only carries the id, so fetch
  // the full product first; a 404 means it was deleted from the catalogue.
  async function openProduct(tp: DashboardTopProduct) {
    if (openingKey) return;
    setOpeningKey(topProductKey(tp));
    try {
      const product = await fetchAdminProductDetail(tp.productId);
      // Pushed on Inicio's own stack — see HomeStack.
      navigation.navigate('AdminProductDetail', { product });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        showToast('Este producto ya no existe', 'alert-circle');
      } else {
        showToast('No se pudo abrir el producto', 'alert-circle');
      }
    } finally {
      setOpeningKey(null);
    }
  }

  // Open the full sale detail (which re-fetches complete data + line items). The
  // dashboard row is partial, so we pass what we have as a fallback — same trick
  // the seller's dashboard uses.
  function openSale(sale: AdminRecentSale) {
    navigation.navigate('AdminSaleDetail', {
      sale: {
        id: sale.id,
        customerName: sale.customerName,
        subtotal: sale.total,
        discount: 0,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        notes: null,
        itemsCount: sale.itemsCount,
        createdAt: sale.createdAt,
        seller: sale.seller,
        branch: sale.branch,
      },
    });
  }

  const firstName = user?.name?.split(' ')[0];
  const summary = data?.summary;
  const branchName =
    branchId == null ? 'Todas las sucursales' : branches.find((b) => b.id === branchId)?.name ?? '—';

  return (
    <View style={styles.container}>
      {/* Fixed: the period has to stay in sight, or you scroll down to a number
          and no longer know which period it belongs to. It sits OUTSIDE the
          ScrollView rather than using `stickyHeaderIndices`, because a sticky
          header on Android is only translated into view — it is still hit-tested
          where it was laid out, so its buttons stop responding as soon as you
          scroll away from the top. */}
      <View>
        <ScreenTitle
          overline={firstName ? `Hola, ${firstName} 👋` : 'Hola 👋'}
          title="Panel general"
          actions={
            <Avatar
              name={user?.name}
              onPress={() => navigation.navigate('AdminProfile')}
              accessibilityLabel="Perfil"
            />
          }
        >
          <Select
            icon="calendar-outline"
            placeholder="Período"
            value={period}
            options={PERIOD_OPTIONS}
            onChange={(v) => v && setPeriod(v)}
            mandatory
          />
        </ScreenTitle>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Branch scope */}
        <View style={styles.branchRow}>
          <FilterPill
            icon="storefront-outline"
            label={branchName}
            active={branchId != null}
            onPress={() => setBranchPickerOpen(true)}
            onClear={() => setBranchId(null)}
            chevron
            accessibilityLabel="Filtrar por sucursal"
          />
        </View>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            message={error}
            action={{ label: 'Reintentar', onPress: () => load() }}
          />
        ) : (
          <>
            {/* KPI cards */}
            <SalesKpiGrid summary={summary} />

            {/* Low stock alert — tap to see the critical products */}
            {data && data.lowStock.count > 0 && (
              <TouchableOpacity
                style={styles.lowStock}
                activeOpacity={ROW_PRESS_OPACITY}
                onPress={() =>
                  navigation.navigate('AdminLowStock', {
                    items: data.lowStock.products,
                    threshold: data.lowStock.threshold,
                    hasMore: data.lowStock.hasMore,
                  })
                }
              >
                <View style={styles.lowStockIcon}>
                  <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
                </View>
                <Text style={styles.lowStockText}>
                  <Text style={styles.lowStockCount}>{data.lowStock.count}</Text>
                  {data.lowStock.count === 1 ? ' combinación' : ' combinaciones'} con stock bajo
                  {' '}(menos de {data.lowStock.threshold} uds.)
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.warning} />
              </TouchableOpacity>
            )}

            {/* Top products — header + list wrapped in one card. */}
            <Card inset style={styles.sectionCard}>
              <SectionHeader
                card
                dot
                icon="trophy-outline"
                title="Más vendidos"
                // Always offered, like the seller's. Carries the branch scope so
                // the list matches what the dashboard is showing.
                action={{
                  label: 'Ver todas',
                  onPress: () => navigation.navigate('AdminTopProducts', { period, branchId }),
                }}
              />
              {!data || data.topProducts.length === 0 ? (
                <EmptyState
                  compact
                  icon="trophy-outline"
                  message="Nadie vendió nada en este período."
                />
              ) : (
                data.topProducts.map((tp, index) => (
                  <TopProductRow
                    key={topProductKey(tp)}
                    name={tp.name}
                    variationLabel={tp.variationLabel}
                    imageUri={tp.imageThumbUrl}
                    quantitySold={tp.quantitySold}
                    total={tp.total}
                    onPress={() => openProduct(tp)}
                    loading={openingKey === topProductKey(tp)}
                    disabled={openingKey !== null}
                    divided={index > 0}
                  />
                ))
              )}
            </Card>

            {/* Sales by branch */}
            {data && data.salesByBranch.length > 0 && (
              <Card inset style={styles.sectionCard}>
                <SectionHeader card dot icon="storefront-outline" title="Por sucursal" />
                {data.salesByBranch.map((b, index) => (
                  <View key={b.branchId} style={[styles.breakRow, index > 0 && styles.rowBorder]}>
                    <View style={styles.iconBox}>
                      <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topName} numberOfLines={1}>
                        {b.branchName}
                      </Text>
                      <Text style={styles.topCategory}>
                        {b.salesCount} {b.salesCount === 1 ? 'venta' : 'ventas'}
                      </Text>
                    </View>
                    <Text style={styles.orderTotal}>{formatPrice(b.total)}</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Sales by seller */}
            {data && data.salesBySeller.length > 0 && (
              <Card inset style={styles.sectionCard}>
                <SectionHeader card dot icon="person-outline" title="Por vendedor" />
                {data.salesBySeller.map((s, index) => (
                  <View key={s.sellerId} style={[styles.breakRow, index > 0 && styles.rowBorder]}>
                    <Avatar name={s.sellerName} size="sm" />
                    <View style={styles.topInfo}>
                      <Text style={styles.topName} numberOfLines={1}>
                        {s.sellerName}
                      </Text>
                      <Text style={styles.topCategory}>
                        {s.salesCount} {s.salesCount === 1 ? 'venta' : 'ventas'}
                      </Text>
                    </View>
                    <Text style={styles.orderTotal}>{formatPrice(s.total)}</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Recent sales — header + list wrapped in one card. */}
            <Card inset style={styles.sectionCard}>
              <SectionHeader
                card
                dot
                icon="receipt-outline"
                title="Ventas recientes"
                action={{ label: 'Ver todas', onPress: () => navigation.navigate('AdminSalesTab') }}
              />
              {!data || data.recentSales.length === 0 ? (
                <EmptyState
                  compact
                  icon="receipt-outline"
                  message="Ningún vendedor registró ventas en este período."
                  action={{
                    label: 'Ver todas las ventas',
                    icon: 'receipt-outline',
                    onPress: () => navigation.navigate('AdminSalesTab'),
                  }}
                />
              ) : (
                data.recentSales.map((sale, index) => (
                  <SaleRow
                    key={sale.id}
                    id={sale.id}
                    relativeDate
                    total={sale.total}
                    paymentMethod={sale.paymentMethod}
                    createdAt={sale.createdAt}
                    seller={sale.seller?.name}
                    branch={sale.branch?.name}
                    onPress={() => openSale(sale)}
                    divided={index > 0}
                  />
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Branch picker */}
      <BottomSheet
        visible={branchPickerOpen}
        onClose={() => setBranchPickerOpen(false)}
        title="Sucursal"
        scrollable
      >
        <SheetOption
          label="Todas las sucursales"
          active={branchId == null}
          onPress={() => {
            setBranchId(null);
            setBranchPickerOpen(false);
          }}
        />
        {branches.map((b) => (
          <SheetOption
            key={b.id}
            label={b.name}
            active={branchId === b.id}
            onPress={() => {
              setBranchId(b.id);
              setBranchPickerOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // A titled card (header + list inside): carries the gap to the block above, and
  // a bottom pad so the last row isn't flush to the card edge.
  sectionCard: { marginTop: SPACING.sm, paddingBottom: SPACING.sm },
  // flexGrow lets the loading / error state fill the space left under the header
  // and centre itself in it; without it they collapse to their own height and sit
  // right below the period selector. The bottom tab bar already reserves the
  // safe-area inset, so only a small visual gap is needed here.
  scroll: { flexGrow: 1, paddingBottom: SPACING.sm },
  // Wraps the branch pill so it keeps the screen margin and the gap below it (it
  // sits between the pinned period bar and the KPIs). The pill itself is a shared
  // FilterPill, flex:1 to fill this row.
  branchRow: { flexDirection: 'row', marginHorizontal: SPACING.sm, marginBottom: SPACING.md },
  lowStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.sm,
    borderRadius: RADIUS.card,
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  lowStockIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.control,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowStockText: { fontFamily: FONT_FAMILY.regular, flex: 1, fontSize: FONT_SIZE.caption, lineHeight: 18, color: colors.textPrimary },
  lowStockCount: { fontFamily: FONT_FAMILY.bold, color: colors.warning },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  topInfo: { flex: 1 },
  topName: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.medium, color: colors.textPrimary },
  topCategory: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: SPACING.hairline },
  iconBox: {
    width: SIZE.iconBox,
    height: SIZE.iconBox,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTotal: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
});
