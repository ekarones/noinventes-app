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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchAdminDashboard } from '../api/admin/dashboard';
import { fetchAdminProductDetail } from '../api/admin/products';
import { ApiError } from '../api/client';
import { fetchAdminBranches } from '../api/admin/branches';
import Avatar from '../components/Avatar';
import KpiCard, { KpiGrid } from '../components/KpiCard';
import TopProductRow, { topProductKey } from '../components/TopProductRow';
import SaleRow from '../components/SaleRow';
import ScreenTitle from '../components/ScreenTitle';
import SectionHeader from '../components/SectionHeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Segmented from '../components/Segmented';
import LoadingState from '../components/LoadingState';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import type {
  AdminBranch,
  AdminDashboard,
  AdminRecentSale,
  DashboardTopProduct,
  StatsPeriod,
} from '../types';

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
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
        />
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
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
        <TouchableOpacity
          style={[styles.branchSelect, branchId != null && styles.branchSelectActive]}
          onPress={() => setBranchPickerOpen(true)}
          activeOpacity={ROW_PRESS_OPACITY}
        >
          <Ionicons
            name="storefront-outline"
            size={18}
            color={branchId != null ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.branchSelectText, branchId != null && styles.branchSelectTextActive]}
            numberOfLines={1}
          >
            {branchName}
          </Text>
          {branchId != null ? (
            // Can't grow to the touch minimum — it lives inside the row it clears —
            // so it borrows the room around it.
            <TouchableOpacity
              onPress={() => setBranchId(null)}
              hitSlop={HIT_SLOP}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityLabel="Ver todas las sucursales"
            >
              <Ionicons name="close-circle" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

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
            <KpiGrid>
              <KpiCard
                icon="cash-outline"
                label="Ventas totales"
                value={formatPrice(summary?.totalSales ?? 0)}
                highlight
              />
              <KpiCard icon="receipt-outline" label="Ventas" value={String(summary?.salesCount ?? 0)} />
              <KpiCard
                icon="cube-outline"
                label="Artículos vendidos"
                value={String(summary?.itemsSold ?? 0)}
              />
              <KpiCard
                icon="trending-up-outline"
                label="Ticket promedio"
                value={formatPrice(summary?.averageTicket ?? 0)}
              />
            </KpiGrid>

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

            {/* Top products */}
            <SectionHeader icon="trophy-outline" title="Más vendidos" />
            {!data || data.topProducts.length === 0 ? (
              <EmptyState
                compact
                icon="trophy-outline"
                message="Nadie vendió nada en este período."
              />
            ) : (
              <Card inset>
                {data.topProducts.map((tp, index) => (
                  <TopProductRow
                    key={topProductKey(tp)}
                    rank={index + 1}
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
                ))}
              </Card>
            )}

            {/* Sales by branch */}
            {data && data.salesByBranch.length > 0 && (
              <>
                <SectionHeader icon="storefront-outline" title="Por sucursal" />
                <Card inset>
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
              </>
            )}

            {/* Sales by seller */}
            {data && data.salesBySeller.length > 0 && (
              <>
                <SectionHeader icon="person-outline" title="Por vendedor" />
                <Card inset>
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
              </>
            )}

            {/* Recent sales */}
            <SectionHeader
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
              <Card inset>
                {data.recentSales.map((sale, index) => (
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
                ))}
              </Card>
            )}
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
  // flexGrow lets the loading / error state fill the space left under the header
  // and centre itself in it; without it they collapse to their own height and sit
  // right below the period selector. The bottom tab bar already reserves the
  // safe-area inset, so only a small visual gap is needed here.
  scroll: { flexGrow: 1, paddingBottom: SPACING['2xl'] },
  branchSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    // It sits between the pinned period bar and the KPIs, and owns the gap below
    // it — the grid no longer pads its own top now that the bar pads its bottom.
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  branchSelectActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  branchSelectText: { flex: 1, fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
  branchSelectTextActive: { color: colors.primary },
  lowStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
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
  lowStockText: { flex: 1, fontSize: FONT_SIZE.caption, lineHeight: 18, color: colors.textPrimary },
  lowStockCount: { fontWeight: FONT_WEIGHT.bold, color: colors.warning },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  topInfo: { flex: 1 },
  topName: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  topCategory: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: SPACING.hairline },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTotal: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
});
