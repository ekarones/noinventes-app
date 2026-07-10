import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
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
import { fetchAdminDashboard } from '../api/admin/dashboard';
import { fetchAdminBranches } from '../api/admin/branches';
import ProductImage from '../components/ProductImage';
import type { AdminBranch, AdminDashboard, StatsPeriod } from '../types';

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

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

  const summary = data?.summary;
  const branchName =
    branchId == null ? 'Todas las sucursales' : branches.find((b) => b.id === branchId)?.name ?? '—';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
            <Text style={styles.headerTitle}>Panel general</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AdminProfile')}
            accessibilityLabel="Perfil"
          >
            <Text style={styles.profileInitial}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
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

        {/* Branch scope */}
        <TouchableOpacity
          style={[styles.branchSelect, branchId != null && styles.branchSelectActive]}
          onPress={() => setBranchPickerOpen(true)}
          activeOpacity={0.8}
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
            <TouchableOpacity onPress={() => setBranchId(null)} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

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

            {/* Low stock alert */}
            {data && data.lowStock.count > 0 && (
              <View style={styles.lowStock}>
                <View style={styles.lowStockIcon}>
                  <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
                </View>
                <Text style={styles.lowStockText}>
                  <Text style={styles.lowStockCount}>{data.lowStock.count}</Text>
                  {data.lowStock.count === 1 ? ' combinación' : ' combinaciones'} con stock bajo
                  {' '}(menos de {data.lowStock.threshold} uds.)
                </Text>
              </View>
            )}

            {/* Top products */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Más vendidos</Text>
            </View>
            {!data || data.topProducts.length === 0 ? (
              <Text style={styles.emptyText}>Sin ventas en este período.</Text>
            ) : (
              <View style={styles.card}>
                {data.topProducts.map((tp, index) => (
                  <View
                    key={tp.productId}
                    style={[styles.topRow, index > 0 && styles.rowBorder]}
                  >
                    <View style={styles.topThumbWrap}>
                      <ProductImage uri={tp.imageUrl} style={styles.topThumb} iconSize={18} />
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topName} numberOfLines={1}>
                        {tp.name}
                      </Text>
                      <Text style={styles.topCategory}>{formatPrice(tp.total)}</Text>
                    </View>
                    <Text style={styles.topQty}>{tp.quantitySold} uds.</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Sales by branch */}
            {data && data.salesByBranch.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Por sucursal</Text>
                </View>
                <View style={styles.card}>
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
                </View>
              </>
            )}

            {/* Sales by seller */}
            {data && data.salesBySeller.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Por vendedor</Text>
                </View>
                <View style={styles.card}>
                  {data.salesBySeller.map((s, index) => (
                    <View key={s.sellerId} style={[styles.breakRow, index > 0 && styles.rowBorder]}>
                      <View style={styles.avatarSm}>
                        <Text style={styles.avatarSmText}>
                          {s.sellerName?.charAt(0).toUpperCase() ?? '?'}
                        </Text>
                      </View>
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
                </View>
              </>
            )}

            {/* Recent sales */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ventas recientes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminSalesTab')}>
                <Text style={styles.link}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {!data || data.recentSales.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="bag-handle-outline" size={40} color={colors.border} />
                <Text style={styles.emptyText}>Sin ventas en este período.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {data.recentSales.map((sale, index) => (
                  <View key={sale.id} style={[styles.orderRow, index > 0 && styles.rowBorder]}>
                    <View style={styles.iconBox}>
                      <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topName} numberOfLines={1}>
                        Venta #{sale.id}
                        {sale.seller ? ` · ${sale.seller.name}` : ''}
                      </Text>
                      <Text style={styles.topCategory}>
                        {sale.branch ? `${sale.branch.name} · ` : ''}
                        {formatRelative(sale.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.orderTotal}>{formatPrice(sale.total)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Branch picker */}
      <Modal
        visible={branchPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBranchPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBranchPickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sucursal</Text>
            <ScrollView>
              <PickerRow
                label="Todas las sucursales"
                active={branchId == null}
                onPress={() => {
                  setBranchId(null);
                  setBranchPickerOpen(false);
                }}
              />
              {branches.map((b) => (
                <PickerRow
                  key={b.id}
                  label={b.name}
                  active={branchId === b.id}
                  onPress={() => {
                    setBranchId(b.id);
                    setBranchPickerOpen(false);
                  }}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PickerRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.pickerRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
    </TouchableOpacity>
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
  branchSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  branchSelectActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  branchSelectText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  branchSelectTextActive: { color: colors.primary },
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
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  pickerLabel: { flex: 1, fontSize: 16, color: colors.textPrimary },
  pickerLabelActive: { fontWeight: '700', color: colors.primary },
  centerPad: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
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
  lowStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  lowStockIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowStockText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textPrimary },
  lowStockCount: { fontWeight: '700', color: colors.warning },
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
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
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
  topInfo: { flex: 1 },
  topName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  topCategory: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  topQty: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSm: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
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
