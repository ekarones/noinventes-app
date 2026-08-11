import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminProducts } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import { usePagedList } from '../hooks/usePagedList';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PagedList from '../components/PagedList';
import ProductGridCard from '../components/ProductGridCard';
import StockBadge from '../components/StockBadge';
import Chip, { ChipRow } from '../components/Chip';
import Select from '../components/Select';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { formatPriceRange } from '../utils/format';
import { useDebounce } from '../hooks/useDebounce';
import { ADMIN_DEFAULT_SORT, PRODUCT_SORT_OPTIONS } from '../utils/sortOptions';
import { PRODUCT_STATUS_LABEL } from '../utils/productStatus';
import { SortControl } from '../components/FilterControls';
import type { AdminCategory, AdminProductRow, AdminProductStatus } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProducts'>;

const PER_PAGE = 20;

type StatusFilter = 'all' | AdminProductStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'public', label: 'Públicos' },
  { value: 'private', label: 'Privados' },
];

export default function AdminProductsScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);

  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  const [status, setStatus] = useState<StatusFilter>('all');

  const [sortIndex, setSortIndex] = useState(ADMIN_DEFAULT_SORT);
  const sort = PRODUCT_SORT_OPTIONS[sortIndex];

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
  const list = usePagedList<AdminProductRow>(fetchPage, 'No se pudieron cargar los productos.');

  // Runs on focus (an edit elsewhere may have changed the catalogue) and whenever
  // a filter changes — either way the result set is new, so it starts at page 1.
  useFocusEffect(
    useCallback(() => {
      list.loadPage(1);
    }, [list.loadPage])
  );

  function renderItem({ item }: { item: AdminProductRow }) {
    const variable = item.type === 'variable';
    const isPublic = item.status === 'public';
    return (
      <ProductGridCard
        imageUri={item.imageThumbUrl}
        overline={item.category?.name ?? `#${item.code}`}
        name={item.name}
        code={item.code}
        // Stock beside the code; null for a variable product (its stock lives on
        // the variations).
        codeRight={item.stock != null ? <StockBadge stock={item.stock} /> : undefined}
        // Variable products carry a variations count on the image instead of stock.
        badge={
          variable ? (
            <View style={styles.varBadge}>
              <Text style={styles.varText}>{item.variationsCount} var.</Text>
            </View>
          ) : undefined
        }
        price={formatPriceRange(item.finalPrice, item.finalPriceMax)}
        meta={
          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: isPublic ? '#ffc20e' : 'rgba(22, 33, 58, 0.3)' }]}
            />
            <Text style={[styles.statusText, { color: isPublic ? '#8a6400' : 'rgba(22, 33, 58, 0.5)' }]}>
              {PRODUCT_STATUS_LABEL[item.status]}
            </Text>
          </View>
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
          list.meta ? `${list.meta.total} ${hasFilters ? 'coinciden' : 'productos'}` : undefined
        }
        actions={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.trashBtn}
              onPress={() => navigation.navigate('AdminProductsTrash')}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
              accessibilityLabel="Papelera"
            >
              <Ionicons name="trash-outline" size={18} color="#16213a" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => navigation.navigate('AdminProductForm', {})}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
              accessibilityLabel="Nuevo producto"
            >
              <Text style={styles.newPlus}>+</Text>
              <Text style={styles.newText}>Nuevo</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.filters}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre o código"
          bordered
        />

        <View style={styles.filterRow}>
          <Select
            icon="folder-outline"
            placeholder="Todas las categorías"
            value={categoryId}
            options={categories.map((c) => ({
              id: c.id,
              label: c.name,
              depth: c.depth,
              count: String(c.productsCount),
            }))}
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

        <ChipRow bare>
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              active={status === s.value}
              onPress={() => setStatus(s.value)}
            />
          ))}
        </ChipRow>
      </View>

      <PagedList
        list={list}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        empty={
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
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerActions: { flexDirection: 'row', gap: 8 },
    // The 5a header buttons — both use the raised amber pill from the management
    // headers (amber fill, navy hairline, drop shadow): a square trash + "Nuevo".
    trashBtn: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: '#ffc20e',
      borderWidth: 2,
      borderColor: '#16213a',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0A0F1C',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 44,
      paddingHorizontal: 14,
      borderRadius: 15,
      backgroundColor: '#ffc20e',
      borderWidth: 2,
      borderColor: '#16213a',
      shadowColor: '#0A0F1C',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    newPlus: { fontSize: 19, fontFamily: FONT_FAMILY.black, color: '#16213a' },
    newText: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: '#16213a' },
    filters: {
      backgroundColor: colors.surface,
      paddingHorizontal: 22,
      paddingVertical: 12,
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    filterItem: { flex: 1 },
    grid: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, gap: 12, flexGrow: 1 },
    gridRow: { gap: 12 },
    // The variations badge overlaid on a variable product's image.
    varBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 9,
      backgroundColor: 'rgba(22, 33, 58, 0.82)',
    },
    varText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: '#ffffff' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 7, height: 7, borderRadius: 999 },
    statusText: { fontSize: 11.5, fontFamily: FONT_FAMILY.extrabold },
  });
