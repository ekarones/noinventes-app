import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { formatPrice } from '../utils/format';
import { stockColor } from '../utils/stock';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import type { AdminProductDetail, AdminVariation, StockByBranch } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductDetail'>;

const STATUS_LABEL: Record<string, string> = {
  published: 'Publicado',
  public: 'Público',
  private: 'Privado',
};

export default function AdminProductDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
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
      navigation.navigate('AdminProducts');
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity
          onPress={() => d && navigation.navigate('AdminProductForm', { product: d })}
          hitSlop={8}
          style={styles.backBtn}
          disabled={!d}
        >
          <Ionicons name="create-outline" size={22} color={d ? colors.primary : colors.border} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !d ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.errorText}>{error ?? 'No se pudo cargar.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
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
                  <ProductImage uri={img.url} style={styles.galleryImg} iconSize={28} />
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
            activeOpacity={0.85}
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
                      attributeIds,
                    })
                  }
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
                      <View style={{ flex: 1 }}>
                        <Text style={styles.varName}>{variationLabel(v)}</Text>
                        <Text style={styles.varMeta}>
                          {v.code} · {formatPrice(v.finalPrice)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('AdminVariationForm', {
                            productId: d.id,
                            productName: d.name,
                            variation: v,
                          })
                        }
                        hitSlop={8}
                        style={styles.varIconBtn}
                      >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDeleteVariation(v)}
                        hitSlop={8}
                        style={styles.varIconBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
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
            activeOpacity={0.9}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  errorText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  gallery: { gap: 12, paddingRight: 8 },
  galleryImg: { width: 150, height: 150, borderRadius: 16, backgroundColor: colors.primarySoft },
  heroPlaceholder: { width: '100%', height: 200, borderRadius: 16 },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { marginTop: 18, gap: 6 },
  name: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  code: { fontSize: 13, color: colors.textSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  typeBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  price: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 6 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 24, marginBottom: 10 },
  sectionTitleInline: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  description: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tagText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },
  editText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  manageImagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    marginTop: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.error,
    marginTop: 32,
  },
  deleteText: { color: colors.error, fontSize: 16, fontWeight: '700' },
  deleteHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 10 },
  stockBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  stockBoxCompact: { marginTop: 10 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  stockBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  stockBranch: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  stockPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stockPillText: { fontSize: 13, fontWeight: '700' },
  muted: { fontSize: 14, color: colors.textSecondary },
  varCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  varHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  varName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  varMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  varIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stockEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    marginTop: 10,
  },
});
