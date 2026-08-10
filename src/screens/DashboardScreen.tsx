import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { DashboardNavigation } from '../navigation/types';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchStatistics } from '../api/sales';
import { fetchProduct } from '../api/products';
import { ApiError } from '../api/client';
import ProfileButton from '../components/ProfileButton';
import Segmented, { type SegmentedOption } from '../components/Segmented';
import SalesKpiGrid from '../components/SalesKpiGrid';
import SaleRow from '../components/SaleRow';
import TopProductRow, { topProductKey } from '../components/TopProductRow';
import ScreenTitle from '../components/ScreenTitle';
import SectionHeader from '../components/SectionHeader';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import type { DashboardRecentSale, DashboardStats, DashboardTopProduct, StatsPeriod } from '../types';

const PERIOD_OPTIONS: SegmentedOption<StatsPeriod>[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigation>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();

  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function openProduct(tp: DashboardTopProduct) {
    if (openingKey) return;
    setOpeningKey(topProductKey(tp));
    try {
      const product = await fetchProduct(tp.productId);
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
      {/* Fixed above the scroll: the header + the period stay in sight. */}
      <View>
        <ScreenTitle
          overline={firstName ? `Hola, ${firstName} 👋` : 'Hola 👋'}
          title="Mis ventas"
          subtitle={user?.branch?.name ?? undefined}
          actions={
            <ProfileButton name={user?.name} onPress={() => navigation.navigate('Profile')} />
          }
        />
        <View style={styles.filterBand}>
          <Text style={styles.periodLabel}>Período</Text>
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
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

            {/* Top products */}
            <View style={styles.card}>
              <SectionHeader
                card
                dot
                icon="trophy-outline"
                title="Más vendidos"
                action={{
                  label: 'Ver todas',
                  onPress: () => navigation.navigate('TopProducts', { period }),
                }}
              />
              {!stats || stats.topProducts.length === 0 ? (
                <EmptyState compact icon="trophy-outline" message="Aún no vendes nada en este período." />
              ) : (
                stats.topProducts.map((tp, index) => (
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

            {/* Recent sales */}
            <View style={styles.card}>
              <SectionHeader
                card
                dot
                icon="receipt-outline"
                title="Ventas recientes"
                action={{
                  label: 'Ver todas',
                  onPress: () => navigation.navigate('OrdersTab', { screen: 'Orders' }),
                }}
              />
              {!stats || stats.recentSales.length === 0 ? (
                <EmptyState compact icon="receipt-outline" message="Aún no registras ventas en este período." />
              ) : (
                stats.recentSales.map((sale, index) => (
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
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // A white band with the period switch, pinned under the header.
    filterBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    periodLabel: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.5)',
    },
    scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 18, gap: 14 },
    // A titled panel (5a): white, big radius, soft shadow.
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
  });
