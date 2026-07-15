import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminProducts } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import type { PaginationMeta } from '../api/products';
import { colors } from '../theme/colors';
import { SPACING } from '../theme/tokens';
import ProductRow from '../components/ProductRow';
import StockBadge from '../components/StockBadge';
import IconLabel, { IconLabelRow } from '../components/IconLabel';
import IconButton from '../components/IconButton';
import Chip, { ChipRow } from '../components/Chip';
import Select from '../components/Select';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { formatPriceRange } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
import { ADMIN_DEFAULT_SORT, PRODUCT_SORT_OPTIONS } from '../utils/sortOptions';
import { SortControl } from '../components/FilterControls';
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

const STATUS_ICON: Record<AdminProductStatus, keyof typeof Ionicons.glyphMap> = {
  published: 'checkmark-circle-outline',
  public: 'eye-outline',
  private: 'lock-closed-outline',
};

function statusColor(status: AdminProductStatus) {
  if (status === 'published') return colors.success;
  if (status === 'public') return colors.primary;
  return colors.textSecondary;
}

export default function AdminProductsScreen({ navigation }: Props) {
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
      <ProductRow
        imageUri={item.imageThumbUrl}
        name={item.name}
        // The full range when the variations differ; a single price otherwise. If
        // the API build doesn't send the max yet, it reads as one price.
        price={formatPriceRange(item.finalPrice, item.finalPriceMax)}
        onPress={() => navigation.navigate('AdminProductDetail', { product: item })}
        overline={item.category?.name ?? `#${item.code}`}
        meta={
          <>
            <IconLabelRow>
              <IconLabel
                icon={STATUS_ICON[item.status]}
                text={STATUS_LABEL[item.status]}
                tint={statusColor(item.status)}
              />
            </IconLabelRow>
            {item.type === 'variable' && (
              <IconLabelRow>
                <IconLabel icon="git-branch-outline" text={`${item.variationsCount} var.`} />
              </IconLabelRow>
            )}
          </>
        }
        // Null for a variable product: its stock lives on the variations.
        stat={item.stock != null ? <StockBadge stock={item.stock} /> : undefined}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScreenTitle
        title="Catálogo"
        subtitle={
          meta
            ? `${meta.total} ${hasFilters ? 'coinciden' : 'productos'} · ${sort.label}`
            : undefined
        }
        actions={
          <>
            <SortControl
              options={PRODUCT_SORT_OPTIONS}
              index={sortIndex}
              onChange={setSortIndex}
            />
            <IconButton
              icon="trash-outline"
              onPress={() => navigation.navigate('AdminProductsTrash')}
              accessibilityLabel="Papelera"
            />
            <IconButton
              icon="add"
              primary
              onPress={() => navigation.navigate('AdminProductForm', {})}
              accessibilityLabel="Nuevo producto"
            />
          </>
        }
      >
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre o código..."
        />

        {/* Status filter */}
        <ChipRow>
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              active={status === s.value}
              onPress={() => setStatus(s.value)}
            />
          ))}
        </ChipRow>

        {/* Category scope */}
        <Select
          icon="folder-outline"
          placeholder="Todas las categorías"
          value={categoryId}
          options={categories.map((c) => ({ id: c.id, label: c.name, depth: c.depth }))}
          onChange={setCategoryId}
        />
      </ScreenTitle>

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
          contentContainerStyle={products.length ? styles.list : styles.listEmpty}
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
              <ActivityIndicator style={{ marginVertical: SPACING.lg }} color={colors.primary} />
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


    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Each product is its own card; the list just spaces them and pays the screen
  // margins. flexGrow lets a short list still fill the page.
  list: { padding: SPACING.xl, paddingTop: SPACING.xs, gap: SPACING.lg, flexGrow: 1 },
  listEmpty: { flexGrow: 1 },
});
