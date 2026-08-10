import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatDate, formatPrice } from '../utils/format';
import { paymentMethodLabel } from '../utils/payment';
import { cancelSale, fetchSaleDetail } from '../api/sales';
import { downloadAndShareBoleta, fetchReceiptPayload } from '../api/boleta';
import { usePrinter } from '../context/PrinterContext';
import DashedLine from '../components/DashedLine';
import type { SaleDetail } from '../types';
import type { OrdersStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { sale } = route.params;
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
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
      {/* Header (5a): amber panel + white-card back + "Venta #N". */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerCircle} pointerEvents="none" />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color={colors.onChrome} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Venta #{sale.id}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Sale data */}
        <View style={styles.card}>
          <View style={styles.dataRow}>
            <View style={styles.dataIcon}>
              <Ionicons name="person-outline" size={17} color="rgba(22, 33, 58, 0.55)" />
            </View>
            <View style={styles.dataText}>
              <Text style={styles.dataLabel}>Cliente</Text>
              <Text style={styles.dataValueLg}>{v.customerName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.dataCols}>
            <View style={styles.dataCol}>
              <Text style={styles.dataLabel}>Fecha y hora</Text>
              <Text style={styles.dataValue}>{formatDate(v.createdAt)}</Text>
            </View>
            <View>
              <Text style={styles.dataLabel}>Pago</Text>
              <View style={styles.payChip}>
                <Text style={styles.payChipText}>{paymentMethodLabel(v.paymentMethod)}</Text>
              </View>
            </View>
          </View>

          {!!v.notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.dataLabel}>Notas</Text>
              <Text style={styles.notesText}>{v.notes}</Text>
            </View>
          )}
        </View>

        {/* Products */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.dot} />
            <Text style={styles.sectionTitle}>
              Productos{items ? ` (${items.length})` : ''}
            </Text>
          </View>
          {loadingItems && !items ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : items && items.length > 0 ? (
            items.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <DashedLine style={styles.itemDash} />}
                <View style={styles.itemRow}>
                  <View style={styles.qtyChip}>
                    <Text style={styles.qtyChipText}>{item.quantity}×</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={styles.itemDetail} numberOfLines={1}>
                      {item.productCode} · {formatPrice(item.unitPrice)} c/u
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatPrice(item.subtotal)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>
              No se pudo cargar el detalle. Puedes descargar la boleta.
            </Text>
          )}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{formatPrice(v.subtotal)}</Text>
          </View>
          {v.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.discountLabel}>Descuento</Text>
              <Text style={styles.discountValue}>− {formatPrice(v.discount)}</Text>
            </View>
          )}
          <DashedLine style={styles.totalDash} />
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>TOTAL</Text>
            <Text style={styles.grandValue}>{formatPrice(v.total)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.pdfBtn, downloading && styles.pdfBtnBusy]}
            onPress={handleDownload}
            disabled={busy}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Ionicons name="download-outline" size={18} color={colors.onChrome} />
            <Text style={styles.pdfText}>
              {downloading ? 'Generando boleta…' : 'Descargar boleta (PDF)'}
            </Text>
          </TouchableOpacity>

          {/* Only with a printer actually connected — an "Imprimir" that can't
              print is worse than no button. Connect it from Ventas. */}
          {printer.supported && printer.connected && (
            <TouchableOpacity
              style={styles.printBtn}
              onPress={handlePrint}
              disabled={busy}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Ionicons name="print-outline" size={18} color={colors.primary} />
              <Text style={styles.printText}>{printing ? 'Imprimiendo…' : 'Imprimir boleta'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.voidBtn}
            onPress={confirmCancel}
            disabled={busy}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={styles.voidText}>{cancelling ? 'Anulando…' : 'Anular venta'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>La boleta es el recibo interno (no es comprobante SUNAT).</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ---- Header ----
    header: {
      paddingHorizontal: 18,
      paddingBottom: 16,
      backgroundColor: colors.chromeFill,
      overflow: 'hidden',
    },
    headerCircle: {
      position: 'absolute',
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.headerCircle,
      top: -150,
      right: -96,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.chromeButtonBg,
      borderWidth: 2,
      borderColor: colors.chromeButtonBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 26, letterSpacing: -0.8, fontFamily: FONT_FAMILY.black, color: colors.onChrome },

    // ---- Content ----
    scroll: { padding: 18, gap: 12, paddingBottom: 28 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },

    // ---- Sale data ----
    dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dataIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dataText: { flex: 1 },
    dataLabel: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
    },
    dataValueLg: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary, marginTop: 1 },
    dataValue: { fontSize: 14, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, marginTop: 2 },
    divider: { height: 1, backgroundColor: '#EEF0F4', marginVertical: 12 },
    dataCols: { flexDirection: 'row', gap: 12 },
    dataCol: { flex: 1 },
    payChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 9,
      backgroundColor: '#FFF3CF',
      marginTop: 2,
    },
    payChipText: { fontSize: 12, fontFamily: FONT_FAMILY.black, color: '#8A6400' },
    notesBlock: { backgroundColor: '#F7F8FA', borderRadius: 14, padding: 12, marginTop: 12 },
    notesText: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.7)', lineHeight: 19, marginTop: 3 },

    // ---- Products ----
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 3 },
    dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.chromeFill },
    sectionTitle: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    loader: { marginVertical: 16 },
    muted: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, marginTop: 8, lineHeight: 19 },
    itemDash: { marginVertical: 0 },
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11 },
    qtyChip: {
      minWidth: 34,
      height: 26,
      paddingHorizontal: 7,
      borderRadius: 9,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyChipText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    itemInfo: { flex: 1, minWidth: 0 },
    itemName: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, lineHeight: 18 },
    itemDetail: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    itemTotal: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },

    // ---- Totals ----
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    subtotalLabel: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.6)' },
    subtotalValue: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    discountLabel: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.error },
    discountValue: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.error },
    totalDash: { marginTop: 8, marginBottom: 10 },
    grandLabel: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.5)',
    },
    grandValue: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -1 },

    // ---- Actions ----
    actions: { gap: 10, marginTop: 4 },
    pdfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.chromeFill,
      shadowColor: '#FFC20E',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    pdfBtnBusy: { backgroundColor: '#EFE0AE', shadowOpacity: 0, elevation: 0 },
    pdfText: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    printBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
    },
    printText: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    voidBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.errorSoft,
      borderWidth: 1.5,
      borderColor: '#F3CFC6',
    },
    voidText: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.error },
    hint: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.bold,
      color: 'rgba(22, 33, 58, 0.45)',
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 8,
      paddingHorizontal: 10,
    },
  });
