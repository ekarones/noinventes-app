import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { linePrice, variationLabel } from '../utils/cart';
import { PAYMENT_METHODS } from '../utils/payment';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { createSale, type CreateSaleItem } from '../api/sales';
import { lookupByCode } from '../api/products';
import { ApiError, TIMEOUT_STATUS } from '../api/client';
import { hapticSuccess } from '../utils/haptics';
import DashedLine from '../components/DashedLine';
import type { CartItem, PaymentMethod } from '../types';
import type { CartStackParamList, RootTabNavigation } from '../navigation/types';

type Props = NativeStackScreenProps<CartStackParamList, 'Checkout'>;

type StockIssue = { key: string; name: string; requested: number; available: number };

function itemName(item: CartItem): string {
  return item.variation
    ? `${item.product.name} (${variationLabel(item.variation)})`
    : item.product.name;
}

// Optimistic pre-flight: re-checks each cart line's current branch stock so the
// seller can fix quantities before the backend rejects the sale. Lines are
// checked concurrently (independent lookups). Re-throws 401 so the caller can
// trigger re-login.
async function verifyStock(items: CartItem[]): Promise<StockIssue[]> {
  const results = await Promise.all(
    items.map(async (item): Promise<StockIssue | null> => {
      const code = item.variation?.code ?? item.product.code;
      try {
        const res = await lookupByCode(code);
        const available = res.variation?.stock ?? res.product.stock;
        if (item.quantity > available) {
          return { key: item.key, name: itemName(item), requested: item.quantity, available };
        }
        return null;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) throw e; // rejects Promise.all
        // No longer found / unavailable → treat as zero stock.
        return { key: item.key, name: itemName(item), requested: item.quantity, available: 0 };
      }
    })
  );
  return results.filter((r): r is StockIssue => r !== null);
}

