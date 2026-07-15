import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchStatistics } from '../api/sales';
import { fetchProduct } from '../api/products';
import { ApiError } from '../api/client';
import Avatar from '../components/Avatar';
import KpiCard, { KpiGrid } from '../components/KpiCard';
import SaleRow from '../components/SaleRow';
import TopProductRow, { topProductKey } from '../components/TopProductRow';
import ScreenTitle from '../components/ScreenTitle';
import SectionHeader from '../components/SectionHeader';
import Card from '../components/Card';
import Segmented from '../components/Segmented';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import type { DashboardRecentSale, DashboardStats, DashboardTopProduct, StatsPeriod } from '../types';

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which best-seller row is being opened. A variable product ranks once per
  // variation, so several rows share a productId — the key has to include it.
  const [openingKey, setOpeningKey] = useState<string | null>(null);

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
    if (openingKey) return;
    setOpeningKey(topProductKey(tp));
    try {
      const product = await fetchProduct(tp.productId);
      // Pushed on Inicio's own stack — see DashboardStack. Carry the variation
      // through, so the detail opens on the one that actually sold.
      navigation.navigate('ProductDetail', { product, variationId: tp.variationId ?? undefined });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        showToast('Este producto ya no está disponible', 'alert-circle');
      } else {
        showToast('No se pudo abrir el producto', 'alert-circle');
      }
    } finally {
      setOpeningKey(null);
    }
  }

  // Open the full sale detail (which re-fetches complete data + line items). The
  // dashboard row is partial, so we pass what we have as a fallback.
  function openSale(sale: DashboardRecentSale) {
    navigation.navigate('OrderDetail', {
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
    });
  }

  const firstName = user?.name?.split(' ')[0];
  const summary = stats?.summary;

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
          title="Mis ventas"
          actions={
            <Avatar
              name={user?.name}
              onPress={() => navigation.navigate('Profile')}
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

            {/* Top products */}
            <SectionHeader icon="trophy-outline" title="Más vendidos" />
            {!stats || stats.topProducts.length === 0 ? (
              <EmptyState
                compact
                icon="trophy-outline"
                message="Aún no vendes nada en este período."
              />
            ) : (
              <Card inset>
                {stats.topProducts.map((tp, index) => (
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

            {/* Recent sales */}
            <SectionHeader
              icon="receipt-outline"
              title="Ventas recientes"
              action={{
                label: 'Ver todas',
                onPress: () => navigation.navigate('OrdersTab', { screen: 'Orders' }),
              }}
            />
            {!stats || stats.recentSales.length === 0 ? (
              <EmptyState
                compact
                icon="receipt-outline"
                message="Aún no registras ventas en este período."
                action={{
                  label: 'Ir al catálogo',
                  icon: 'cube-outline',
                  onPress: () => navigation.navigate('CatalogTab'),
                }}
              />
            ) : (
              <Card inset>
                {stats.recentSales.map((sale, index) => (
                  <SaleRow
                    key={sale.id}
                    id={sale.id}
                    relativeDate
                    total={sale.total}
                    paymentMethod={sale.paymentMethod}
                    createdAt={sale.createdAt}
                    onPress={() => openSale(sale)}
                    divided={index > 0}
                  />
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
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
});
