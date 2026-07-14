import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchProduct, fetchVariations } from '../api/products';
import type { ProductImageItem, Variation } from '../types';
import type { CatalogStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import { stockColor } from '../utils/stock';
import { variationLabel } from '../utils/cart';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { hapticAdd } from '../utils/haptics';
import ProductImage from '../components/ProductImage';
import Button from '../components/Button';

type Props = NativeStackScreenProps<CatalogStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { product, variationId } = route.params;

  const isVariable = product.type === 'variable' || product.variationsCount > 0;

  const [variations, setVariations] = useState<Variation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(isVariable);
  const [variationsError, setVariationsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Variation | null>(null);
  const [quantity, setQuantity] = useState(1);

  // The row we got from the catalog has no gallery (the listing only sends the
  // featured image), so fetch the detail to get `images`. Non-fatal: on failure
  // we just keep showing the single featured image.
  const [gallery, setGallery] = useState<ProductImageItem[]>(product.images);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (product.images.length > 0) return;
    fetchProduct(product.id)
      .then((full) => setGallery(full.images))
      .catch(() => {});
  }, [product.id, product.images.length]);

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

  // Effective values: a chosen variation overrides the parent product.
  const price = selected?.finalPrice ?? product.finalPrice;
  const stock = isVariable ? selected?.stock ?? 0 : product.stock;
  // Once a variation is chosen, show ITS image as-is — if it has none, leave it
  // empty (placeholder) rather than falling back to the parent's image.
  const imageUrl = selected ? selected.imageUrl : product.imageUrl;

  // The carousel shows the product's own gallery; a chosen variation replaces it
  // with that variation's single photo.
  const showCarousel = !selected && gallery.length > 0;

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
      {/* Image — a swipeable carousel over the product gallery; a single frame
          once a variation is chosen (it shows that variation's own photo). */}
      <View>
        {showCarousel ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {gallery.map((img) => (
              // Full-width frame → use the original, not the thumb.
              <ProductImage
                key={img.id}
                uri={img.url}
                style={[styles.image, { width }]}
                iconSize={48}
              />
            ))}
          </ScrollView>
        ) : (
          <ProductImage uri={imageUrl} style={[styles.image, { width }]} iconSize={48} />
        )}

        {showCarousel && gallery.length > 1 && (
          <View style={styles.dots} pointerEvents="none">
            {gallery.map((img, i) => (
              <View key={img.id} style={[styles.dot, i === activeImage && styles.dotActive]} />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={ROW_PRESS_OPACITY}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Fixed product summary */}
      <View style={styles.summary}>
        <Text style={styles.category}>{product.category?.name ?? product.code}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {isVariable && !selected ? 'Desde ' : ''}
            {formatPrice(price)}
          </Text>
          <View style={styles.stockInfo}>
            <Ionicons
              name="cube-outline"
              size={15}
              color={needsVariation ? colors.textSecondary : stockColor(stock)}
            />
            <Text
              style={[
                styles.stockText,
                { color: needsVariation ? colors.textSecondary : stockColor(stock) },
              ]}
            >
              {needsVariation ? 'Elige variante' : `${Math.max(0, stock)} disp.`}
            </Text>
          </View>
        </View>
        <Text style={styles.code}>Código: {product.code}</Text>
      </View>

      {/* Variants — the ONLY scrollable region, so a long list never pushes the
          summary or the add-to-cart bar off screen. */}
      {isVariable ? (
        <View style={styles.variantsSection}>
          <Text style={styles.sectionTitle}>
            Variantes{variations.length > 0 ? ` (${variations.length})` : ''}
          </Text>
          {loadingVariations ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : variationsError ? (
            <Text style={styles.errorText}>{variationsError}</Text>
          ) : (
            <ScrollView
              style={styles.variantsScroll}
              contentContainerStyle={styles.variantsList}
              showsVerticalScrollIndicator={false}
            >
              {variations.map((v) => {
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
                      iconSize={16}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.variationLabel}>{variationLabel(v)}</Text>
                      <Text style={styles.variationMeta}>
                        {v.code} ·{' '}
                        <Text style={{ color: stockColor(v.stock), fontWeight: FONT_WEIGHT.medium }}>
                          {Math.max(0, v.stock)} disp.
                        </Text>
                      </Text>
                    </View>
                    <Text style={styles.variationPrice}>{formatPrice(v.finalPrice)}</Text>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Fixed footer: quantity + total + add. The bottom tab bar already
          reserves the safe-area inset, so we don't add insets.bottom here. */}
      <View style={[styles.footer, { paddingBottom: 16 }]}>
        {canAdd && (
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Cantidad</Text>
            <View style={styles.qtyStepper}>
              <TouchableOpacity
                style={[styles.qtyBtn, !canDecrease && styles.qtyBtnDisabled]}
                onPress={() => canDecrease && setQuantity((q) => q - 1)}
                disabled={!canDecrease}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
                accessibilityLabel="Quitar una unidad"
              >
                <Ionicons name="remove" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, !canIncrease && styles.qtyBtnDisabled]}
                onPress={() => canIncrease && setQuantity((q) => q + 1)}
                disabled={!canIncrease}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
                accessibilityLabel="Agregar una unidad"
              >
                <Ionicons name="add" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  image: { height: 220 },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  category: {
    fontSize: FONT_SIZE.micro,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: 4 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: { fontSize: FONT_SIZE.sectionValue, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  stockInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stockText: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.medium },
  code: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: 6 },
  variantsSection: { flex: 1 },
  sectionTitle: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  variantsScroll: { flex: 1 },
  variantsList: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  errorText: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, paddingHorizontal: 20 },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  variationRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  variationRowDisabled: { opacity: 0.5 },
  variationThumb: { width: 44, height: 44, borderRadius: 10 },
  variationLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  variationMeta: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: 2 },
  variationPrice: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qtyLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyValue: {
    fontSize: FONT_SIZE.titleSm,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
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
