import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../theme/tokens';
import { formatDate, formatPrice } from '../utils/format';
import { paymentMethodLabel } from '../utils/payment';
import { cancelSale, fetchSaleDetail } from '../api/sales';
import { downloadAndShareBoleta, fetchReceiptPayload } from '../api/boleta';
import { MetaRow } from '../components/Row';
import SaleTotals from '../components/SaleTotals';
import Button from '../components/Button';
import { usePrinter } from '../context/PrinterContext';
import ScreenHeader from '../components/ScreenHeader';
import type { SaleDetail } from '../types';
import type { OrdersStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { sale } = route.params;
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printer = usePrinter();

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
      // Back to whichever list opened this — the history or Inicio. Both re-fetch
      // on focus, so the anulled sale is gone by the time it is on screen again.
      Alert.alert('Venta anulada', `${res.message}${warning}`, [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('No se pudo anular', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setCancelling(false);
    }
  }

  const busy = downloading || cancelling || printing;

  // The server composes the receipt from the sale id, so this no longer waits
  // for the line items to arrive — it used to, back when the app built the
  // ESC/POS itself and needed them.
  async function handlePrint() {
    if (printing) return;
    setPrinting(true);
    try {
      const { payload, encoding } = await fetchReceiptPayload(sale.id);
      await printer.printPayload(payload, encoding);
    } catch (e: any) {
      Alert.alert(
        'No se pudo imprimir',
        e?.message ?? 'Revisa que la impresora esté encendida y en rango.'
      );
    } finally {
      setPrinting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Venta #${sale.id}`} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: SPACING.sm, paddingBottom: SPACING['2xl'] }}
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
          <ActivityIndicator color={colors.primary} style={{ marginVertical: SPACING.lg }} />
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
        <SaleTotals subtotal={v.subtotal} discount={v.discount} total={v.total} />

        <Button
          label="Descargar boleta (PDF)"
          icon="download-outline"
          onPress={handleDownload}
          loading={downloading}
          disabled={busy}
          style={styles.actionTop}
        />

        {/* Only with a printer actually connected — an "Imprimir" that can't
            print is worse than no button. Connect it from Ventas. */}
        {printer.supported && printer.connected && (
          <Button
            label="Imprimir boleta"
            icon="print-outline"
            variant="secondary"
            onPress={handlePrint}
            loading={printing}
            disabled={busy}
            style={styles.actionNext}
          />
        )}

        <Button
          label="Anular venta"
          icon="trash-outline"
          variant="danger"
          onPress={confirmCancel}
          loading={cancelling}
          disabled={busy}
          style={styles.actionNext}
        />

        <Text style={styles.hint}>La boleta es el recibo interno (no es comprobante SUNAT).</Text>
      </ScrollView>
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    gap: SPACING.md,
  },
  sectionTitle: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: SPACING['2xl'], marginBottom: SPACING.md },
  itemsError: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
  itemsBox: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACING.sm,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  qtyBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: RADIUS.badge,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  qtyText: { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.bodySm },
  itemInfo: { flex: 1, gap: SPACING.hairline },
  itemName: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  itemMeta: { fontSize: FONT_SIZE.caption, color: colors.textSecondary },
  itemTotal: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  actionTop: { marginTop: SPACING['2xl'] },
  actionNext: { marginTop: SPACING.md },
  hint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 17 },
});
