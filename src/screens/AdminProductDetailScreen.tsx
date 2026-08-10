import { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
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
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { SIZE, FONT_SIZE, FONT_FAMILY, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { formatPrice } from '../utils/format';
import { stockColor } from '../utils/stock';
import { variationLabel } from '../utils/cart';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import VariationFilter, { useVariationFilter } from '../components/VariationFilter';
import CopyableCode from '../components/CopyableCode';
import LabelPrintSheet from '../components/LabelPrintSheet';
import PrinterSheet from '../components/PrinterSheet';
import { PRODUCT_STATUS_LABEL, productStatusColor } from '../utils/productStatus';
import type { AdminProductDetail, AdminProductStatus, AdminVariation, StockByBranch } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductDetail'>;

export default function AdminProductDetailScreen({ route, navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const { product } = route.params;
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [variations, setVariations] = useState<AdminVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The attribute set a new variation must match. Empty = unknown, so the
  // variation form lets the admin choose it.
  const [attributeIds, setAttributeIds] = useState<number[]>([]);
  // Both label sheets live here, and only one is ever open: nesting the printer
  // picker inside the label sheet would be a modal inside a modal.
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [printerOpen, setPrinterOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
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
      setRefreshing(false);
    }
  }, [product.id]);

  // Reload on focus so returning from the stock editor reflects the new numbers.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const d = detail;
  // Same attribute filter the seller's product detail has, over the same shape.
  const filter = useVariationFilter(variations);

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
        // The signature 8b element: an amber "Editar" pill on the navy header —
        // the one primary action of the screen. Hidden until the detail loads
        // (there's nothing to edit yet).
        actions={
          d ? (
            <TouchableOpacity
              style={styles.editorBtn}
              onPress={() => navigation.navigate('AdminProductForm', { product: d })}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
              accessibilityLabel="Editar producto"
            >
              <Ionicons name="create-outline" size={17} color="#16213A" />
              <Text style={styles.editorBtnText}>Editar</Text>
            </TouchableOpacity>
          ) : undefined
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
          contentContainerStyle={{ padding: SPACING.sm, paddingBottom: SPACING['2xl'] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Gallery — a horizontal strip inside a vertical scroll needs an
              explicit height (flex:none + a min height), or it collapses. */}
          {d.images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryStrip}
              contentContainerStyle={styles.gallery}
            >
              {d.images.map((img) => (
                <View key={img.id}>
                  <ProductImage uri={img.thumbUrl} style={styles.galleryImg} iconSize={28} />
                  {img.isFeatured && (
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={11} color="#16213A" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ProductImage uri={null} style={styles.heroPlaceholder} iconSize={40} />
          )}

          {/* The two product-level actions, side by side and equal: neither is
              the primary thing to do on this screen. Bordered white cards. */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                navigation.navigate('AdminProductImages', { productId: d.id, productName: d.name })
              }
              activeOpacity={ROW_PRESS_OPACITY}
            >
              <Ionicons name="images-outline" size={17} color={colors.primary} />
              <Text style={styles.actionText}>Imágenes ({d.images.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setLabelsOpen(true)}
              activeOpacity={ROW_PRESS_OPACITY}
            >
              <Ionicons name="pricetag-outline" size={17} color={colors.primary} />
              <Text style={styles.actionText}>Etiquetas</Text>
            </TouchableOpacity>
          </View>

          {/* Identity — one white card: name, code, badges, price, and (when
              present) description and tags separated by hairlines. */}
          <View style={styles.card}>
            <Text style={styles.name}>{d.name}</Text>
            <View style={styles.codeRow}>
              <CopyableCode code={d.code} />
            </View>
            <View style={styles.badges}>
              <View style={[styles.statusBadge, statusStyle(d.status, colors)]}>
                <Text style={[styles.statusText, { color: productStatusColor(d.status) }]}>
                  {PRODUCT_STATUS_LABEL[d.status] ?? d.status}
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

            {!!d.description && (
              <View style={styles.cardBlock}>
                <Text style={styles.blockLabel}>Descripción</Text>
                <Text style={styles.description}>{d.description}</Text>
              </View>
            )}

            {d.tags.length > 0 && (
              <View style={styles.cardBlock}>
                <Text style={styles.blockLabel}>Etiquetas</Text>
                <View style={styles.tagRow}>
                  {d.tags.map((t) => (
                    <View key={t.id} style={styles.tag}>
                      <Text style={styles.tagText}>{t.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Stock — simple product */}
          {d.type === 'simple' && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Stock por sucursal</Text>
                </View>
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
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    Variaciones y stock
                    {variations.length > 0 ? ` (${filter.shown.length})` : ''}
                  </Text>
                </View>
                <View style={styles.sectionActions}>
                  {filter.attributes.length > 0 && <VariationFilter state={filter} />}
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() =>
                      navigation.navigate('AdminVariationForm', {
                        productId: d.id,
                        productName: d.name,
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
              </View>
              {variations.length === 0 ? (
                <Text style={styles.muted}>
                  Este producto no tiene variaciones. Agrega la primera para definir sus atributos.
                </Text>
              ) : filter.shown.length === 0 ? (
                <Text style={styles.muted}>Ninguna variación coincide con el filtro.</Text>
              ) : (
                filter.shown.map((v) => (
                  <View key={v.id} style={styles.varCard}>
                    <View style={styles.varHeader}>
                      <ProductImage uri={v.imageThumbUrl} style={styles.varThumb} iconSize={32} />
                      <View style={styles.varInfo}>
                        <View style={styles.varOverline}>
                          <CopyableCode code={v.code} label="Código de variación" />
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

      {d && (
        <LabelPrintSheet
          visible={labelsOpen}
          onClose={() => setLabelsOpen(false)}
          product={d}
          variations={variations}
          variationLabel={variationLabel}
          // Swap one sheet for the other instead of stacking them.
          onConnectPrinter={() => {
            setLabelsOpen(false);
            setPrinterOpen(true);
          }}
        />
      )}
      <PrinterSheet visible={printerOpen} onClose={() => setPrinterOpen(false)} />
    </View>
  );
}

function StockList({ stock, compact }: { stock: StockByBranch[]; compact?: boolean }) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
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

// The badge answers one question — ¿lo ve el vendedor? `public` llega al
// catálogo (verde), `private` queda oculto (gris).
function statusStyle(status: AdminProductStatus, colors: Palette) {
  if (status === 'private') return { backgroundColor: colors.border };
  return { backgroundColor: colors.successSoft };
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // The amber "Editar" pill on the navy header. A navy hairline + soft shadow so
  // it reads as a raised chip over the dark panel.
  editorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFC20E',
    borderWidth: 2,
    borderColor: '#16213A',
    shadowColor: '#0A0F1C',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  editorBtnText: { color: '#16213A', fontFamily: FONT_FAMILY.black, fontSize: 14, letterSpacing: -0.2 },
  // A horizontal strip inside the vertical scroll: flexGrow 0 so it takes only its
  // content height instead of stretching.
  galleryStrip: { flexGrow: 0 },
  gallery: { gap: SPACING.sm, paddingRight: SPACING.md },
  galleryImg: { width: 132, height: 132, borderRadius: 18, backgroundColor: colors.surfaceMuted },
  heroPlaceholder: { width: '100%', height: 200, borderRadius: 20, backgroundColor: colors.surfaceMuted },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FFC20E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  // Bordered white cards — two equal secondary actions, neither primary.
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 48,
    borderRadius: RADIUS.card,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
  },
  actionText: { color: colors.primary, fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.bold },
  // Identity: one raised white card.
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    shadowColor: '#0A0F1C',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  name: { fontSize: FONT_SIZE.title, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.4 },
  codeRow: { flexDirection: 'row', marginTop: SPACING.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  statusBadge: { paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.badge },
  statusText: { fontSize: FONT_SIZE.micro, fontFamily: FONT_FAMILY.extrabold },
  typeBadge: {
    backgroundColor: colors.fill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.badge,
  },
  typeText: { fontSize: FONT_SIZE.micro, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary },
  price: { fontSize: FONT_SIZE.sectionValue, fontFamily: FONT_FAMILY.black, color: colors.primary, marginTop: SPACING.md, letterSpacing: -0.5 },
  // A sub-block inside the identity card (description, tags), split by a hairline.
  cardBlock: { marginTop: SPACING.lg, paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: colors.separator },
  blockLabel: {
    fontSize: FONT_SIZE.micro,
    fontFamily: FONT_FAMILY.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  description: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.primary, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
  },
  tagText: { fontSize: FONT_SIZE.caption, color: colors.primary, fontFamily: FONT_FAMILY.bold },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.md,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 1 },
  sectionDot: { width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: colors.chromeFill },
  sectionTitle: { fontSize: FONT_SIZE.subheading, fontFamily: FONT_FAMILY.black, color: colors.primary, flexShrink: 1 },
  // The filter and "Agregar" share the right side of the section header.
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // A small bordered-white control (Editar / Agregar / Editar stock).
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    paddingHorizontal: SPACING.md,
    height: 36,
    borderRadius: 11,
  },
  editText: { color: colors.primary, fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.bold },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 54,
    borderRadius: RADIUS.card,
    backgroundColor: colors.errorSoft,
    marginTop: SPACING['3xl'],
  },
  deleteText: { color: colors.error, fontSize: FONT_SIZE.subheading, fontFamily: FONT_FAMILY.extrabold },
  deleteHint: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.micro, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
  // Simple product: a bordered white card of branch rows.
  stockBox: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: colors.separator,
    paddingHorizontal: SPACING.md,
  },
  // Inside a variation card: a grey inset block instead of a bordered card.
  stockBoxCompact: {
    backgroundColor: colors.fill,
    borderWidth: 0,
    marginTop: SPACING.md,
  },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  stockBorder: { borderTopWidth: 1, borderTopColor: colors.controlBorder },
  stockBranch: { flex: 1, fontSize: FONT_SIZE.bodySm, color: colors.primary, fontFamily: FONT_FAMILY.bold },
  stockPill: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.badge },
  stockPillText: { fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.extrabold },
  muted: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, lineHeight: 20 },
  varCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.separator,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  // The same anatomy as a catalogue product card: a big thumbnail, then a column
  // that reads top-down (code → which variation → price), and the actions aside.
  varHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  varThumb: { width: SIZE.thumbLg, height: SIZE.thumbLg, borderRadius: RADIUS.card },
  varInfo: { flex: 1 },
  varOverline: { flexDirection: 'row', marginBottom: SPACING.hairline },
  varName: { fontSize: FONT_SIZE.subheading, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, marginTop: SPACING.xs },
  varPrice: {
    fontSize: FONT_SIZE.subheading,
    fontFamily: FONT_FAMILY.black,
    color: colors.primary,
    marginTop: SPACING.xs,
  },
  varActions: { flexDirection: 'row', flexShrink: 0, gap: SPACING.hairline },
  varIconBtn: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stockEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 44,
    borderRadius: RADIUS.control,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    marginTop: SPACING.md,
  },
});
