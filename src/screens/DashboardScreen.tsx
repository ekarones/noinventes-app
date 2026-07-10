import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatPrice, formatRelative } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchStatistics } from '../api/sales';
import { fetchProduct } from '../api/products';
import { ApiError } from '../api/client';
import ProductImage from '../components/ProductImage';
import type { DashboardRecentSale, DashboardStats, DashboardTopProduct, StatsPeriod } from '../types';

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setStats(await fetchStatistics(period));
      } catch (e: any) {
        setError(e?.message ?? 'No se pudieron cargar las estadísticas.');
        setStats(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period]
  );

  // Runs on focus and whenever the period changes (callback identity changes).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Open a top product's detail. Fetch the full product by id first; a 404 means
  // it was removed / is no longer visible, so we let the seller know.
  async function openProduct(tp: DashboardTopProduct) {
    if (openingId) return;
    setOpeningId(tp.productId);
    try {
      const product = await fetchProduct(tp.productId);
      navigation.navigate('CatalogTab', {
        screen: 'ProductDetail',
        initial: false,
        params: { product },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        showToast('Este producto ya no está disponible', 'alert-circle');
      } else {
        showToast('No se pudo abrir el producto', 'alert-circle');
      }
    } finally {
      setOpeningId(null);
    }
  }

  // Open the full sale detail (which re-fetches complete data + line items). The
  // dashboard row is partial, so we pass what we have as a fallback.
  function openSale(sale: DashboardRecentSale) {
    navigation.navigate('OrdersTab', {
      screen: 'OrderDetail',
      initial: false,
      params: {
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
        },
      },
    });
  }

  const summary = stats?.summary;

  return (
    <View style={styles.container}>
      <ScrollView
        // The bottom tab bar already reserves the safe-area inset, so only a
        // small visual gap is needed here (adding insets.bottom double-counts it).
        contentContainerStyle={{ paddingBottom: 24 }}
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
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTexts}>
            <Text style={styles.hello}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.headerTitle}>Mis ventas</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Profile')}
            accessibilityLabel="Perfil"
          >
            <Text style={styles.profileInitial}>
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[styles.periodPill, active && styles.periodPillActive]}
                onPress={() => setPeriod(p.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centerPad}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerPad}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.border} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.cta} onPress={() => load()}>
              <Text style={styles.ctaText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* KPI cards */}
            <View style={styles.kpiGrid}>
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
            </View>

            {/* Top products */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Más vendidos</Text>
            </View>
            {!stats || stats.topProducts.length === 0 ? (
              <Text style={styles.emptyText}>Sin ventas en este período.</Text>
            ) : (
              <View style={styles.card}>
                {stats.topProducts.map((tp, index) => (
                  <TouchableOpacity
                    key={tp.productId}
                    style={[styles.topRow, index > 0 && styles.rowBorder]}
                    activeOpacity={0.7}
                    onPress={() => openProduct(tp)}
                    disabled={openingId !== null}
                  >
                    <View style={styles.topThumbWrap}>
                      <ProductImage uri={tp.imageUrl} style={styles.topThumb} iconSize={18} />
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      {openingId === tp.productId && (
                        <View style={styles.thumbSpinner}>
                          <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topName} numberOfLines={1}>
                        {tp.name}
                      </Text>
                      <Text style={styles.topCategory}>{formatPrice(tp.total)}</Text>
                    </View>
                    <Text style={styles.topQty}>{tp.quantitySold} uds.</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent sales */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ventas recientes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrdersTab', { screen: 'Orders' })}>
                <Text style={styles.link}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {!stats || stats.recentSales.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="bag-handle-outline" size={40} color={colors.border} />
                <Text style={styles.emptyText}>Aún no registras ventas en este período.</Text>
                <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('CatalogTab')}>
                  <Text style={styles.ctaText}>Ir al catálogo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                {stats.recentSales.map((sale, index) => (
                  <TouchableOpacity
                    key={sale.id}
                    style={[styles.orderRow, index > 0 && styles.rowBorder]}
                    activeOpacity={0.7}
                    onPress={() => openSale(sale)}
                  >
                    <View style={styles.iconBox}>
                      <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topName}>Venta #{sale.id}</Text>
                      <Text style={styles.topCategory}>{formatRelative(sale.createdAt)}</Text>
                    </View>
                    <Text style={styles.orderTotal}>{formatPrice(sale.total)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function KpiCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.kpiCard, highlight && styles.kpiCardHighlight]}>
      <View style={[styles.kpiIcon, highlight && styles.kpiIconHighlight]}>
        <Ionicons name={icon} size={20} color={highlight ? colors.textOnPrimary : colors.primary} />
      </View>
      <Text style={[styles.kpiValue, highlight && styles.kpiTextOnPrimary]}>{value}</Text>
      <Text style={[styles.kpiLabel, highlight && styles.kpiTextOnPrimarySoft]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTexts: { flex: 1 },
  hello: { fontSize: 15, color: colors.textSecondary },
  headerTitle: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  profileBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { color: colors.textOnPrimary, fontSize: 18, fontWeight: '700' },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  periodPill: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  periodTextActive: { color: colors.textOnPrimary },
  centerPad: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiCardHighlight: { backgroundColor: colors.primary, borderColor: colors.primary },
  kpiIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiIconHighlight: { backgroundColor: 'rgba(255,255,255,0.25)' },
  kpiValue: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  kpiLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  kpiTextOnPrimary: { color: colors.textOnPrimary },
  kpiTextOnPrimarySoft: { color: 'rgba(255,255,255,0.85)' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  link: { fontSize: 14, fontWeight: '600', color: colors.primary },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  topThumbWrap: { width: 48, height: 48 },
  topThumb: { width: 48, height: 48, borderRadius: 12 },
  rankBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  rankText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 11 },
  thumbSpinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  topInfo: { flex: 1 },
  topName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  topCategory: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  topQty: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTotal: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 10, marginHorizontal: 20 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '700' },
});
