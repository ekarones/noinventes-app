import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchVariations } from '../api/products';
import type { Variation } from '../types';
import type { CatalogStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/format';
import { stockColor } from '../utils/stock';
import { variationLabel } from '../utils/cart';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { hapticAdd } from '../utils/haptics';
import ProductImage from '../components/ProductImage';

type Props = NativeStackScreenProps<CatalogStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { product, variationId } = route.params;

  const isVariable = product.type === 'variable' || product.variationsCount > 0;

  const [variations, setVariations] = useState<Variation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(isVariable);
  const [variationsError, setVariationsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Variation | null>(null);
  const [quantity, setQuantity] = useState(1);

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
      {/* Fixed image */}
      <View>
        <ProductImage uri={imageUrl} style={styles.image} iconSize={48} />
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
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
                    activeOpacity={0.8}
                    disabled={vOut}
                    onPress={() => setSelected((cur) => (cur?.id === v.id ? null : v))}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.variationLabel}>{variationLabel(v)}</Text>
                      <Text style={styles.variationMeta}>
                        {v.code} ·{' '}
                        <Text style={{ color: stockColor(v.stock), fontWeight: '600' }}>
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
              >
                <Ionicons name="remove" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, !canIncrease && styles.qtyBtnDisabled]}
                onPress={() => canIncrease && setQuantity((q) => q + 1)}
                disabled={!canIncrease}
              >
                <Ionicons name="add" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.footerBottom}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerTotal}>{formatPrice(price * quantity)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addToCart, !canAdd && styles.addToCartDisabled]}
            activeOpacity={0.9}
            onPress={handleAdd}
            disabled={!canAdd}
          >
            <Ionicons name="cart-outline" size={20} color={colors.textOnPrimary} />
            <Text style={styles.addToCartText}>
              {needsVariation ? 'Elige variante' : stock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  image: { width: '100%', height: 220 },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: { fontSize: 24, fontWeight: '700', color: colors.primary },
  stockInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stockText: { fontSize: 14, fontWeight: '600' },
  code: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  variantsSection: { flex: 1 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  variantsScroll: { flex: 1 },
  variantsList: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  errorText: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 20 },
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
  variationLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  variationMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  variationPrice: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
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
  qtyLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  footerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: { fontSize: 12, color: colors.textSecondary },
  footerTotal: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  addToCart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 52,
    borderRadius: 14,
  },
  addToCartDisabled: { backgroundColor: colors.primaryLight, opacity: 0.7 },
  addToCartText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
