import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchProduct, fetchVariations } from '../api/products';
import type { Variation } from '../types';
import type { CatalogStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { formatPrice, formatPriceRange } from '../utils/format';
import { variationLabel } from '../utils/cart';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { hapticAdd } from '../utils/haptics';
import ScreenHeader from '../components/ScreenHeader';
import ProductImage from '../components/ProductImage';
import StockBadge from '../components/StockBadge';
import IconLabel from '../components/IconLabel';
import VariationFilter, { useVariationFilter } from '../components/VariationFilter';
import Button from '../components/Button';
import QuantityStepper from '../components/QuantityStepper';

type Props = NativeStackScreenProps<CatalogStackParamList, 'ProductDetail'>;

// The header thumbnail — a square, so the carousel pages by exactly its width.
const IMG_SIZE = 128;

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { variationId } = route.params;

  // Local copy so pull-to-refresh can replace it with fresh stock/price, without
  // waiting for the catalogue list to be re-fetched.
  const [product, setProduct] = useState(route.params.product);

  const isVariable = product.type === 'variable' || product.variationsCount > 0;

  const [variations, setVariations] = useState<Variation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(isVariable);
  const [variationsError, setVariationsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Variation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Tapping the header thumbnail opens the photo full-screen.
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!isVariable) return;
    fetchVariations(product.id)
      .then((vs) => {
        setVariations(vs);
        // Preselect the scanned variation (if any and it has stock).
        if (variationId != null) {
          const match = vs.find((v) => v.id === variationId);
          if (match && match.stock > 0) setSelected(match);
        }
      })
      .catch((e: any) => setVariationsError(e?.message ?? 'No se pudieron cargar las variantes.'))
      .finally(() => setLoadingVariations(false));
  }, [isVariable, product.id, variationId]);

  // Pull-to-refresh: re-fetch the product (stock/price/image) and, if variable, its
  // variations — re-syncing the selected one to its new stock.
  async function onRefresh() {
    setRefreshing(true);
    try {
      setProduct(await fetchProduct(product.id));
      if (isVariable) {
        const vs = await fetchVariations(product.id);
        setVariations(vs);
        setSelected((cur) => (cur ? vs.find((v) => v.id === cur.id) ?? null : null));
        setVariationsError(null);
      }
    } catch (e: any) {
      showToast(e?.message ?? 'No se pudo actualizar', 'alert-circle');
    } finally {
      setRefreshing(false);
    }
  }

  const filter = useVariationFilter(variations);
  const shownVariations = filter.shown;

  // Effective values: a chosen variation overrides the parent product, so the
  // summary at the top always reflects exactly what will go in the cart.
  const price = selected?.finalPrice ?? product.finalPrice;
  const stock = isVariable ? selected?.stock ?? 0 : product.stock;
  const code = selected?.code ?? product.code;
  // Once a variation is chosen, show ITS image as-is — if it has none, leave it
  // empty (placeholder) rather than falling back to the parent's image.
  const imageUrl = selected ? selected.imageUrl : product.imageUrl;

  // Clamp quantity to available stock whenever the selection changes.
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, stock)));
  }, [stock]);

  const needsVariation = isVariable && !selected;
  const canAdd = !needsVariation && stock > 0;
  const canDecrease = quantity > 1;
  const canIncrease = quantity < stock;

  function handleAdd() {
    if (!canAdd) return;
    addItem(product, selected, quantity);
    hapticAdd();
    const label = selected ? `${product.name} (${variationLabel(selected)})` : product.name;
    showToast(`${quantity} × ${label} agregado`, 'cart');
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      {/* Same header as the sale detail: back chevron, centred title. */}
      <ScreenHeader title="Detalle del producto" onBack={() => navigation.goBack()} />

      {/* Header: the image and the summary side by side, so the variants below get
          the room instead of being squeezed under a full-width image. The summary
          reflects the chosen variation once one is picked. */}
      <View style={styles.headerRow}>
        {/* Tap to see it full-screen — the thumbnail is too small to read detail
            on. Only tappable when there's actually a photo to expand. */}
        <TouchableOpacity
          style={styles.imageBox}
          activeOpacity={ROW_PRESS_OPACITY}
          onPress={() => imageUrl && setZoomed(true)}
          disabled={!imageUrl}
          accessibilityRole={imageUrl ? 'imagebutton' : undefined}
          accessibilityLabel={imageUrl ? 'Ampliar imagen' : undefined}
        >
          <ProductImage uri={imageUrl} style={styles.image} iconSize={32} />
          {/* A hint that the thumbnail expands — only when there's a photo to open. */}
          {!!imageUrl && (
            <View style={styles.expandHint} pointerEvents="none">
              <Ionicons name="expand" size={14} color={colors.textOnPrimary} />
            </View>
          )}
        </TouchableOpacity>

        {/* Same reading order and type as a catalogue card: the category over the
            name in bold near-black, the price under it — still black — and the
            stock as a badge. */}
        <View style={styles.summary}>
          <Text style={styles.overline} numberOfLines={1}>
            {product.category?.name ?? `#${code}`}
          </Text>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          {/* The chosen variation's code once one is picked, else the parent's.
              Wraps to two lines so a long variation code isn't cut off. */}
          <IconLabel icon="barcode-outline" text={code} numberOfLines={2} />
          {/* No variation chosen → the product's full range ("S/ 39.90 – S/ 59.90"
              when the variations differ). Once one is picked, its exact price. */}
          <Text style={styles.price} numberOfLines={1}>
            {formatPriceRange(price, selected ? null : product.finalPriceMax)}
          </Text>
          <View style={styles.stockRow}>
            {needsVariation ? (
              <IconLabel icon="cube-outline" text="Elige variante" />
            ) : (
              <StockBadge stock={stock} />
            )}
          </View>
        </View>
      </View>

      {/* Variants — the ONLY scrollable region, so a long list never pushes the
          summary or the add-to-cart bar off screen. */}
      {isVariable ? (
        <View style={styles.variantsSection}>
          <View style={styles.variantsHeader}>
            <Text style={styles.variantsTitle}>
              Variantes{variations.length > 0 ? ` (${shownVariations.length})` : ''}
            </Text>
            {filter.attributes.length > 0 && <VariationFilter state={filter} />}
          </View>
          {loadingVariations ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING['2xl'] }} />
          ) : variationsError ? (
            <Text style={styles.errorText}>{variationsError}</Text>
          ) : (
            <ScrollView
              style={styles.variantsScroll}
              contentContainerStyle={styles.variantsList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            >
              {shownVariations.length === 0 && (
                <Text style={styles.errorText}>Ninguna variante coincide con el filtro.</Text>
              )}
              {shownVariations.map((v) => {
                const active = selected?.id === v.id;
                const vOut = v.stock <= 0;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.variationRow,
                      active && styles.variationRowActive,
                      vOut && styles.variationRowDisabled,
                    ]}
                    activeOpacity={ROW_PRESS_OPACITY}
                    disabled={vOut}
                    onPress={() => setSelected((cur) => (cur?.id === v.id ? null : v))}
                  >
                    {/* Variation thumb; falls back to the parent's so the row is
                        never a bare placeholder when only the product has a photo. */}
                    <ProductImage
                      uri={v.imageThumbUrl ?? product.imageThumbUrl}
                      style={styles.variationThumb}
                      iconSize={22}
                    />
                    <View style={styles.variationInfo}>
                      <Text style={styles.variationLabel} numberOfLines={1}>
                        {variationLabel(v)}
                      </Text>
                      <View style={styles.variationMetaRow}>
                        <StockBadge stock={v.stock} />
                      </View>
                    </View>
                    <View style={styles.variationRight}>
                      <Text style={styles.variationPrice}>{formatPrice(v.finalPrice)}</Text>
                      {/* Always rendered, so selecting a variation reveals the check
                          in place instead of pushing the price up as it appears. */}
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                        style={!active && styles.checkHidden}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : (
        // Simple product: no variants list, but keep a pull-to-refresh region.
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Fixed footer: quantity + total + add. The bottom tab bar already
          reserves the safe-area inset, so we don't add insets.bottom here. */}
      <View style={[styles.footer, { paddingBottom: SPACING.lg }]}>
        {canAdd && (
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Cantidad</Text>
            <QuantityStepper
              value={quantity}
              onDecrement={() => setQuantity((q) => q - 1)}
              onIncrement={() => setQuantity((q) => q + 1)}
              canDecrement={canDecrease}
              canIncrement={canIncrease}
            />
          </View>
        )}
        <View style={styles.footerBottom}>
          <View style={styles.footerTotalBlock}>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerTotal}>{formatPrice(price * quantity)}</Text>
          </View>
          <Button
            label={
              needsVariation ? 'Elige variante' : stock <= 0 ? 'Sin stock' : 'Agregar al carrito'
            }
            icon="cart-outline"
            onPress={handleAdd}
            disabled={!canAdd}
            style={styles.addToCart}
          />
        </View>
      </View>

      {/* Full-screen photo. Tap anywhere (or the ✕) to dismiss. */}
      <Modal
        visible={zoomed}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setZoomed(false)}
      >
        <TouchableOpacity
          style={styles.zoomBackdrop}
          activeOpacity={1}
          onPress={() => setZoomed(false)}
        >
          <Image source={imageUrl} style={styles.zoomImage} contentFit="contain" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomClose, { top: insets.top + SPACING.sm }]}
          onPress={() => setZoomed(false)}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // The image + summary sit inside a bordered card, same chrome as a catalogue
  // card: white surface, rounded, padded, the picture rounded inside it.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
  },
  imageBox: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: RADIUS.control,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: { width: IMG_SIZE, height: IMG_SIZE },
  // A small dark chip in the corner of the thumbnail, so the tap-to-zoom is
  // discoverable without a caption.
  expandHint: {
    position: 'absolute',
    right: SPACING.xs,
    bottom: SPACING.xs,
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImage: { width: '100%', height: '100%' },
  zoomClose: {
    position: 'absolute',
    right: SPACING.sm,
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No blanket gap: the category hugs the name (as on a catalogue card), and the
  // lines below carry their own spacing.
  summary: { flex: 1, justifyContent: 'center' },
  // Matches the catalogue card exactly: a bold near-black code overline, the name
  // under it, and the price as the biggest thing — all black, no accent colour.
  overline: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  name: { fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  price: { fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: SPACING.xs },
  // A row so the badge sizes to its content instead of stretching the column.
  // Fixed height so the block doesn't re-centre when the badge (tall) swaps with
  // the "Elige variante" hint (short) — otherwise picking a variation nudges the
  // whole summary up or down. 24 is the stock badge's own height.
  stockRow: { flexDirection: 'row', alignItems: 'center', minHeight: 24, marginTop: SPACING.sm },
  variantsSection: { flex: 1 },
  // Title + filter button on one line; the list below carries its own inset.
  variantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  variantsTitle: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  // The flat pill shared by the search/sort/category controls.
  variantsScroll: { flex: 1 },
  variantsList: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.lg, gap: SPACING.sm },
  errorText: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, paddingHorizontal: SPACING.sm },
  // A compact picker card: a small thumbnail, the variation and its code+stock in
  // one column, the price and the selected check aside. Smaller than a catalogue
  // card because the list is a chooser you scroll, not a shelf you browse.
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  variationRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  variationRowDisabled: { opacity: 0.5 },
  variationThumb: { width: 56, height: 56, borderRadius: RADIUS.control },
  variationInfo: { flex: 1, gap: SPACING.xs },
  variationLabel: { fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  variationMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  variationRight: { alignItems: 'flex-end', gap: SPACING.sm, flexShrink: 0 },
  variationPrice: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  // Keeps the check's slot so the price never jumps; invisible until selected.
  checkHidden: { opacity: 0 },
  footer: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  qtyLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  footerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    // The button takes the free space, so it needs a gap or it butts right up
    // against the total.
    gap: SPACING.lg,
  },
  // Never let the total be squeezed or wrapped by the growing button.
  footerTotalBlock: { flexShrink: 0 },
  footerLabel: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  footerTotal: {
    fontSize: FONT_SIZE.title,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  // Sits next to the total in the footer, so let it take the free space.
  addToCart: { flex: 1 },
});
