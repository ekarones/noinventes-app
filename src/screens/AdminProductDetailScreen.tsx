import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  deleteProduct,
  deleteVariation,
  fetchAdminProductDetail,
  fetchAdminProductVariations,
} from '../api/admin/products';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { formatPrice } from '../utils/format';
import { stockColor } from '../utils/stock';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import IconLabel from '../components/IconLabel';
import type { AdminProductDetail, AdminVariation, StockByBranch } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductDetail'>;

const STATUS_LABEL: Record<string, string> = {
  published: 'Publicado',
  public: 'Público',
  private: 'Privado',
};

export default function AdminProductDetailScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const { product } = route.params;
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [variations, setVariations] = useState<AdminVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The attribute set a new variation must match. Empty = unknown, so the
  // variation form lets the admin choose it.
  const [attributeIds, setAttributeIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchAdminProductDetail(product.id);
      setDetail(d);
      if (d.type !== 'variable') {
        setVariations([]);
        setAttributeIds([]);
        return;
      }

      const vars = await fetchAdminProductVariations(product.id);
      setVariations(vars);

      // The `product_attribute` pivot is authoritative and comes back even when
      // the product has no variations yet. Fall back to deriving the set from an
      // existing variation only for legacy products with an empty pivot.
      setAttributeIds(
        d.attributes.length > 0
          ? d.attributes.map((a) => a.id)
          : vars[0]?.attributeValues.map((a) => a.attribute.id) ?? []
      );
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar el producto.');
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  // Reload on focus so returning from the stock editor reflects the new numbers.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const d = detail;
  const variationLabel = (v: AdminVariation) =>
    v.attributeValues.map((a) => a.value).join(' · ') || v.code;

  function confirmDeleteProduct() {
    if (!d) return;
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${d.name}"? Pasará a la papelera y podrás restaurarlo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDeleteProduct },
      ]
    );
  }

  async function doDeleteProduct() {
    try {
      await deleteProduct(product.id);
      showToast('Producto movido a la papelera', 'checkmark-circle');
      // Back to whichever list opened this — Catálogo or Inicio. Both re-fetch on
      // focus, so the deleted product is gone by the time it is on screen again.
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function confirmDeleteVariation(v: AdminVariation) {
    Alert.alert(
      'Eliminar variación',
      `¿Eliminar "${variationLabel(v)}"? Las ventas que la incluyan conservarán su detalle histórico. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDeleteVariation(v) },
      ]
    );
  }

  async function doDeleteVariation(v: AdminVariation) {
    try {
      await deleteVariation(v.id);
      showToast('Variación eliminada', 'checkmark-circle');
      load();
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={product.name}
        onBack={() => navigation.goBack()}
        // The detail is still loading (or failed): there's nothing to edit yet.
        action={
          d
            ? {
                icon: 'create-outline',
                label: 'Editar producto',
                onPress: () => navigation.navigate('AdminProductForm', { product: d }),
              }
            : undefined
        }
      />

      {loading ? (
        <LoadingState />
      ) : error || !d ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error ?? 'No se pudo cargar.'}
          action={{ label: 'Reintentar', onPress: load }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: SPACING.xl, paddingBottom: SPACING['2xl'] }}
          showsVerticalScrollIndicator={false}
        >
          {/* Images */}
          {d.images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
            >
              {d.images.map((img) => (
                <View key={img.id}>
                  <ProductImage uri={img.thumbUrl} style={styles.galleryImg} iconSize={28} />
                  {img.isFeatured && (
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={11} color={colors.textOnPrimary} />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ProductImage uri={null} style={styles.heroPlaceholder} iconSize={40} />
          )}

          <TouchableOpacity
            style={styles.manageImagesBtn}
            onPress={() =>
              navigation.navigate('AdminProductImages', { productId: d.id, productName: d.name })
            }
            activeOpacity={ROW_PRESS_OPACITY}
          >
            <Ionicons name="images-outline" size={16} color={colors.primary} />
            <Text style={styles.editText}>Gestionar imágenes ({d.images.length})</Text>
          </TouchableOpacity>

          {/* Identity */}
          <View style={styles.titleBlock}>
            <Text style={styles.name}>{d.name}</Text>
            <Text style={styles.code}>{d.code}</Text>
            <View style={styles.badges}>
              <View style={[styles.statusBadge, statusStyle(d.status)]}>
                <Text style={[styles.statusText, statusTextStyle(d.status)]}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{d.type === 'variable' ? 'Variable' : 'Simple'}</Text>
              </View>
              {d.category && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{d.category.name}</Text>
                </View>
              )}
            </View>
            <Text style={styles.price}>
              {formatPrice(d.finalPrice)}
              {d.type === 'variable' ? ' desde' : ''}
            </Text>
          </View>

          {/* Description */}
          {!!d.description && (
            <>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.description}>{d.description}</Text>
            </>
          )}

          {/* Tags */}
          {d.tags.length > 0 && (
            <View style={styles.tagRow}>
              {d.tags.map((t) => (
                <View key={t.id} style={styles.tag}>
                  <Text style={styles.tagText}>{t.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stock — simple product */}
          {d.type === 'simple' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Stock por sucursal</Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() =>
                    navigation.navigate('AdminStockEdit', {
                      kind: 'product',
                      id: d.id,
                      title: d.name,
                      stock: d.stockByBranch,
                    })
                  }
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={styles.editText}>Editar</Text>
                </TouchableOpacity>
              </View>
              <StockList stock={d.stockByBranch} />
            </>
          )}

          {/* Stock — variable product (per variation) */}
          {d.type === 'variable' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleInline}>Variaciones y stock</Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() =>
                    navigation.navigate('AdminVariationForm', {
                      productId: d.id,
                      productName: d.name,
                      productCode: d.code,
                      productUnitValue: d.unitValue,
                      productFinalPrice: d.finalPrice,
                      attributeIds,
                    })
                  }
                  activeOpacity={ROW_PRESS_OPACITY}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.editText}>Agregar</Text>
                </TouchableOpacity>
              </View>
              {variations.length === 0 ? (
                <Text style={styles.muted}>
                  Este producto no tiene variaciones. Agrega la primera para definir sus atributos.
                </Text>
              ) : (
                variations.map((v) => (
                  <View key={v.id} style={styles.varCard}>
                    <View style={styles.varHeader}>
                      <ProductImage uri={v.imageThumbUrl} style={styles.varThumb} iconSize={32} />
                      <View style={styles.varInfo}>
                        <View style={styles.varOverline}>
                          <IconLabel icon="barcode-outline" text={v.code} />
                        </View>
                        <Text style={styles.varName}>{variationLabel(v)}</Text>
                        <Text style={styles.varPrice}>{formatPrice(v.finalPrice)}</Text>
                      </View>
                      <View style={styles.varActions}>
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate('AdminVariationForm', {
                              productId: d.id,
                              productName: d.name,
                              productCode: d.code,
                              variation: v,
                            })
                          }
                          hitSlop={HIT_SLOP}
                          style={styles.varIconBtn}
                          activeOpacity={ROW_PRESS_OPACITY}
                          accessibilityRole="button"
                          accessibilityLabel={`Editar variación ${variationLabel(v)}`}
                        >
                          <Ionicons name="create-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => confirmDeleteVariation(v)}
                          hitSlop={HIT_SLOP}
                          style={styles.varIconBtn}
                          activeOpacity={ROW_PRESS_OPACITY}
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar variación ${variationLabel(v)}`}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <StockList stock={v.stockByBranch} compact />
                    <TouchableOpacity
                      style={styles.stockEditBtn}
                      onPress={() =>
                        navigation.navigate('AdminStockEdit', {
                          kind: 'variation',
                          id: v.id,
                          title: d.name,
                          subtitle: variationLabel(v),
                          stock: v.stockByBranch,
                        })
                      }
                      activeOpacity={ROW_PRESS_OPACITY}
                    >
                      <Ionicons name="cube-outline" size={16} color={colors.primary} />
                      <Text style={styles.editText}>Editar stock</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {/* Delete (soft) */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={confirmDeleteProduct}
            activeOpacity={ROW_PRESS_OPACITY}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={styles.deleteText}>Eliminar producto</Text>
          </TouchableOpacity>
          <Text style={styles.deleteHint}>Pasará a la papelera; podrás restaurarlo.</Text>
        </ScrollView>
      )}
    </View>
  );
}

