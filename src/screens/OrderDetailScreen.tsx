import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { formatDate, formatPrice } from '../utils/format';
import { paymentMethodLabel } from '../utils/payment';
import { cancelSale, fetchSaleDetail } from '../api/sales';
import { downloadAndShareBoleta } from '../api/boleta';
import type { SaleDetail } from '../types';
import type { OrdersStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { sale } = route.params;
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // The list/dashboard rows only carry partial data (e.g. no subtotal/notes, and
  // the dashboard has no line items). Fetch the full sale and prefer it for
  // display, falling back to the passed-in row until it loads.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingItems(true);
      fetchSaleDetail(sale.id)
        .then((d) => active && setDetail(d))
        .catch(() => active && setDetail(null))
        .finally(() => active && setLoadingItems(false));
      return () => {
        active = false;
      };
    }, [sale.id])
  );

  // Prefer the freshly-fetched detail; fall back to the row passed via params.
  const v = detail ?? sale;
  const items = detail?.items ?? null;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAndShareBoleta(sale.id);
    } catch {
      Alert.alert('No se pudo descargar', 'No se pudo obtener la boleta. Inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Anular venta',
      `¿Anular la venta #${sale.id}? Se devolverá el stock a tu sucursal. Esta acción no se puede deshacer.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Anular', style: 'destructive', onPress: doCancel },
      ]
    );
  }

  async function doCancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const res = await cancelSale(sale.id);
      const warning =
        res.skipped > 0
          ? `\n\n${res.skipped} artículo(s) no se pudieron restaurar (producto eliminado del catálogo).`
          : '';
      Alert.alert('Venta anulada', `${res.message}${warning}`, [
        { text: 'Aceptar', onPress: () => navigation.navigate('Orders') },
      ]);
    } catch (e: any) {
      Alert.alert('No se pudo anular', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setCancelling(false);
    }
  }

  const busy = downloading || cancelling;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Orders')}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venta #{sale.id}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta */}
        <View style={styles.metaCard}>
          <MetaRow icon="person-outline" text={v.customerName} />
          <MetaRow icon="calendar-outline" text={formatDate(v.createdAt)} />
          <MetaRow icon="card-outline" text={paymentMethodLabel(v.paymentMethod)} />
          {!!v.notes && <MetaRow icon="document-text-outline" text={v.notes} />}
        </View>

        {/* Items */}
        <Text style={styles.sectionTitle}>Productos</Text>
        {loadingItems ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : items && items.length > 0 ? (
          <View style={styles.itemsBox}>
            {items.map((item, idx) => (
              <View key={item.id} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.quantity}×</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.productName}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.productCode} · {formatPrice(item.unitPrice)} c/u
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatPrice(item.subtotal)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.itemsError}>
            No se pudo cargar el detalle. Puedes descargar la boleta.
          </Text>
        )}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <Line label="Subtotal" value={formatPrice(v.subtotal)} />
          {v.discount > 0 && (
            <Line label="Descuento" value={`- ${formatPrice(v.discount)}`} discount />
          )}
          <View style={styles.divider} />
          <Line label="Total" value={formatPrice(v.total)} big />
        </View>

        {/* Boleta */}
        <TouchableOpacity
          style={[styles.boletaBtn, busy && styles.btnDisabled]}
          onPress={handleDownload}
          disabled={busy}
          activeOpacity={0.9}
        >
          {downloading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color={colors.textOnPrimary} />
              <Text style={styles.boletaText}>Descargar boleta (PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={[styles.cancelBtn, busy && styles.btnDisabled]}
          onPress={confirmCancel}
          disabled={busy}
          activeOpacity={0.9}
        >
          {cancelling ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={styles.cancelText}>Anular venta</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>La boleta es el recibo interno (no es comprobante SUNAT).</Text>
      </ScrollView>
    </View>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function Line({
  label,
  value,
  big,
  discount,
}: {
  label: string;
  value: string;
  big?: boolean;
  discount?: boolean;
}) {
  return (
    <View style={styles.totalLine}>
      <Text style={[styles.totalLabel, big && styles.grandLabel]}>{label}</Text>
      <Text
        style={[styles.totalValue, big && styles.grandValue, discount && { color: colors.success }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 22, marginBottom: 10 },
  itemsError: { fontSize: 14, color: colors.textSecondary },
  itemsBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  qtyBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  itemMeta: { fontSize: 13, color: colors.textSecondary },
  itemTotal: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalsBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  grandLabel: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  grandValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  boletaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 14,
    marginTop: 24,
  },
  boletaText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.error,
    marginTop: 12,
  },
  cancelText: { color: colors.error, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
});
