import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  fetchAdminProductsTrash,
  forceDeleteProduct,
  restoreProduct,
} from '../api/admin/products';
import { usePagedList } from '../hooks/usePagedList';
import { colors } from '../theme/colors';
import { SIZE, FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ScreenHeader from '../components/ScreenHeader';
import { formatPrice } from '../utils/format';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import type { AdminProductRow } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductsTrash'>;

const PER_PAGE = 20;

export default function AdminProductsTrashScreen({ navigation }: Props) {
  const { showToast } = useToast();

  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback(
    (page: number) => fetchAdminProductsTrash({ page, perPage: PER_PAGE }),
    []
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
  } = usePagedList<AdminProductRow>(fetchPage, 'No se pudo cargar la papelera.');

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  async function doRestore(p: AdminProductRow) {
    if (busy) return;
    setBusy(true);
    try {
      await restoreProduct(p.id);
      showToast('Producto restaurado', 'checkmark-circle');
      // Stay on the page you were looking at; loadPage steps back if it emptied.
      loadPage(page);
    } catch (e: any) {
      Alert.alert('No se pudo restaurar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function confirmForceDelete(p: AdminProductRow) {
    Alert.alert(
      'Eliminar permanentemente',
      `¿Borrar "${p.name}" para siempre? Se eliminarán sus imágenes, variaciones y asignaciones. Las ventas ya registradas conservarán su detalle histórico. Esta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar para siempre', style: 'destructive', onPress: () => doForceDelete(p) },
      ]
    );
  }

  async function doForceDelete(p: AdminProductRow) {
    if (busy) return;
    setBusy(true);
    try {
      await forceDeleteProduct(p.id);
      showToast('Producto eliminado', 'checkmark-circle');
      loadPage(page);
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function renderItem({ item }: { item: AdminProductRow }) {
    return (
      <View style={styles.card}>
        <ProductImage uri={item.imageThumbUrl} style={styles.thumb} iconSize={20} />
        <View style={styles.cardInfo}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.code}>{item.code}</Text>
          <Text style={styles.price}>{formatPrice(item.finalPrice)}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => doRestore(item)}
            disabled={busy}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Restaurar ${item.name}`}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.forceBtn}
            onPress={() => confirmForceDelete(item)}
            disabled={busy}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar permanentemente ${item.name}`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Papelera" onBack={() => navigation.goBack()} />

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
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
              icon="trash-outline"
              title="Papelera vacía"
              message="Los productos eliminados aparecerán aquí."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: SPACING.sm, paddingTop: SPACING.xs, gap: SPACING.sm, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: RADIUS.card, padding: SPACING.md, gap: SPACING.md },
  thumb: { width: SIZE.thumb, height: SIZE.thumb, borderRadius: RADIUS.control, opacity: 0.6 },
  cardInfo: { flex: 1, gap: SPACING.hairline },
  name: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.medium, color: colors.textPrimary },
  code: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  price: { fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  restoreBtn: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceBtn: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: RADIUS.pill,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