export default function CheckoutScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<RootTabNavigation>();
  // Subtotal, discount and total all come from the cart now — the discount is set
  // there, beside the lines it applies to, and arrives here already clamped.
  const { items, totalPrice: subtotal, discount, total, clear, updateQuantity, removeItem, invalidateStock } =
    useCart();
  const { showToast } = useToast();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();

  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting || items.length === 0) return;

    const payloadItems: CreateSaleItem[] = items.map((i) => ({
      product_id: i.product.id,
      ...(i.variation ? { product_variation_id: i.variation.id } : {}),
      quantity: i.quantity,
    }));

    setSubmitting(true);
    try {
      // Optimistic stock check before charging.
      const issues = await verifyStock(items);
      if (issues.length > 0) {
        setSubmitting(false);
        promptStockIssues(issues);
        return;
      }

      const sale = await createSale({
        customer_name: customerName.trim() || 'Cliente final',
        payment_method: paymentMethod,
        discount: discount > 0 ? discount : undefined,
        notes: notes.trim() || undefined,
        items: payloadItems,
      });

      clear();
      // Stock just changed — let the catalogue re-fetch next time it's shown.
      invalidateStock();
      hapticSuccess();
      showToast(`Venta #${sale.id} registrada`, 'checkmark-circle');
      // Open the receipt in the History tab, keeping the History list beneath it
      // (initial: false) so Back and the tab button both return to the list.
      rootNav.navigate('OrdersTab', {
        screen: 'OrderDetail',
        params: { sale },
        initial: false,
      });
      navigation.popToTop();
    } catch (e) {
      handleError(e);
    } finally {
      setSubmitting(false);
    }
  }

  // Shows the stock differences and lets the seller snap quantities to what's
  // available (removing items that hit zero) — or cancel and review manually.
  function promptStockIssues(issues: StockIssue[]) {
    const lines = issues
      .map((i) => `• ${i.name}: disponible ${i.available}, en carrito ${i.requested}`)
      .join('\n');
    Alert.alert(
      'El stock cambió',
      `Algunos productos ya no tienen stock suficiente en tu sucursal:\n\n${lines}\n\n¿Ajustar las cantidades al stock disponible?`,
      [
        { text: 'Revisar carrito', style: 'cancel' },
        {
          text: 'Ajustar',
          onPress: () => {
            issues.forEach((i) =>
              i.available > 0 ? updateQuantity(i.key, i.available) : removeItem(i.key)
            );
            showToast('Carrito ajustado al stock disponible', 'checkmark-circle');
          },
        },
      ]
    );
  }

  function handleError(e: unknown) {
    if (e instanceof ApiError) {
      // 401 is handled globally (session cleared + return to login); just stop.
      if (e.status === 401) return;
      if (e.status === TIMEOUT_STATUS) {
        Alert.alert(
          'Estado desconocido',
          'No se recibió confirmación del servidor. Revisa la pestaña Ventas antes de volver a cobrar para no duplicar la venta.'
        );
        return;
      }
      // Stock errors come back as 422 with a descriptive message.
      const isStock = /stock/i.test(e.message);
      Alert.alert(
        isStock ? 'Stock insuficiente' : 'No se pudo registrar la venta',
        isStock
          ? `${e.message}\n\nRefresca el catálogo y ajusta las cantidades.`
          : e.message
      );
      return;
    }
    Alert.alert('Error', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
  }

  return (
    <View style={styles.container}>
      {/* Header (5a): amber panel with a decorative circle, a white-card back
          button and the "Cobrar" title. */}
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
          <Text style={styles.headerTitle}>Cobrar</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 64}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Items summary — a read-only ticket; quantities change back in the cart. */}
          <View style={styles.card}>
            <View style={styles.summaryHeader}>
              <View style={styles.dot} />
              <Text style={styles.summaryTitle}>Resumen ({items.length})</Text>
            </View>
            {items.map((i, idx) => (
              <View key={i.key}>
                {idx > 0 && <DashedLine style={styles.summaryDash} />}
                <View style={styles.summaryRow}>
                  <View style={styles.qtyChip}>
                    <Text style={styles.qtyChipText}>{i.quantity}×</Text>
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryName} numberOfLines={1}>
                      {i.product.name}
                    </Text>
                    <Text style={styles.summaryDetail} numberOfLines={1}>
                      {i.variation && (
                        <Text style={styles.summaryVariation}>{variationLabel(i.variation)} · </Text>
                      )}
                      {formatPrice(linePrice(i))} c/u
                    </Text>
                  </View>
                  <Text style={styles.summaryPrice}>{formatPrice(linePrice(i) * i.quantity)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Customer */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Cliente</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Cliente final"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              maxLength={255}
            />
            <Text style={styles.cardHint}>
              Si lo dejas vacío, la venta se registra como “Cliente final”.
            </Text>
          </View>

          {/* Payment method */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Método de pago</Text>
            <View style={styles.payWrap}>
              {PAYMENT_METHODS.map((m) => {
                const active = paymentMethod === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.payPill, active && styles.payPillActive]}
                    onPress={() => setPaymentMethod(m.value)}
                    activeOpacity={ROW_PRESS_OPACITY}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.payText, active && styles.payTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notas (opcional)</Text>
            <TextInput
              style={styles.textarea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej. Cliente recurrente, pagó con QR…"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>

          {/* Totals */}
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>{formatPrice(subtotal)}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.totalRow}>
                <View style={styles.discountLabelRow}>
                  <Text style={styles.discountLabel}>Descuento</Text>
                  <View style={styles.discountChip}>
                    <Text style={styles.discountChipText}>del carrito</Text>
                  </View>
                </View>
                <Text style={styles.discountValue}>− {formatPrice(discount)}</Text>
              </View>
            )}
            <DashedLine style={styles.totalDash} />
            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>TOTAL</Text>
              <Text style={styles.grandValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit — the tab bar stays visible on this screen, so no bottom inset. */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, submitting && styles.ctaBusy]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>
              {submitting ? 'Registrando venta…' : `Cobrar ${formatPrice(total)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },

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
    scroll: { padding: 18, gap: 12, paddingBottom: 24 },
    // A titled white panel (5a), one per section.
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
    cardLabel: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.5)',
      marginBottom: 10,
    },

    // ---- Summary ----
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 9 },
    dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.chromeFill },
    summaryTitle: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    summaryDash: { marginVertical: 0 },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11 },
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
    summaryInfo: { flex: 1, minWidth: 0 },
    summaryName: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, lineHeight: 18 },
    summaryDetail: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    summaryVariation: { color: colors.primary },
    summaryPrice: { fontSize: 14.5, fontFamily: FONT_FAMILY.black, color: colors.primary },

    // ---- Customer / notes inputs ----
    input: {
      height: 52,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 16,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
    cardHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.45)', marginTop: 8 },
    textarea: {
      minHeight: 76,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 14.5,
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
      lineHeight: 20,
    },

    // ---- Payment ----
    payWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    payPill: {
      height: 44,
      paddingHorizontal: 15,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: '#16213a',
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    payText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.62)' },
    payTextActive: { color: '#fff' },

    // ---- Totals ----
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    subtotalLabel: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.6)' },
    subtotalValue: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    discountLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    discountLabel: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.error },
    discountChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: colors.errorSoft },
    discountChipText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: colors.error },
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

    // ---- Footer ----
    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: '#E9EBF0',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
    },
    cta: {
      height: 60,
      borderRadius: 18,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FFC20E',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    ctaBusy: { backgroundColor: '#EFE0AE', shadowOpacity: 0, elevation: 0 },
    ctaText: { fontSize: 17.5, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
  });
