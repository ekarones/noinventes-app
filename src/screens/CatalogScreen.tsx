import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchCategories, fetchProducts, lookupByCode, type PaginationMeta } from '../api/products';
import { ApiError } from '../api/client';
import type { Category, Product } from '../types';
import type { CatalogStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { formatPrice } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { hapticAdd } from '../utils/haptics';
import { stockColor } from '../utils/stock';
import ProductImage from '../components/ProductImage';
import QRScannerModal from '../components/QRScannerModal';

type Props = NativeStackScreenProps<CatalogStackParamList, 'Catalog'>;

const PER_PAGE = 30;

// Quick "+" button with a tap pop. Hidden/disabled handling is done by the caller.
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
        hitSlop={8}
      >
        <Ionicons name="add" size={22} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CatalogScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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
    [query, categoryId]
  );

  // Reload whenever the (debounced) search or category changes.
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
    const isVariable = item.type === 'variable' || item.variationsCount > 0;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <ProductImage uri={item.imageUrl} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.category}>{item.category?.name ?? item.code}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.stockRow}>
            <Ionicons name="cube-outline" size={13} color={stockColor(item.stock)} />
            <Text style={[styles.stockText, { color: stockColor(item.stock) }]}>
              {Math.max(0, item.stock)} disp.
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.price}>
              {isVariable ? 'Desde ' : ''}
              {formatPrice(item.finalPrice)}
            </Text>
            {outOfStock ? (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Sin stock</Text>
              </View>
            ) : (
              <AddButton onPress={() => handleAdd(item)} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Catálogo</Text>
          <TouchableOpacity
            style={styles.scanBtn}
            activeOpacity={0.85}
            onPress={() => setScannerVisible(true)}
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            <Text style={styles.scanBtnText}>QR</Text>
          </TouchableOpacity>
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

        {/* Category chips */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip label="Todos" active={categoryId === null} onPress={() => setCategoryId(null)} />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                active={categoryId === cat.id}
                onPress={() => setCategoryId(cat.id)}
              />
            ))}
          </ScrollView>
        )}
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
              <Ionicons name="search-outline" size={48} color={colors.border} />
              <Text style={styles.errorText}>No se encontraron productos.</Text>
            </View>
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

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
  },
  scanBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
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
  chips: { gap: 8, paddingVertical: 12, paddingRight: 8 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 180,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary },
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
  list: { padding: 20, paddingTop: 4, gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 110,
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  // No fixed height: the image stretches to match the card's full height.
  image: { width: 110, alignSelf: 'stretch' },
  info: { flex: 1, padding: 14, justifyContent: 'space-between' },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginTop: 2 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  stockText: { fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.5 },
  outOfStockBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  outOfStockText: { color: colors.error, fontSize: 12, fontWeight: '700' },
});
