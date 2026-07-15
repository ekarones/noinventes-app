import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { lookupByCode } from '../api/products';
import { ApiError } from '../api/client';
import { linePrice, lineImageUrl, lineStock, variationLabel } from '../utils/cart';
import { hapticAdd } from '../utils/haptics';
import Button from '../components/Button';
import QuantityStepper from '../components/QuantityStepper';
import EmptyState from '../components/EmptyState';
import ProductImage from '../components/ProductImage';
import QRScannerModal from '../components/QRScannerModal';
import type { CartItem } from '../types';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, totalItems, totalPrice, addItem, updateQuantity, removeItem, clear } = useCart();
  const { showToast } = useToast();
  const navigation = useNavigation<any>();
  const [scannerVisible, setScannerVisible] = useState(false);

  // Resolves a scanned QR code via GET /lookup and adds the result to the cart.
  async function handleScanned(code: string) {
    setScannerVisible(false);
    try {
      const result = await lookupByCode(code);

      // Effective stock at the seller's branch (variation overrides product).
      const stock = result.variation?.stock ?? result.product.stock;
      if (stock <= 0) {
        Alert.alert('Sin stock', `${result.product.name} no tiene stock en esta sucursal.`);
        return;
      }

      addItem(result.product, result.variation, 1);
      hapticAdd();
      const label = result.variation
        ? `${result.product.name} (${variationLabel(result.variation)})`
        : result.product.name;
      showToast(`${label} agregado`, 'cart');
    } catch (e) {
      if (e instanceof ApiError) {
        // 401 is handled globally (session cleared + return to login); just stop.
        if (e.status === 401) return;
        if (e.status === 422) {
          // Code belongs to a variable parent — needs a specific variation QR.
          Alert.alert('Producto con variaciones', e.message);
          return;
        }
        // 404 not found, 403, etc. → show the server message.
        Alert.alert('Código no válido', e.message);
        return;
      }
      Alert.alert('Error', 'No se pudo buscar el producto.');
    }
  }

  function goToCheckout() {
    navigation.navigate('Checkout');
  }

  function confirmClear() {
    Alert.alert('Vaciar carrito', '¿Quitar todos los productos del carrito?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clear },
    ]);
  }

  // Sets the typed quantity (clamped to stock by the cart). Ignores empty/NaN
  // so the field can be cleared while typing without removing the item.
  function onQtyText(key: string, text: string) {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!Number.isNaN(n) && n > 0) updateQuantity(key, n);
  }

  function renderItem({ item }: { item: CartItem }) {
    const price = linePrice(item);
    // The stepper only steps. Removing a line goes through the trash button, so a
    // stray "−" tap can't silently drop it; "+" stops at the stock we can actually sell.
    const canDecrease = item.quantity > 1;
    const canIncrease = item.quantity < lineStock(item);
    return (
      <View style={styles.card}>
        <ProductImage uri={lineImageUrl(item)} style={styles.image} iconSize={22} />

        <View style={styles.info}>
          {/* The bin sits next to the name, so it's obvious which line it drops. */}
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.product.name}
            </Text>
            <TouchableOpacity
              onPress={() => removeItem(item.key)}
              activeOpacity={ROW_PRESS_OPACITY}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${item.product.name} del carrito`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {item.variation && (
              <Text style={styles.variation}>{variationLabel(item.variation)} · </Text>
            )}
            {formatPrice(price)} c/u
          </Text>

          {/* Stepper and line total on one line, so the sum reads itself:
              3 × S/ 50 = S/ 150. */}
          <View style={styles.bottomRow}>
            <QuantityStepper
              value={item.quantity}
              onDecrement={() => updateQuantity(item.key, item.quantity - 1)}
              onIncrement={() => updateQuantity(item.key, item.quantity + 1)}
              canDecrement={canDecrease}
              canIncrement={canIncrease}
              onChangeText={(t) => onQtyText(item.key, t)}
            />

            <Text style={styles.lineTotal} numberOfLines={1}>
              {formatPrice(price * item.quantity)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
          <Text style={styles.title}>Carrito</Text>
        </View>
        <EmptyState
          icon="cart-outline"
          title="Tu carrito está vacío"
          message="Agrega productos desde el catálogo o escanea un código QR."
          action={{
            label: 'Escanear código QR',
            icon: 'qr-code-outline',
            onPress: () => setScannerVisible(true),
          }}
        />
        <QRScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={handleScanned}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, styles.headerRow, { paddingTop: insets.top + SPACING.md }]}>
        <View>
          <Text style={styles.title}>Carrito</Text>
          <Text style={styles.subtitle}>{totalItems} artículos</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.clearBtn} activeOpacity={ROW_PRESS_OPACITY} onPress={confirmClear}>
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.clearBtnText}>Vaciar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scanBtn}
            activeOpacity={ROW_PRESS_OPACITY}
            onPress={() => setScannerVisible(true)}
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            <Text style={styles.scanBtnText}>QR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.footer, { paddingBottom: SPACING.lg }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(totalPrice)}</Text>
        </View>
        <Button label="Continuar al cobro" size="lg" onPress={goToCheckout} />
      </View>

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.lg,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.control,
  },
  scanBtnText: { color: colors.primary, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.pill,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearBtnText: { color: colors.textSecondary, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium },
  title: { fontSize: FONT_SIZE.screenTitle, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  subtitle: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, marginTop: SPACING.hairline },
  list: { padding: SPACING.xl, paddingTop: SPACING.xs, gap: SPACING.lg, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: RADIUS.card, padding: SPACING.md, gap: SPACING.md, borderWidth: 1, borderColor: colors.border },
  image: { width: 64, height: 64, borderRadius: RADIUS.control },
  info: { flex: 1, gap: SPACING.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.textPrimary,
  },
  meta: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  variation: { color: colors.primary, fontWeight: FONT_WEIGHT.medium },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  lineTotal: {
    flexShrink: 1,
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  totalLabel: { fontSize: FONT_SIZE.subheading, color: colors.textSecondary },
  totalValue: { fontSize: FONT_SIZE.sectionValue, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
});
