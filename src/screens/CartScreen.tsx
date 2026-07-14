import { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { lookupByCode } from '../api/products';
import { ApiError } from '../api/client';
import { linePrice, lineImageUrl, lineStock, variationLabel } from '../utils/cart';
import { hapticAdd } from '../utils/haptics';
import Button from '../components/Button';
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
          <Text style={styles.name} numberOfLines={1}>
            {item.product.name}
          </Text>
          {item.variation && (
            <Text style={styles.variation} numberOfLines={1}>
              {variationLabel(item.variation)}
            </Text>
          )}
          <Text style={styles.price}>{formatPrice(price)}</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, !canDecrease && styles.qtyBtnDisabled]}
              onPress={() => updateQuantity(item.key, item.quantity - 1)}
              disabled={!canDecrease}
              activeOpacity={ROW_PRESS_OPACITY}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Quitar una unidad"
            >
              <Ionicons name="remove" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <TextInput
              style={styles.qtyInput}
              value={String(item.quantity)}
              onChangeText={(t) => onQtyText(item.key, t)}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={4}
            />
            <TouchableOpacity
              style={[styles.qtyBtn, !canIncrease && styles.qtyBtnDisabled]}
              onPress={() => updateQuantity(item.key, item.quantity + 1)}
              disabled={!canIncrease}
              activeOpacity={ROW_PRESS_OPACITY}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Agregar una unidad"
            >
              <Ionicons name="add" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.right}>
          <TouchableOpacity
            onPress={() => removeItem(item.key)}
            activeOpacity={ROW_PRESS_OPACITY}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${item.product.name} del carrito`}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.lineTotal}>{formatPrice(price * item.quantity)}</Text>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>Ventas</Text>
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
      <View style={[styles.header, styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>Ventas</Text>
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

      <View style={[styles.footer, { paddingBottom: 16 }]}>
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
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
  },
  scanBtnText: { color: colors.primary, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearBtnText: { color: colors.textSecondary, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium },
  title: { fontSize: FONT_SIZE.screenTitle, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  subtitle: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, marginTop: 2 },
  list: { padding: 20, paddingTop: 4, gap: 14 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  image: { width: 76, height: 76, borderRadius: 12 },
  info: { flex: 1, justifyContent: 'space-between' },
  name: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  variation: { fontSize: FONT_SIZE.micro, color: colors.primary, fontWeight: FONT_WEIGHT.medium, marginTop: 1 },
  price: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyInput: {
    minWidth: 46,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  right: { justifyContent: 'space-between', alignItems: 'flex-end' },
  lineTotal: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: { fontSize: FONT_SIZE.subheading, color: colors.textSecondary },
  totalValue: { fontSize: FONT_SIZE.sectionValue, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
});
