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
import { SIZE, FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { formatPrice, formatPriceRange } from '../utils/format';
import { variationLabel } from '../utils/cart';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { hapticAdd } from '../utils/haptics';
import ScreenHeader from '../components/ScreenHeader';
import ProductImage from '../components/ProductImage';
import StockBadge from '../components/StockBadge';
import CodeBadge from '../components/CodeBadge';
import IconLabel from '../components/IconLabel';
import VariationFilter, { useVariationFilter } from '../components/VariationFilter';
import Button from '../components/Button';
import QuantityStepper from '../components/QuantityStepper';

type Props = NativeStackScreenProps<CatalogStackParamList, 'ProductDetail'>;

// The header thumbnail's width; its height follows the catalogue card's 4:3 frame.
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
        // Preselect the scanned variation, even at 0 stock — otherwise nothing is
        // selected and its (disabled) row can't be tapped, so the summary shows
        // "Sin stock" for exactly the variation the code pointed at.
        if (variationId != null) {
          const match = vs.find((v) => v.id === variationId);
          if (match) setSelected(match);
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
          {/* The same badge pair the catalogue cards show — the neutral code (the
              chosen variation's once one is picked, else the parent's) beside the
              colour-coded stock, or the "pick a variation" hint in its place. */}
          <View style={styles.badgeRow}>
            <CodeBadge code={code} />
            {needsVariation ? (
              <IconLabel icon="cube-outline" text="Elige variante" />
            ) : (
              <StockBadge stock={stock} />
            )}
          </View>
          {/* No variation chosen → the product's full range ("S/ 39.90 – S/ 59.90"
              when the variations differ). Once one is picked, its exact price. */}
          <Text style={styles.price} numberOfLines={1}>
            {formatPriceRange(price, selected ? null : product.finalPriceMax)}
          </Text>
        </View>
      </View>

      {/* Variants — the ONLY scrollable region, so a long list never pushes the
          summary or the add-to-cart bar off screen. */}
      {isVariable ? (
        <View style={styles.variantsSection}>
          {/* The dashboard "best-sellers" look: one card holding the section title
              and the filter, then flat rows split by hairline dividers. */}
          <View style={styles.variantsCard}>
            <View style={styles.variantsHeader}>
              <View style={styles.variantsTitleRow}>
                <View style={styles.dot} />
                <Text style={styles.variantsTitle}>
                  Variantes{variations.length > 0 ? ` (${shownVariations.length})` : ''}
                </Text>
              </View>
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
                {shownVariations.map((v, index) => {
                  const active = selected?.id === v.id;
                  const vOut = v.stock <= 0;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.variationRow,
                        index > 0 && styles.variationDivided,
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
                      iconSize={18}
                    />
                    <View style={styles.variationInfo}>
                      <Text style={styles.variationLabel} numberOfLines={1}>
                        {variationLabel(v)}
                      </Text>
                      {/* Same code + stock badge pair as the catalogue card. */}
                      <View style={styles.variationMetaRow}>
                        <CodeBadge code={v.code} />
                        <StockBadge stock={v.stock} />
                      </View>
                    </View>
                    <View style={styles.variationRight}>
                      {/* Always rendered, so selecting a variation reveals the check
                          in place instead of shifting the price as it appears. It
                          sits left of the price, keeping the price flush right and
                          on the card's vertical centre. */}
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                        style={!active && styles.checkHidden}
                      />
                      <Text style={styles.variationPrice}>{formatPrice(v.finalPrice)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              </ScrollView>
            )}
          </View>
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
            size="md"
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
    gap: SPACING.sm,
    marginHorizontal: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
  },
  imageBox: {
    width: IMG_SIZE,
    borderRadius: RADIUS.control,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  // The catalogue card's frame exactly: full-width of the box, landscape 4:3.
  image: { width: '100%', aspectRatio: 4 / 3 },
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
  // The same reading order, type and rhythm as a catalogue card's body: a grey
  // uppercase category overline, the name, the code + stock chips, then the price.
  // `hairline` gap so the lines hug the way they do on the card; centred beside
  // the image since the compact block is shorter than the thumbnail.
  summary: { flex: 1, justifyContent: 'center', gap: SPACING.hairline },
  overline: {
    fontSize: FONT_SIZE.nano,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  price: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  // The code + stock chips on one line, sized to their content. A fixed height so
  // the block doesn't re-centre when the stock badge swaps with the (shorter)
  // "Elige variante" hint — otherwise picking a variation nudges the summary up or
  // down. 24 is the badges' own height.
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    minHeight: 24,
    marginTop: SPACING.hairline,
  },
  variantsSection: { flex: 1 },
  // The section title + filter, inside the card like a dashboard SectionHeader:
  // side padding to match the rows, a top gap from the card edge and a small gap
  // to the first row (which pays its own top padding).
  variantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  variantsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 1 },
  // The same primary bullet the dashboard section titles carry.
  dot: { width: 10, height: 10, borderRadius: RADIUS.pill, backgroundColor: colors.primary },
  variantsTitle: { fontSize: FONT_SIZE.heading, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  variantsScroll: { flex: 1 },
  // One card holds the title, filter and rows — the dashboard best-sellers panel:
  // white surface, rounded, the screen margin on the sides, clipping to it.
  variantsCard: {
    flex: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.sm,
    // The 10 side padding lives on the card (as in the dashboard panels), so the
    // rows and the dividers between them sit inset from the card edges.
    paddingHorizontal: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
  variantsList: { paddingBottom: SPACING.sm },
  errorText: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, paddingVertical: SPACING.sm },
  // A flat best-seller-style row: a small thumbnail, the variation with its code +
  // stock chips, the price and selection check aside. Side padding comes from the
  // card, so the rows and their top dividers sit inset from the card edges.
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  variationDivided: { borderTopWidth: 1, borderTopColor: colors.border },
  variationRowDisabled: { opacity: 0.5 },
  variationThumb: { width: SIZE.iconBox, height: SIZE.iconBox, borderRadius: RADIUS.control },
  variationInfo: { flex: 1, gap: SPACING.xs },
  variationLabel: { fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  variationMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap' },
  // Price and its selection check on one line, vertically centred — so the price
  // lands on the row's vertical centre instead of riding above a check below it.
  variationRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexShrink: 0 },
  variationPrice: { fontSize: FONT_SIZE.subheading, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
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
  qtyLabel: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.medium, color: colors.textPrimary },
  footerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    // The button takes the free space, so it needs a gap or it butts right up
    // against the total.
    gap: SPACING.lg,
  },
  // Never let the total be squeezed or wrapped by the growing button.
  footerTotalBlock: { flexShrink: 0 },
  footerLabel: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  footerTotal: {
    fontSize: FONT_SIZE.title,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
  },
  // Sits next to the total in the footer, so let it take the free space.
  addToCart: { flex: 1 },
});
