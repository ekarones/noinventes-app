import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../theme/tokens';
import ScreenHeader from '../components/ScreenHeader';
import { formatDate, formatPrice } from '../utils/format';
import { paymentMethodLabel } from '../utils/payment';
import {
  cancelAdminSale,
  fetchAdminSaleDetail,
  fetchAdminTrashDetail,
} from '../api/admin/sales';
import { downloadAndShareAdminBoleta } from '../api/admin/boleta';
import Button from '../components/Button';
import type { AdminSaleDetail } from '../types';
import type { AdminSalesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminSalesStackParamList, 'AdminSaleDetail'>;

export default function AdminSaleDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { sale, trashed = false } = route.params;
  const [detail, setDetail] = useState<AdminSaleDetail | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingItems(true);
      const fetcher = trashed ? fetchAdminTrashDetail : fetchAdminSaleDetail;
      fetcher(sale.id)
        .then((d) => active && setDetail(d))
        .catch(() => active && setDetail(null))
        .finally(() => active && setLoadingItems(false));
      return () => {
        active = false;
      };
    }, [sale.id, trashed])
  );

  // Prefer the freshly-fetched detail; fall back to the row passed via params.
  const v = detail ?? sale;
  const items = detail?.items ?? null;
  // A cancelled sale (either opened from trash, or the passed row carries a
  // deletedAt) can't be cancelled again.
  const isCancelled = trashed || !!detail?.deletedAt || !!sale.deletedAt;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAndShareAdminBoleta(sale.id);
    } catch {
      Alert.alert('No se pudo descargar', 'No se pudo obtener la boleta. Inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Anular venta',
      `¿Anular la venta #${sale.id}? Se devolverá el stock a la sucursal original. Esta acción no se puede deshacer.`,
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
      const res = await cancelAdminSale(sale.id);
      const warning =
        res.skipped > 0
          ? `\n\n${res.skipped} artículo(s) no se pudieron restaurar (producto eliminado del catálogo).`
          : '';
      Alert.alert('Venta anulada', `${res.message}${warning}`, [
        { text: 'Aceptar', onPress: () => navigation.navigate('AdminSales') },
      ]);
    } catch (e: any) {
      Alert.alert('No se pudo anular', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setCancelling(false);
    }
  }

  const busy = downloading || cancelling;
  const deletedAt = detail?.deletedAt ?? sale.deletedAt ?? null;

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Venta #${sale.id}`} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cancelled banner */}
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <Text style={styles.cancelledText}>
              Venta anulada{deletedAt ? ` · ${formatDate(deletedAt)}` : ''}
            </Text>
          </View>
        )}

        {/* Meta */}
        <View style={styles.metaCard}>
          <MetaRow icon="person-outline" text={v.customerName} />
          {v.seller && <MetaRow icon="pricetag-outline" text={`Vendedor: ${v.seller.name}`} />}
          {v.branch && <MetaRow icon="storefront-outline" text={v.branch.name} />}
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

        <Button
          label="Descargar boleta (PDF)"
          icon="download-outline"
          onPress={handleDownload}
          loading={downloading}
          disabled={busy}
          style={styles.actionTop}
        />

        {/* Cancel — only for active sales */}
        {!isCancelled && (
          <Button
            label="Anular venta"
            icon="trash-outline"
            variant="danger"
            onPress={confirmCancel}
            loading={cancelling}
            disabled={busy}
            style={styles.actionNext}
          />
        )}

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
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  cancelledText: { color: colors.error, fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold, flex: 1 },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { fontSize: FONT_SIZE.bodySm, color: colors.textPrimary, flex: 1 },
  sectionTitle: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: 22, marginBottom: 10 },
  itemsError: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
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
  qtyText: { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.bodySm },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  itemMeta: { fontSize: FONT_SIZE.caption, color: colors.textSecondary },
  itemTotal: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  totalsBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
  totalValue: { fontSize: FONT_SIZE.bodySm, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
  grandLabel: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  grandValue: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  actionTop: { marginTop: 24 },
  actionNext: { marginTop: 12 },
  hint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
});
