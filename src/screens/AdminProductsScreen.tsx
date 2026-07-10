import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminProducts } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import type { PaginationMeta } from '../api/products';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
import ProductImage from '../components/ProductImage';
import type { AdminCategory, AdminProductRow, AdminProductStatus } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProducts'>;

const PER_PAGE = 30;

type StatusFilter = 'all' | AdminProductStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'public', label: 'Públicos' },
  { value: 'private', label: 'Privados' },
];

const STATUS_LABEL: Record<AdminProductStatus, string> = {
  published: 'Publicado',
  public: 'Público',
  private: 'Privado',
};

export default function AdminProductsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  const [status, setStatus] = useState<StatusFilter>('all');

  // Category scope: null = all. The server includes subcategories.
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  useEffect(() => {
    fetchAdminCategories()
      .then(setCategories)
      .catch(() => {
        /* non-fatal: the picker just stays empty */
      });
  }, []);

  const statusParam = useMemo(() => (status === 'all' ? undefined : status), [status]);
  const categoryName =
    categoryId == null ? 'Todas las categorías' : categories.find((c) => c.id === categoryId)?.name ?? '—';

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const { items, meta: m } = await fetchAdminProducts({
          search: query || undefined,
          status: statusParam,
          categoryId,
          page: 1,
          perPage: PER_PAGE,
        });
        setProducts(items);
        setMeta(m);
      } catch (e: any) {
        setError(e?.message ?? 'No se pudieron cargar los productos.');
        setProducts([]);
        setMeta(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query, statusParam, categoryId]
  );

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  async function loadMore() {
    if (!meta || loadingMore || meta.currentPage >= meta.lastPage) return;
    setLoadingMore(true);
    try {
      const { items, meta: m } = await fetchAdminProducts({
        search: query || undefined,
        status: statusParam,
        categoryId,
        page: meta.currentPage + 1,
        perPage: PER_PAGE,
      });
      setProducts((prev) => [...prev, ...items]);
      setMeta(m);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }

  function renderItem({ item }: { item: AdminProductRow }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AdminProductDetail', { product: item })}
      >
        <ProductImage uri={item.imageUrl} style={styles.thumb} iconSize={22} />
        <View style={styles.cardInfo}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.code}>{item.code}</Text>
          <View style={styles.badges}>
            <View style={[styles.statusBadge, statusStyle(item.status)]}>
              <Text style={[styles.statusText, statusTextStyle(item.status)]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            {item.type === 'variable' && (
              <View style={styles.varBadge}>
                <Ionicons name="git-branch-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.varText}>{item.variationsCount} var.</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.price}>
            {formatPrice(item.finalPrice)}
            {item.type === 'variable' ? '+' : ''}
          </Text>
          {item.stock != null && <Text style={styles.stock}>{item.stock} uds.</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleTexts}>
            <Text style={styles.title}>Productos</Text>
            {meta && <Text style={styles.subtitle}>{meta.total} en el catálogo</Text>}
          </View>
          <View style={styles.titleActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('AdminProductsTrash')}
              hitSlop={8}
              accessibilityLabel="Papelera"
            >
              <Ionicons name="trash-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AdminProductForm', {})}
              hitSlop={8}
              accessibilityLabel="Nuevo producto"
            >
              <Ionicons name="add" size={22} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o código..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.chip, status === s.value && styles.chipActive]}
              onPress={() => setStatus(s.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, status === s.value && styles.chipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category scope */}
        <TouchableOpacity
          style={[styles.categorySelect, categoryId != null && styles.categorySelectActive]}
          onPress={() => setCategoryPickerOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="folder-outline"
            size={16}
            color={categoryId != null ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.categoryText, categoryId != null && styles.categoryTextActive]}
            numberOfLines={1}
          >
            {categoryName}
          </Text>
          {categoryId != null ? (
            <TouchableOpacity onPress={() => setCategoryId(null)} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFirstPage()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFirstPage(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>Sin productos</Text>
              <Text style={styles.errorText}>Prueba con otra búsqueda o filtro.</Text>
            </View>
          }
        />
      )}

      {/* Category picker — indented to reflect the tree. */}
      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Categoría</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.pickerRow}
                activeOpacity={0.7}
                onPress={() => {
                  setCategoryId(null);
                  setCategoryPickerOpen(false);
                }}
              >
                <Text style={[styles.pickerLabel, categoryId == null && styles.pickerLabelActive]}>
                  Todas las categorías
                </Text>
                {categoryId == null && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerRow, { paddingLeft: 4 + c.depth * 18 }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCategoryId(c.id);
                    setCategoryPickerOpen(false);
                  }}
                >
                  <Text
                    style={[styles.pickerLabel, categoryId === c.id && styles.pickerLabelActive]}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                  {categoryId === c.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function statusStyle(status: AdminProductStatus) {
  if (status === 'published') return { backgroundColor: '#dcfce7' };
  if (status === 'public') return { backgroundColor: colors.primarySoft };
  return { backgroundColor: colors.border };
}

function statusTextStyle(status: AdminProductStatus) {
  if (status === 'published') return { color: colors.success };
  if (status === 'public') return { color: colors.primary };
  return { color: colors.textSecondary };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  titleTexts: { flex: 1 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary, height: '100%' },
  chips: { gap: 8, paddingVertical: 10, paddingRight: 8 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary },
  categorySelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  categorySelectActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  categoryText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  categoryTextActive: { color: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  pickerLabel: { flex: 1, fontSize: 16, color: colors.textPrimary },
  pickerLabelActive: { fontWeight: '700', color: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  errorText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  list: { padding: 20, paddingTop: 4, gap: 14, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  cardInfo: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  code: { fontSize: 12, color: colors.textSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  varBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  varText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  stock: { fontSize: 12, color: colors.textSecondary },
});
