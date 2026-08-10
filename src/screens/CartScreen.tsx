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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CartStackParamList, TabParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, HIT_SLOP, ROW_PRESS_OPACITY } from '../theme/tokens';
import { formatPrice, roundMoney, toCents } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { lookupByCode } from '../api/products';
import { ApiError } from '../api/client';
import { linePrice, lineImageUrl, lineStock, variationLabel } from '../utils/cart';
import { hapticAdd } from '../utils/haptics';
import BottomSheet from '../components/BottomSheet';
import ScreenTitle from '../components/ScreenTitle';
import QuantityStepper from '../components/QuantityStepper';
import DashedLine from '../components/DashedLine';
import ReceiptEdge from '../components/ReceiptEdge';
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
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  const [scannerVisible, setScannerVisible] = useState(false);

  // The discount sheet edits a draft: the cart only takes it on "Aplicar", so
  // half-typed numbers never move the total behind the sheet.
  const [discountSheetOpen, setDiscountSheetOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState('');

  const draftValue = roundMoney(Math.max(0, parseFloat(discountDraft.replace(',', '.')) || 0));
  // Compared in cents: a 100% discount typed as the exact subtotal would fail a
  // plain `>` on floats (119.7 > 119.69999999999999).
  const draftTooBig = toCents(draftValue) > toCents(totalPrice);
  const applyDisabled = draftTooBig || !discountDraft;

  function openDiscountSheet() {
    setDiscountDraft(discount > 0 ? String(discount) : '');
    setDiscountSheetOpen(true);
  }

  function applyDiscount() {
    if (applyDisabled) return;
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

  // Jump to the sibling Catálogo tab (the empty state's secondary action).
  function goToCatalog() {
    navigation.getParent<BottomTabNavigationProp<TabParamList>>()?.navigate('CatalogTab');
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

  const countLabel = `${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}`;

  // The two header actions: a white-card "Vaciar" and a navy-filled "QR" (navy,
  // not amber — an amber button would vanish on the amber header).
  const headerActions = (
    <>
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={confirmClear}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Vaciar carrito"
      >
        <Ionicons name="trash-outline" size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.qrBtn}
        onPress={() => setScannerVisible(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Escanear código QR"
      >
        <Ionicons name="qr-code-outline" size={16} color={colors.chromeFill} />
        <Text style={styles.qrText}>QR</Text>
      </TouchableOpacity>
    </>
  );

  function renderItem({ item }: { item: CartItem }) {
    const price = linePrice(item);
    const stock = lineStock(item);
    const atMax = item.quantity >= stock;
    // The stepper only steps. Removing a line goes through the "×", so a stray
    // "−" tap can't silently drop it; "+" stops at the stock we can actually sell.
    return (
      <View style={styles.line}>
        <View style={styles.lineTop}>
          <ProductImage uri={lineImageUrl(item)} style={styles.lineImg} iconSize={18} />

          <View style={styles.lineInfo}>
            <Text style={styles.lineName} numberOfLines={2}>
              {item.product.name}
            </Text>
            <Text style={styles.lineDetail} numberOfLines={1}>
              {item.variation && (
                <Text style={styles.lineVariation}>{variationLabel(item.variation)} · </Text>
              )}
              {formatPrice(price)} c/u
            </Text>
            {/* Tells the seller how much room is left before the "+" locks. */}
            <Text
              style={[styles.stockNote, atMax && styles.stockNoteMax]}
              numberOfLines={1}
            >
              {atMax ? 'Máximo disponible en tu sucursal' : `${stock} uds. en tu sucursal`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeItem(item.key)}
            activeOpacity={ROW_PRESS_OPACITY}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${item.product.name} del carrito`}
          >
            <Ionicons name="close" size={15} color="rgba(22, 33, 58, 0.6)" />
          </TouchableOpacity>
        </View>

        {/* The stepper reads with the line total: 3 × S/ 50 = S/ 150. */}
        <View style={styles.lineBottom}>
          <QuantityStepper
            value={item.quantity}
            onDecrement={() => updateQuantity(item.key, item.quantity - 1)}
            onIncrement={() => updateQuantity(item.key, item.quantity + 1)}
            canDecrement={item.quantity > 1}
            canIncrement={item.quantity < stock}
            onChangeText={(t) => onQtyText(item.key, t)}
            compact
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
        <ScreenTitle title="Carrito" subtitle="0 artículos" />

        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={42} color="rgba(22, 33, 58, 0.3)" />
          </View>
          <View style={styles.emptyTexts}>
            <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
            <Text style={styles.emptyMsg}>
              Agrega productos desde el catálogo o escanea un código QR.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setScannerVisible(true)}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Escanear código QR"
          >
            <Ionicons name="qr-code-outline" size={17} color={colors.chromeFill} />
            <Text style={styles.emptyBtnText}>Escanear código QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptyLink}
            onPress={goToCatalog}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Text style={styles.emptyLinkText}>Ir al catálogo</Text>
          </TouchableOpacity>
        </View>

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
      <ScreenTitle title="Carrito" subtitle={countLabel} actions={headerActions} />

      {/* The lines live in one white "ticket": a rounded sheet with the rows told
          apart by a dashed rule instead of each being its own card. */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <DashedLine style={styles.lineSep} />}
        style={styles.scroll}
        contentContainerStyle={styles.sheet}
        showsVerticalScrollIndicator={false}
      />

      {/* The totals read as the torn-off stub of the ticket: a notched edge, dashed
          rules, the grand total under the line. Fixed, so it never scrolls away. */}
      <View style={styles.footer}>
        <ReceiptEdge />
        <View style={styles.footerBody}>
          {/* Only worth a line once there's something to subtract from. */}
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>{formatPrice(totalPrice)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.discountRow}
            onPress={openDiscountSheet}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={
              discount > 0 ? `Descuento ${formatPrice(discount)}, editar` : 'Agregar descuento'
            }
          >
            <View style={styles.discountLabel}>
              <Ionicons
                name="pricetag-outline"
                size={16}
                color={discount > 0 ? colors.error : colors.primary}
              />
              <Text
                style={[styles.discountText, { color: discount > 0 ? colors.error : colors.primary }]}
              >
                {discount > 0 ? 'Descuento' : 'Agregar descuento'}
              </Text>
            </View>
            <View style={styles.discountRight}>
              {discount > 0 && (
                <Text style={[styles.discountValue, { color: colors.error }]}>
                  − {formatPrice(discount)}
                </Text>
              )}
              <Ionicons name="chevron-forward" size={14} color="rgba(22, 33, 58, 0.3)" />
            </View>
          </TouchableOpacity>

          <DashedLine style={styles.totalDash} />

          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>TOTAL</Text>
            <Text style={styles.grandValue}>{formatPrice(total)}</Text>
          </View>

          <TouchableOpacity
            style={styles.cta}
            onPress={goToCheckout}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Continuar al cobro</Text>
          </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.removeDiscountBtn}
                onPress={() => {
                  setDiscount(0);
                  setDiscountSheetOpen(false);
                }}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
              >
                <Text style={styles.removeDiscountText}>Quitar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.applyBtn, applyDisabled && styles.applyBtnOff]}
              onPress={applyDiscount}
              disabled={applyDisabled}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Text style={[styles.applyText, applyDisabled && styles.applyTextOff]}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <Text style={styles.sheetHint}>Subtotal {formatPrice(totalPrice)}</Text>
        <View style={[styles.amountField, draftTooBig && styles.amountFieldErr]}>
          <Text style={styles.amountPrefix}>S/</Text>
          <TextInput
            style={styles.amountInput}
            value={discountDraft}
            onChangeText={setDiscountDraft}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="rgba(22, 33, 58, 0.3)"
            autoFocus
          />
        </View>
        {draftTooBig && (
          <View style={styles.errorBand}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>El descuento no puede superar el subtotal.</Text>
          </View>
        )}
      </BottomSheet>

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ---- Header actions ----
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colors.chromeButtonBg,
      borderWidth: 2,
      borderColor: colors.chromeButtonBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      height: 44,
      paddingHorizontal: 14,
      borderRadius: 15,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: '#0A0F1C',
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    qrText: { color: '#fff', fontFamily: FONT_FAMILY.black, fontSize: 14 },

    // ---- Ticket ----
    scroll: { flex: 1 },
    // One white sheet holds every line; the rows sit flat on it, told apart by a
    // dashed rule. It hugs its content (no flexGrow) so a short cart isn't a tall
    // blank card.
    sheet: {
      backgroundColor: colors.surface,
      marginHorizontal: 18,
      marginTop: 14,
      marginBottom: 14,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 2,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    lineSep: { marginVertical: 0 },
    line: { paddingVertical: 14, gap: 10 },
    lineTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    lineImg: { width: 52, height: 52, borderRadius: 15 },
    lineInfo: { flex: 1, minWidth: 0 },
    lineName: { fontSize: 15, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, lineHeight: 19 },
    lineDetail: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 3 },
    lineVariation: { color: colors.primary },
    stockNote: { fontSize: 11.5, fontFamily: FONT_FAMILY.extrabold, color: 'rgba(22, 33, 58, 0.42)', marginTop: 3 },
    stockNoteMax: { color: '#8A6400' },
    // A grey "×" chip in the row's top-right corner.
    removeBtn: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lineBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    lineTotal: { flex: 1, textAlign: 'right', fontSize: 17, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.4 },

    // ---- Receipt footer ----
    footer: { backgroundColor: colors.surface },
    footerBody: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    subtotalLabel: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.6)', paddingVertical: 7 },
    subtotalValue: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    // The one interactive line of the block, so it carries a full touch target.
    discountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    discountLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    discountText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black },
    discountRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    discountValue: { fontSize: 14.5, fontFamily: FONT_FAMILY.black },
    totalDash: { marginTop: 6, marginBottom: 10 },
    grandLabel: {
      fontSize: 12.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.5)',
    },
    grandValue: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -1 },
    cta: {
      height: 58,
      borderRadius: 18,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
      marginBottom: 12,
      shadowColor: '#FFC20E',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    ctaText: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: colors.onChrome },

    // ---- Empty state ----
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 16 },
    emptyIcon: {
      width: 96,
      height: 96,
      borderRadius: 32,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    emptyTexts: { alignItems: 'center' },
    emptyTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.4 },
    emptyMsg: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
      color: 'rgba(22, 33, 58, 0.5)',
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 7,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 54,
      paddingHorizontal: 22,
      borderRadius: 17,
      backgroundColor: colors.primary,
      marginTop: 4,
      shadowColor: '#16213a',
      shadowOpacity: 0.28,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    emptyBtnText: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: '#fff' },
    emptyLink: { borderBottomWidth: 2, borderBottomColor: colors.chromeFill, paddingBottom: 2 },
    emptyLinkText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.primary },

    // ---- Discount sheet ----
    sheetHint: { fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 4 },
    amountField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 58,
      paddingHorizontal: 16,
      marginTop: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 16,
    },
    amountFieldErr: { borderColor: '#E8836B' },
    amountPrefix: { fontSize: 19, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.45)' },
    amountInput: { flex: 1, minWidth: 0, fontSize: 22, fontFamily: FONT_FAMILY.black, color: colors.primary, padding: 0 },
    errorBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingVertical: 11,
      paddingHorizontal: 13,
      borderRadius: 14,
      backgroundColor: colors.errorSoft,
    },
    errorText: { flex: 1, fontSize: 12.5, fontFamily: FONT_FAMILY.extrabold, color: colors.error },
    sheetActions: { flexDirection: 'row', gap: 10 },
    removeDiscountBtn: {
      height: 54,
      paddingHorizontal: 20,
      borderRadius: 17,
      borderWidth: 1.5,
      borderColor: '#F3CFC6',
      backgroundColor: colors.errorSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeDiscountText: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.error },
    applyBtn: {
      flex: 1,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyBtnOff: { backgroundColor: '#EDEFF3' },
    applyText: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    applyTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
