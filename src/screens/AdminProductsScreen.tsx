import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminProducts } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import { usePagedList } from '../hooks/usePagedList';
import { colors } from '../theme/colors';
import { SPACING } from '../theme/tokens';
import Pagination from '../components/Pagination';
import ProductGridCard from '../components/ProductGridCard';
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

const PER_PAGE = 20;

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

// `published` y `public` son igual de visibles para el vendedor; el ícono es lo
// único que los separa, porque la diferencia real es destacado vs. no. El color
// queda para la única distinción que cambia lo que el vendedor ve: oculto o no.
const STATUS_ICON: Record<AdminProductStatus, keyof typeof Ionicons.glyphMap> = {
  published: 'star-outline',
  public: 'eye-outline',
  private: 'lock-closed-outline',
};

function statusColor(status: AdminProductStatus) {
  return status === 'private' ? colors.textSecondary : colors.success;
}

export default function AdminProductsScreen({ navigation }: Props) {

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

  const fetchPage = useCallback(
    (page: number) =>
      fetchAdminProducts({
        search: query || undefined,
        status: statusParam,
        categoryId,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
        page,
        perPage: PER_PAGE,
      }),
    [query, statusParam, categoryId, sort]
  );
  const {
    items: products,
    meta,
    page,
    loading,
    refreshing,
    error,
    listRef,
    loadPage,
  } = usePagedList<AdminProductRow>(fetchPage, 'No se pudieron cargar los productos.');

  // Runs on focus (an edit elsewhere may have changed the catalogue) and whenever
  // a filter changes — either way the result set is new, so it starts at page 1.
  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  function renderItem({ item }: { item: AdminProductRow }) {
    return (
      <ProductGridCard
        imageUri={item.imageThumbUrl}
        overline={item.category?.name ?? `#${item.code}`}
        name={item.name}
        code={item.code}
        // The full range when the variations differ; a single price otherwise. If
        // the API build doesn't send the max yet, it reads as one price.
        price={formatPriceRange(item.finalPrice, item.finalPriceMax)}
        // Null for a variable product: its stock lives on the variations.
        badge={item.stock != null ? <StockBadge stock={item.stock} /> : undefined}
        meta={
          <IconLabelRow>
            <IconLabel
              icon={STATUS_ICON[item.status]}
              text={STATUS_LABEL[item.status]}
              tint={statusColor(item.status)}
            />
            {item.type === 'variable' && (
              <IconLabel icon="git-branch-outline" text={`${item.variationsCount} var.`} />
            )}
          </IconLabelRow>
        }
        onPress={() => navigation.navigate('AdminProductDetail', { product: item })}
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

        {/* Category picker and sort share the row equally — same as the seller's
            catalogue, so both roles read the same header. */}
        <View style={styles.filterRow}>
          <Select
            icon="folder-outline"
            placeholder="Todas las categorías"
            value={categoryId}
            options={categories.map((c) => ({ id: c.id, label: c.name, depth: c.depth }))}
            onChange={setCategoryId}
            style={styles.filterItem}
          />
          <SortControl
            options={PRODUCT_SORT_OPTIONS}
            index={sortIndex}
            onChange={setSortIndex}
            showSelection
            style={styles.filterItem}
          />
        </View>
      </ScreenTitle>

      {/* Only the very first load takes over the screen. Once there's a grid,
          changing page keeps it on screen and just disables the controls. */}
      {loading && products.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadPage(1) }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={products.length ? styles.grid : styles.listEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            <Pagination
              page={page}
              lastPage={meta?.lastPage ?? 1}
              onChange={loadPage}
              loading={loading}
            />
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
  // Category picker + sort share the row equally, `sm` apart — the same header
  // rhythm as the seller's catalogue.
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  filterItem: { flex: 1 },
  // A 2-column grid. The container `gap` spaces the rows; the row's `gap` spaces the
  // two columns (a fixed SPACING.sm). flexGrow lets a short grid fill the page.
  grid: { padding: SPACING.sm, paddingTop: SPACING.xs, gap: SPACING.sm, flexGrow: 1 },
  gridRow: { gap: SPACING.sm },
  listEmpty: { flexGrow: 1 },
});
