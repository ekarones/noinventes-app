import { useState } from 'react';
import {
  ActivityIndicator,
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
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/format';
import { linePrice, variationLabel } from '../utils/cart';
import { PAYMENT_METHODS } from '../utils/payment';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { createSale, type CreateSaleItem } from '../api/sales';
import { lookupByCode } from '../api/products';
import { ApiError, TIMEOUT_STATUS } from '../api/client';
import { hapticSuccess } from '../utils/haptics';
import type { CartItem, PaymentMethod } from '../types';
import type { CartStackParamList } from '../navigation/types';

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
  const rootNav = useNavigation<any>();
  const { items, totalPrice, clear, updateQuantity, removeItem } = useCart();
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountText, setDiscountText] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subtotal = totalPrice;
  const discount = Math.max(0, parseFloat(discountText.replace(',', '.')) || 0);
  const discountInvalid = discount > subtotal;
  const total = Math.max(0, subtotal - discount);

  async function handleSubmit() {
    if (submitting || items.length === 0) return;
    if (discountInvalid) {
      Alert.alert('Descuento inválido', 'El descuento no puede ser mayor al subtotal.');
      return;
    }

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
          'No se recibió confirmación del servidor. Verifica en el historial antes de volver a cobrar para no duplicar la venta.'
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cobrar</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Items summary */}
          <Text style={styles.sectionTitle}>Resumen ({items.length})</Text>
          <View style={styles.card}>
            {items.map((i, idx) => (
              <View key={i.key} style={[styles.summaryRow, idx > 0 && styles.rowBorder]}>
                <Text style={styles.summaryQty}>{i.quantity}×</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryName} numberOfLines={1}>
                    {i.product.name}
                  </Text>
                  {i.variation && (
                    <Text style={styles.summaryVariation}>{variationLabel(i.variation)}</Text>
                  )}
                </View>
                <Text style={styles.summaryPrice}>{formatPrice(linePrice(i) * i.quantity)}</Text>
              </View>
            ))}
          </View>

          {/* Customer */}
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Cliente final"
              placeholderTextColor={colors.textSecondary}
              value={customerName}
              onChangeText={setCustomerName}
              maxLength={255}
            />
          </View>

          {/* Payment method */}
          <Text style={styles.sectionTitle}>Método de pago</Text>
          <View style={styles.payGrid}>
            {PAYMENT_METHODS.map((m) => {
              const active = paymentMethod === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.payPill, active && styles.payPillActive]}
                  onPress={() => setPaymentMethod(m.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={m.icon}
                    size={18}
                    color={active ? colors.textOnPrimary : colors.textSecondary}
                  />
                  <Text style={[styles.payText, active && styles.payTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Discount */}
          <Text style={styles.sectionTitle}>Descuento (opcional)</Text>
          <View style={[styles.inputWrapper, discountInvalid && styles.inputWrapperError]}>
            <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={discountText}
              onChangeText={setDiscountText}
            />
          </View>
          {discountInvalid && (
            <Text style={styles.errorHint}>El descuento no puede ser mayor al subtotal.</Text>
          )}

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notas (opcional)</Text>
          <View style={[styles.inputWrapper, styles.notesWrapper]}>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Ej. Cliente recurrente, pagó con QR…"
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={1000}
            />
          </View>

          {/* Totals */}
          <View style={styles.totalsBox}>
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            {discount > 0 && (
              <Row label="Descuento" value={`- ${formatPrice(discount)}`} highlight />
            )}
            <View style={styles.divider} />
            <Row label="Total" value={formatPrice(total)} big />
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={[styles.footer, { paddingBottom: 16 }]}>
          <TouchableOpacity
            style={[styles.payBtn, (submitting || discountInvalid) && styles.payBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || discountInvalid}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.payBtnText}>Cobrar {formatPrice(total)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Row({
  label,
  value,
  big,
  highlight,
}: {
  label: string;
  value: string;
  big?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.totalLine}>
      <Text style={[styles.totalLabel, big && styles.totalLabelBig]}>{label}</Text>
      <Text
        style={[
          styles.totalValue,
          big && styles.totalValueBig,
          highlight && { color: colors.success },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  summaryQty: { fontSize: 14, fontWeight: '700', color: colors.primary, minWidth: 28 },
  summaryName: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  summaryVariation: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 1 },
  summaryPrice: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: 12 },
  notesWrapper: { alignItems: 'flex-start' },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  errorHint: { color: colors.error, fontSize: 13, marginTop: 6 },
  payGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  payPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  payPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  payTextActive: { color: colors.textOnPrimary },
  totalsBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 24,
  },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalLabelBig: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  totalValueBig: { fontSize: 22, fontWeight: '700', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  payBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.7 },
  payBtnText: { color: colors.textOnPrimary, fontSize: 17, fontWeight: '700' },
});
