import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
import { fetchAdminProducts } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import type { PaginationMeta } from '../api/products';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY } from '../theme/tokens';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import EmptyState from '../components/EmptyState';
import { formatPrice } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
import { ADMIN_DEFAULT_SORT, PRODUCT_SORT_OPTIONS } from '../utils/productSort';
import { SortControl } from '../components/FilterControls';
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

  const [sortIndex, setSortIndex] = useState(ADMIN_DEFAULT_SORT);
  const sort = PRODUCT_SORT_OPTIONS[sortIndex];

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

  const hasFilters = searchText.length > 0 || status !== 'all' || categoryId != null;

  function clearFilters() {
    setSearchText('');
    setStatus('all');
    setCategoryId(null);
  }

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
          sortBy: sort.sortBy,
          sortDir: sort.sortDir,
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
    [query, statusParam, categoryId, sort]
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
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
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
        activeOpacity={ROW_PRESS_OPACITY}
        onPress={() => navigation.navigate('AdminProductDetail', { product: item })}
      >
        <ProductImage uri={item.imageThumbUrl} style={styles.thumb} iconSize={22} />
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
            {meta && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {meta.total} en el catálogo · {sort.label}
              </Text>
            )}
          </View>
          <View style={styles.titleActions}>
            <SortControl
              options={PRODUCT_SORT_OPTIONS}
              index={sortIndex}
              onChange={setSortIndex}
            />
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('AdminProductsTrash')}
              hitSlop={8}
              accessibilityLabel="Papelera"
              activeOpacity={ROW_PRESS_OPACITY}
            >
              <Ionicons name="trash-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AdminProductForm', {})}
              hitSlop={8}
              accessibilityLabel="Nuevo producto"
              activeOpacity={ROW_PRESS_OPACITY}
            >
              <Ionicons name="add" size={22} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre o código..."
        />

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.chip, status === s.value && styles.chipActive]}
              onPress={() => setStatus(s.value)}
              activeOpacity={ROW_PRESS_OPACITY}
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
          activeOpacity={ROW_PRESS_OPACITY}
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
            <TouchableOpacity onPress={() => setCategoryId(null)} hitSlop={10} activeOpacity={ROW_PRESS_OPACITY}>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadFirstPage() }}
        />
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
            <EmptyState
              icon="cube-outline"
              title={hasFilters ? 'Sin resultados' : 'Sin productos'}
              message={
                hasFilters
                  ? 'Prueba con otra búsqueda o filtro.'
                  : 'Crea tu primer producto para empezar.'
              }
              action={hasFilters ? { label: 'Limpiar filtros', onPress: clearFilters } : undefined}
            />
          }
        />
      )}


      {/* Category picker — indented to reflect the tree. */}
      <BottomSheet
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        title="Categoría"
        scrollable
      >
        <SheetOption
          label="Todas las categorías"
          active={categoryId == null}
          onPress={() => {
            setCategoryId(null);
            setCategoryPickerOpen(false);
          }}
        />
        {categories.map((c) => (
          <SheetOption
            key={c.id}
            label={c.name}
            depth={c.depth}
            active={categoryId === c.id}
            onPress={() => {
              setCategoryId(c.id);
              setCategoryPickerOpen(false);
            }}
          />
        ))}
      </BottomSheet>
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
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FONT_SIZE.screenTitle, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  subtitle: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, marginTop: 2 },
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
  chipText: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
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
  categoryText: { flex: 1, fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
  categoryTextActive: { color: colors.primary },
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
  name: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  code: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: FONT_SIZE.badge, fontWeight: FONT_WEIGHT.bold },
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
  varText: { fontSize: FONT_SIZE.badge, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  stock: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
});
