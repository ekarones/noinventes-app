import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AdminHomeNavigation } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchAdminDashboard } from '../api/admin/dashboard';
import { fetchAdminProductDetail } from '../api/admin/products';
import { ApiError } from '../api/client';
import { fetchAdminBranches } from '../api/admin/branches';
import ProfileButton from '../components/ProfileButton';
import Segmented, { type SegmentedOption } from '../components/Segmented';
import SalesKpiGrid from '../components/SalesKpiGrid';
import TopProductRow, { topProductKey } from '../components/TopProductRow';
import SaleRow from '../components/SaleRow';
import ScreenTitle from '../components/ScreenTitle';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import type {
  AdminBranch,
  AdminDashboard,
  AdminRecentSale,
  DashboardTopProduct,
  StatsPeriod,
} from '../types';

const PERIOD_OPTIONS: SegmentedOption<StatsPeriod>[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

export default function AdminDashboardScreen() {
  const navigation = useNavigation<AdminHomeNavigation>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
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

  async function openProduct(tp: DashboardTopProduct) {
    if (openingKey) return;
    setOpeningKey(topProductKey(tp));
    try {
      const product = await fetchAdminProductDetail(tp.productId);
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
  const context =
    branchId != null
      ? branchName
      : branches.length
        ? `${branches.length} ${branches.length === 1 ? 'sucursal' : 'sucursales'}`
        : undefined;
  // Share of the period's branch sales, for the "Por sucursal" proportion bars.
  const branchTotalSum = data?.salesByBranch.reduce((s, b) => s + b.total, 0) ?? 0;

  return (
    <View style={styles.container}>
      <View>
        <ScreenTitle
          overline={firstName ? `Hola, ${firstName} 👋` : 'Hola 👋'}
          title="Panel general"
          subtitle={context}
          actions={
            <ProfileButton raised name={user?.name} onPress={() => navigation.navigate('AdminProfile')} />
          }
        />
        <View style={styles.filterBand}>
          {/* Segmented's track is flex:1 (built to fill a row); wrap it so that
              flex resolves against the width here, not the column's height. */}
          <View style={styles.periodRow}>
            <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          </View>
          <TouchableOpacity
            style={styles.branchBtn}
            onPress={() => setBranchPickerOpen(true)}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Filtrar por sucursal"
          >
            <Ionicons name="storefront-outline" size={18} color="rgba(22, 33, 58, 0.5)" />
            <Text style={styles.branchText} numberOfLines={1}>
              {branchName}
            </Text>
            <Ionicons name="chevron-down" size={16} color="rgba(22, 33, 58, 0.45)" />
          </TouchableOpacity>
        </View>
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
            <SalesKpiGrid summary={summary} />

            {/* Low stock alert */}
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
                <Ionicons name="alert-circle-outline" size={22} color="#b57f00" />
                <Text style={styles.lowStockText}>
                  <Text style={styles.lowStockCount}>{data.lowStock.count}</Text>
                  {data.lowStock.count === 1 ? ' combinación' : ' combinaciones'} con stock bajo (menos
                  de {data.lowStock.threshold} uds.)
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#b57f00" />
              </TouchableOpacity>
            )}

            {/* Top products */}
            <View style={styles.card}>
              <SectionHeader
                card
                dot
                icon="trophy-outline"
                title="Más vendidos"
                action={{
                  label: 'Ver todas',
                  onPress: () => navigation.navigate('AdminTopProducts', { period, branchId }),
                }}
              />
              {!data || data.topProducts.length === 0 ? (
                <EmptyState compact icon="trophy-outline" message="Nadie vendió nada en este período." />
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
            </View>

            {/* Sales by branch (only when not scoped to one) */}
            {data && data.salesByBranch.length > 0 && (
              <View style={styles.card}>
                <SectionHeader card dot icon="storefront-outline" title="Por sucursal" />
                {data.salesByBranch.map((b, index) => (
                  <View key={b.branchId} style={[styles.breakRow, index > 0 && styles.rowBorder]}>
                    <View style={styles.breakInfo}>
                      <Text style={styles.breakName} numberOfLines={1}>
                        {b.branchName}
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${branchTotalSum > 0 ? (b.total / branchTotalSum) * 100 : 0}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.breakRight}>
                      <Text style={styles.breakTotal}>{formatPrice(b.total)}</Text>
                      <Text style={styles.breakCount}>
                        {b.salesCount} {b.salesCount === 1 ? 'venta' : 'ventas'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sales by seller */}
            {data && data.salesBySeller.length > 0 && (
              <View style={styles.card}>
                <SectionHeader card dot icon="person-outline" title="Por vendedor" />
                {data.salesBySeller.map((s, index) => (
                  <View key={s.sellerId} style={[styles.breakRow, index > 0 && styles.rowBorder]}>
                    <View style={styles.sellerAvatar}>
                      <Text style={styles.sellerInitial}>
                        {s.sellerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.breakInfo}>
                      <Text style={styles.breakName} numberOfLines={1}>
                        {s.sellerName}
                      </Text>
                      <Text style={styles.sellerCount}>
                        {s.salesCount} {s.salesCount === 1 ? 'venta' : 'ventas'}
                      </Text>
                    </View>
                    <Text style={styles.breakTotal}>{formatPrice(s.total)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent sales */}
            <View style={styles.card}>
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
            </View>
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    filterBand: {
      backgroundColor: colors.surface,
      paddingHorizontal: 22,
      paddingVertical: 12,
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    periodRow: { flexDirection: 'row' },
    branchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 44,
      paddingHorizontal: 12,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    branchText: { flex: 1, fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 18, gap: 14 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 6,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    lowStock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: '#fff9e6',
      borderWidth: 1.5,
      borderColor: '#f5d98a',
    },
    lowStockText: { flex: 1, fontSize: 13.5, fontFamily: FONT_FAMILY.extrabold, color: '#7a5600', lineHeight: 18 },
    lowStockCount: { fontFamily: FONT_FAMILY.black, color: colors.primary },
    breakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
    breakInfo: { flex: 1, minWidth: 0 },
    breakName: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.fill, marginTop: 6, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: '#ffc20e' },
    breakRight: { alignItems: 'flex-end', flexShrink: 0 },
    breakTotal: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    breakCount: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    sellerCount: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    sellerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sellerInitial: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: colors.primary },
  });
