import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { linePrice, variationLabel } from '../utils/cart';
import { PAYMENT_METHODS } from '../utils/payment';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { createSale, type CreateSaleItem } from '../api/sales';
import { lookupByCode } from '../api/products';
import { ApiError, TIMEOUT_STATUS } from '../api/client';
import { hapticSuccess } from '../utils/haptics';
import Field from '../components/Field';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
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
      <ScreenHeader title="Cobrar" onBack={() => navigation.goBack()} />

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
          <Field
            icon="person-outline"
            placeholder="Cliente final"
            value={customerName}
            onChangeText={setCustomerName}
            maxLength={255}
          />

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
                  activeOpacity={ROW_PRESS_OPACITY}
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
          <Field
            icon="pricetag-outline"
            placeholder="0"
            keyboardType="decimal-pad"
            value={discountText}
            onChangeText={setDiscountText}
            error={discountInvalid ? 'El descuento no puede ser mayor al subtotal.' : undefined}
          />

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notas (opcional)</Text>
          <Field
            placeholder="Ej. Cliente recurrente, pagó con QR…"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
          />

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
          <Button
            label={`Cobrar ${formatPrice(total)}`}
            onPress={handleSubmit}
            loading={submitting}
            disabled={discountInvalid}
          />
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
  sectionTitle: {
    fontSize: FONT_SIZE.bodySm,
    fontWeight: FONT_WEIGHT.bold,
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
  summaryQty: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold, color: colors.primary, minWidth: 28 },
  summaryName: { fontSize: FONT_SIZE.body, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
  summaryVariation: { fontSize: FONT_SIZE.micro, color: colors.primary, fontWeight: FONT_WEIGHT.medium, marginTop: 1 },
  summaryPrice: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
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
  payText: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
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
  totalLabel: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
  totalLabelBig: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  totalValue: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  totalValueBig: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