function StockList({ stock, compact }: { stock: StockByBranch[]; compact?: boolean }) {
  if (stock.length === 0) {
    return <Text style={styles.muted}>Sin sucursales configuradas.</Text>;
  }
  return (
    <View style={[styles.stockBox, compact && styles.stockBoxCompact]}>
      {stock.map((s, idx) => (
        <View key={s.branchId} style={[styles.stockRow, idx > 0 && styles.stockBorder]}>
          <Ionicons name="storefront-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.stockBranch} numberOfLines={1}>
            {s.branchName}
          </Text>
          <View style={[styles.stockPill, { backgroundColor: stockColor(s.stock) + '22' }]}>
            <Text style={[styles.stockPillText, { color: stockColor(s.stock) }]}>
              {s.stock} uds.
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function statusStyle(status: string) {
  if (status === 'published') return { backgroundColor: '#dcfce7' };
  if (status === 'public') return { backgroundColor: colors.primarySoft };
  return { backgroundColor: colors.border };
}
function statusTextStyle(status: string) {
  if (status === 'published') return { color: colors.success };
  if (status === 'public') return { color: colors.primary };
  return { color: colors.textSecondary };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gallery: { gap: SPACING.md, paddingRight: SPACING.sm },
  galleryImg: { width: 150, height: 150, borderRadius: RADIUS.card, backgroundColor: colors.surfaceMuted },
  heroPlaceholder: { width: '100%', height: 200, borderRadius: RADIUS.card },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { marginTop: SPACING.xl, gap: SPACING.sm },
  name: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  code: { fontSize: FONT_SIZE.caption, color: colors.textSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  statusBadge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.badge },
  statusText: { fontSize: FONT_SIZE.micro, fontWeight: FONT_WEIGHT.bold },
  typeBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
  },
  typeText: { fontSize: FONT_SIZE.micro, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
  price: { fontSize: FONT_SIZE.sectionValue, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: SPACING['2xl'], marginBottom: SPACING.md },
  sectionTitleInline: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  description: { fontSize: FONT_SIZE.bodySm, color: colors.textPrimary, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.lg },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
  },
  tagText: { fontSize: FONT_SIZE.caption, color: colors.primary, fontWeight: FONT_WEIGHT.medium },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.md,
    height: 34,
    borderRadius: RADIUS.pill,
  },
  editText: { color: colors.primary, fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold },
  manageImagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 42,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    marginTop: SPACING.lg,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 54,
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    borderColor: colors.error,
    marginTop: SPACING['3xl'],
  },
  deleteText: { color: colors.error, fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold },
  deleteHint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.md },
  stockBox: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.lg,
  },
  stockBoxCompact: { marginTop: SPACING.md },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  stockBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  stockBranch: { flex: 1, fontSize: FONT_SIZE.bodySm, color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium },
  stockPill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.badge },
  stockPillText: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold },
  muted: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary },
  varCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  // The same anatomy as a catalogue product card: a big thumbnail, then a column
  // that reads top-down (code → which variation → price), and the actions aside.
  varHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  varThumb: { width: 88, height: 88, borderRadius: RADIUS.control },
  varInfo: { flex: 1 },
  varOverline: { marginBottom: SPACING.hairline },
  varName: { fontSize: FONT_SIZE.subheading, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  varPrice: {
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    marginTop: SPACING.xs,
  },
  varActions: { flexDirection: 'row', flexShrink: 0 },
  varIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stockEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 40,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    marginTop: SPACING.md,
  },
});
