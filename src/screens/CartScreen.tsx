import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SIZE, FONT_SIZE, FONT_FAMILY, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { formatPrice, roundMoney, toCents } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { lookupByCode } from '../api/products';
import { ApiError } from '../api/client';
import { linePrice, lineImageUrl, lineStock, variationLabel } from '../utils/cart';
import { hapticAdd } from '../utils/haptics';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import Field from '../components/Field';
import IconButton from '../components/IconButton';
import ScreenTitle from '../components/ScreenTitle';
import QuantityStepper from '../components/QuantityStepper';
import DashedLine from '../components/DashedLine';
import ReceiptEdge from '../components/ReceiptEdge';
import EmptyState from '../components/EmptyState';
import ProductImage from '../components/ProductImage';
import QRScannerModal from '../components/QRScannerModal';
import type { CartItem } from '../types';

export default function CartScreen() {
  const {
    items,
    totalItems,
    totalPrice,
    discount,
    total,
    addItem,
    updateQuantity,
    removeItem,
    setDiscount,
    clear,
  } = useCart();
  const { showToast } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<CartStackParamList>>();
  const [scannerVisible, setScannerVisible] = useState(false);

  // The discount sheet edits a draft: the cart only takes it on "Aplicar", so
  // half-typed numbers never move the total behind the sheet.
  const [discountSheetOpen, setDiscountSheetOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState('');

  const draftValue = roundMoney(Math.max(0, parseFloat(discountDraft.replace(',', '.')) || 0));
  // Compared in cents: a 100% discount typed as the exact subtotal would fail a
  // plain `>` on floats (119.7 > 119.69999999999999).
  const draftTooBig = toCents(draftValue) > toCents(totalPrice);

  function openDiscountSheet() {
    setDiscountDraft(discount > 0 ? String(discount) : '');
    setDiscountSheetOpen(true);
  }

  function applyDiscount() {
    if (draftTooBig) return;
    setDiscount(draftValue);
    setDiscountSheetOpen(false);
  }

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
      <View style={styles.row}>
        <ProductImage uri={lineImageUrl(item)} style={styles.image} iconSize={22} />

        {/* Name, unit price and the line's own action stack up on the left. */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.product.name}
          </Text>

          <Text style={styles.meta} numberOfLines={1}>
            {item.variation && (
              <Text style={styles.variation}>{variationLabel(item.variation)} · </Text>
            )}
            {formatPrice(price)} c/u
          </Text>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeItem(item.key)}
            activeOpacity={ROW_PRESS_OPACITY}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${item.product.name} del carrito`}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stepper over the line total, so the sum reads itself: 3 × S/ 50 = S/ 150. */}
        <View style={styles.qtyCol}>
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
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenTitle title="Carrito" />
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
      <ScreenTitle
        title="Carrito"
        subtitle={`${totalItems} artículos`}
        actions={
          <>
            <IconButton
              icon="trash-outline"
              label="Vaciar"
              muted
              onPress={confirmClear}
              accessibilityLabel="Vaciar carrito"
            />
            <IconButton
              icon="qr-code-outline"
              label="QR"
              onPress={() => setScannerVisible(true)}
              accessibilityLabel="Escanear código QR"
            />
          </>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <DashedLine style={styles.separator} />}
        style={styles.listPanel}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* The totals read as the torn-off stub of a ticket: notched edge, dashed
          rules, the grand total under the line. */}
      <View style={styles.footer}>
        <ReceiptEdge />

        <View style={[styles.footerBody, { paddingBottom: SPACING.lg }]}>
          <View style={styles.totals}>
            {/* Only worth a line once there's something to subtract from — with no
                discount the subtotal is the total, and printing it twice is noise. */}
            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalCount}>{formatPrice(totalPrice)}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.totalRow, styles.discountRow]}
              onPress={openDiscountSheet}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
              accessibilityLabel={
                discount > 0 ? `Descuento ${formatPrice(discount)}, editar` : 'Agregar descuento'
              }
            >
              <View style={styles.discountLabel}>
                <Ionicons
                  name={discount > 0 ? 'pricetag' : 'add-circle-outline'}
                  size={16}
                  color={discount > 0 ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.totalLabel, discount > 0 && styles.discountOn]}>
                  {discount > 0 ? 'Descuento' : 'Agregar descuento'}
                </Text>
              </View>
              {discount > 0 && (
                <Text style={[styles.totalCount, styles.discountOn]}>
                  - {formatPrice(discount)}
                </Text>
              )}
            </TouchableOpacity>

            <DashedLine />

            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>

          <Button label="Continuar al cobro" size="lg" onPress={goToCheckout} />
        </View>
      </View>

      <BottomSheet
        visible={discountSheetOpen}
        onClose={() => setDiscountSheetOpen(false)}
        title="Descuento"
        keyboardAware
        footer={
          <View style={styles.sheetActions}>
            {discount > 0 && (
              <Button
                label="Quitar"
                variant="outline"
                style={styles.sheetAction}
                onPress={() => {
                  setDiscount(0);
                  setDiscountSheetOpen(false);
                }}
              />
            )}
            <Button
              label="Aplicar"
              style={styles.sheetAction}
              onPress={applyDiscount}
              disabled={draftTooBig}
            />
          </View>
        }
      >
        <Field
          icon="pricetag-outline"
          placeholder="0"
          keyboardType="decimal-pad"
          value={discountDraft}
          onChangeText={setDiscountDraft}
          autoFocus
          hint={`Subtotal ${formatPrice(totalPrice)}`}
          error={draftTooBig ? 'El descuento no puede ser mayor al subtotal.' : undefined}
        />
      </BottomSheet>

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
  // The lines and the totals are one continuous white ticket, inset from the screen
  // edge by the usual `sm` margin: the rows sit flat on it, told apart by a dashed
  // rule instead of each being its own floating card. The panel is rounded at the
  // top only — the footer below closes the same sheet of paper with the bottom two.
  // overflow:hidden so the scrolling rows are clipped by those corners.
  listPanel: {
    flex: 1,
    backgroundColor: colors.surface,
    marginHorizontal: SPACING.sm,
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
    overflow: 'hidden',
  },
  list: { paddingVertical: SPACING.xs, flexGrow: 1 },
  separator: { marginHorizontal: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  image: { width: 64, height: 64, borderRadius: RADIUS.control },
  info: { flex: 1, gap: SPACING.hairline },
  name: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.medium, color: colors.textPrimary },
  meta: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  variation: { color: colors.primary, fontFamily: FONT_FAMILY.medium },
  // A round icon button under the price. Below TOUCH_MIN on purpose — it can't
  // grow without pushing the row taller than its own thumbnail, so it keeps a slop.
  removeBtn: {
    width: SIZE.disc,
    height: SIZE.disc,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  qtyCol: { alignItems: 'flex-end', gap: SPACING.xs },
  lineTotal: {
    fontSize: FONT_SIZE.subheading,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
  },
  // No top border: the notched edge is the seam between the lines and the stub.
  // Same inset as the panel above, closing the ticket with the bottom corners.
  footer: {
    backgroundColor: colors.surface,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomLeftRadius: RADIUS.card,
    borderBottomRightRadius: RADIUS.card,
  },
  footerBody: { paddingHorizontal: SPACING.sm, paddingTop: SPACING.lg },
  totals: { gap: SPACING.sm, marginBottom: SPACING.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // The one interactive line of the block, so it carries the full touch target —
  // which also makes it read as tappable next to the static rows.
  discountRow: { minHeight: TOUCH_MIN },
  discountLabel: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  discountOn: { color: colors.success, fontFamily: FONT_FAMILY.medium },
  sheetActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  sheetAction: { flex: 1 },
  totalLabel: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
  totalCount: {
    fontSize: FONT_SIZE.bodySm,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textPrimary,
  },
  grandLabel: { fontSize: FONT_SIZE.heading, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  totalValue: { fontSize: FONT_SIZE.sectionValue, fontFamily: FONT_FAMILY.bold, color: colors.primary },
});
