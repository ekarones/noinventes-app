import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchCategories, fetchProducts, lookupByCode } from '../api/products';
import { usePagedList } from '../hooks/usePagedList';
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
import { PRODUCT_SORT_OPTIONS, SELLER_DEFAULT_SORT } from '../utils/sortOptions';
import PagedList from '../components/PagedList';
import ProductGridCard from '../components/ProductGridCard';
import StockBadge from '../components/StockBadge';
import IconButton from '../components/IconButton';
import Select from '../components/Select';
import ScreenTitle from '../components/ScreenTitle';
import SearchBar from '../components/SearchBar';
import { SortControl } from '../components/FilterControls';
import EmptyState from '../components/EmptyState';
import QRScannerModal from '../components/QRScannerModal';

type Props = NativeStackScreenProps<CatalogStackParamList, 'Catalog'>;

const PER_PAGE = 20;

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
  const { addItem, stockVersion } = useCart();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);

  const [scannerVisible, setScannerVisible] = useState(false);

  const [sortIndex, setSortIndex] = useState(SELLER_DEFAULT_SORT);
  const sort = PRODUCT_SORT_OPTIONS[sortIndex];

  // Already depth-first and depth-tagged by the server — just relabel for the picker.
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, label: c.name, depth: c.depth })),
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

  const fetchPage = useCallback(
    (page: number) =>
      fetchProducts({
        search: query,
        categoryId,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
        page,
        perPage: PER_PAGE,
      }),
    [query, categoryId, sort]
  );
  const list = usePagedList<Product>(fetchPage, 'No se pudieron cargar los productos.');

  // A changed search, category or sort is a different result set — back to page 1.
  useEffect(() => {
    list.loadPage(1);
  }, [list.loadPage]);

  // A sale (from checkout) changed stock — re-fetch so the catalogue reflects it.
  // Skip the mount run: the effect above already loads the first page.
  const firstStockRun = useRef(true);
  useEffect(() => {
    if (firstStockRun.current) {
      firstStockRun.current = false;
      return;
    }
    list.loadPage(1);
  }, [stockVersion]);

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
        // Stock rides the code's line as a colour-coded badge beside the code chip.
        codeRight={<StockBadge stock={item.stock} />}
        // The full range when the variations differ ("S/ 39.90 – S/ 59.90");
        // a single price otherwise.
        price={formatPriceRange(item.finalPrice, item.finalPriceMax)}
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
          list.meta
            ? `${list.meta.total} ${hasFilters ? 'coinciden' : 'productos'} · ${sort.label}`
            : undefined
        }
        actions={
          <IconButton
            icon="qr-code-outline"
            label="QR"
            onPress={() => setScannerVisible(true)}
            accent
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

      <PagedList
        list={list}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        empty={
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
  // Category picker and sort share the row equally, with a `sm` (10) gap between.
  filterItem: { flex: 1 },
  // A 2-column grid. The container `gap` spaces the rows; the row's `gap` spaces the
  // two columns (a fixed SPACING.sm). flexGrow lets a short grid fill the page.
  // No top padding — the grid sits flush under the header.
  grid: { padding: SPACING.sm, paddingTop: 0, gap: SPACING.sm, flexGrow: 1 },
  gridRow: { gap: SPACING.sm },
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
