import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchCategories, fetchProducts, lookupByCode, type PaginationMeta } from '../api/products';
import { ApiError } from '../api/client';
import type { Category, Product } from '../types';
import type { CatalogStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { formatPriceRange } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { hapticAdd } from '../utils/haptics';
import { flattenCategoryTree } from '../utils/categoryTree';
import { PRODUCT_SORT_OPTIONS, SELLER_DEFAULT_SORT } from '../utils/sortOptions';
import ProductGridCard from '../components/ProductGridCard';
import StockBadge from '../components/StockBadge';
import IconButton from '../components/IconButton';
import Select from '../components/Select';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import { SortControl } from '../components/FilterControls';
import EmptyState from '../components/EmptyState';
import QRScannerModal from '../components/QRScannerModal';

type Props = NativeStackScreenProps<CatalogStackParamList, 'Catalog'>;

const PER_PAGE = 30;

// Quick "+" button with a tap pop. Out of stock it stays put, greyed and inert:
// the row keeps its shape down the list, and the badge above already says why.
function AddButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onPress();
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.addBtn, disabled && styles.addBtnDisabled]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={disabled ? 'Sin stock' : 'Agregar al carrito'}
        accessibilityState={{ disabled: !!disabled }}
      >
        <Ionicons name="add" size={22} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CatalogScreen({ navigation }: Props) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  const [sortIndex, setSortIndex] = useState(SELLER_DEFAULT_SORT);
  const sort = PRODUCT_SORT_OPTIONS[sortIndex];

  // Flat from the API → tree order + depth, so the picker can indent the hierarchy.
  const categoryOptions = useMemo(
    () => flattenCategoryTree(categories).map((c) => ({ id: c.id, label: c.name, depth: c.depth })),
    [categories]
  );

  const hasFilters = searchText.length > 0 || categoryId !== null;

  function clearFilters() {
    setSearchText('');
    setCategoryId(null);
  }

  // Load categories once (they rarely change).
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        /* non-fatal: filters just won't show */
      });
  }, []);

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const { items, meta: m } = await fetchProducts({
          search: query,
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
    [query, categoryId, sort]
  );

  // Reload whenever the (debounced) search, category or sort changes.
  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  async function loadMore() {
    if (!meta || loadingMore || meta.currentPage >= meta.lastPage) return;
    setLoadingMore(true);
    try {
      const { items, meta: m } = await fetchProducts({
        search: query,
        categoryId,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
        page: meta.currentPage + 1,
        perPage: PER_PAGE,
      });
      setProducts((prev) => [...prev, ...items]);
      setMeta(m);
    } catch {
      /* keep what we have; user can pull to refresh */
    } finally {
      setLoadingMore(false);
    }
  }

  // Resolve a scanned QR via GET /lookup and open the product's detail. If the
  // code is a specific variation, it's preselected on the detail screen.
  async function handleScanned(code: string) {
    setScannerVisible(false);
    try {
      const result = await lookupByCode(code);
      navigation.navigate('ProductDetail', {
        product: result.product,
        variationId: result.variation?.id,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) return; // handled globally
        // 422 → code is a variable parent (must scan a variation); 404 → not found.
        Alert.alert(e.status === 422 ? 'Producto con variaciones' : 'Código no válido', e.message);
        return;
      }
      Alert.alert('Error', 'No se pudo buscar el producto.');
    }
  }

  function handleAdd(product: Product) {
    // Variable products need a variation chosen → open detail.
    if (product.type === 'variable' || product.variationsCount > 0) {
      navigation.navigate('ProductDetail', { product });
      return;
    }
    addItem(product);
    hapticAdd();
    showToast(`${product.name} agregado`, 'cart');
  }

  function renderItem({ item }: { item: Product }) {
    const outOfStock = item.stock <= 0;
    return (
      <ProductGridCard
        imageUri={item.imageThumbUrl}
        overline={item.category?.name ?? `#${item.code}`}
        name={item.name}
        code={item.code}
        // The full range when the variations differ ("S/ 39.90 – S/ 59.90");
        // a single price otherwise.
        price={formatPriceRange(item.finalPrice, item.finalPriceMax)}
        badge={<StockBadge stock={item.stock} />}
        action={<AddButton onPress={() => handleAdd(item)} disabled={outOfStock} />}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
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
          <IconButton
            icon="qr-code-outline"
            label="QR"
            onPress={() => setScannerVisible(true)}
            accessibilityLabel="Escanear código QR"
          />
        }
      >
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre o código..."
        />

        {/* Category picker and sort share one line: the category button takes the
            room, sort sits compact beside it. */}
        <View style={styles.filterRow}>
          <Select
            icon="folder-outline"
            placeholder="Todas las categorías"
            value={categoryId}
            options={categoryOptions}
            onChange={setCategoryId}
            style={styles.categorySelect}
          />
          <SortControl options={PRODUCT_SORT_OPTIONS} index={sortIndex} onChange={setSortIndex} />
        </View>
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
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={products.length ? styles.grid : styles.listEmpty}
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
              icon={hasFilters ? 'search-outline' : 'cube-outline'}
              title={hasFilters ? 'Sin resultados' : 'Catálogo vacío'}
              message={
                hasFilters
                  ? 'Prueba con otra búsqueda o límpiala.'
                  : 'Aún no hay productos en tu sucursal.'
              }
              action={hasFilters ? { label: 'Limpiar filtros', onPress: clearFilters } : undefined}
            />
          }
        />
      )}

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Category picker + sort on one line. The gap between them and the lift off the
  // search bar both use `sm`, matching the gap between the cards below.
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  categorySelect: { flex: 1 },
  // A 2-column grid. `gap` spaces the rows; the row's own `space-between` (with the
  // cards at 49%) spaces the two columns. flexGrow lets a short grid fill the page.
  grid: { padding: SPACING.xl, paddingTop: SPACING.xs, gap: SPACING.sm, flexGrow: 1 },
  gridRow: { justifyContent: 'space-between' },
  listEmpty: { flexGrow: 1 },
  // A round button beside the price. Circular via RADIUS.pill (never width/2), and
  // sized to the touch minimum since it sits on its own now, not on the image.
  addBtn: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.5 },
});
