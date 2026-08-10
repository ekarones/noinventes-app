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
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import PushedHeader from '../components/PushedHeader';
import { formatPrice } from '../utils/format';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import type { AdminProductRow } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductsTrash'>;

const PER_PAGE = 20;

export default function AdminProductsTrashScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();

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
      loadPage(page);
    } catch (e: any) {
      Alert.alert('No se pudo restaurar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function confirmForceDelete(p: AdminProductRow) {
    Alert.alert(
      'Eliminar para siempre',
      `¿Borrar "${p.name}" para siempre? Se eliminarán sus imágenes, variaciones y asignaciones. Las ventas ya registradas conservarán su detalle histórico. Esta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, eliminar para siempre', style: 'destructive', onPress: () => doForceDelete(p) },
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
        <View style={styles.topRow}>
          <ProductImage uri={item.imageThumbUrl} style={styles.thumb} iconSize={20} />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.codeChip}>
                <Text style={styles.codeText}>{item.code}</Text>
              </View>
              <Text style={styles.price}>{formatPrice(item.finalPrice)}</Text>
            </View>
          </View>
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
            <Ionicons name="refresh-outline" size={15} color={colors.chromeFill} />
            <Text style={styles.restoreText}>Restaurar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.forceBtn}
            onPress={() => confirmForceDelete(item)}
            disabled={busy}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar permanentemente ${item.name}`}
          >
            <Text style={styles.forceText}>Eliminar siempre</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Papelera"
        subtitle={meta ? `${meta.total} productos eliminados` : undefined}
        onBack={() => navigation.goBack()}
      />

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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 18, gap: 10, flexGrow: 1 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      gap: 12,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    thumb: { width: 52, height: 52, borderRadius: 15, opacity: 0.5 },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.72)' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
    codeChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.fill },
    codeText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.55)' },
    price: { fontSize: 13, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.55)' },
    actions: { flexDirection: 'row', gap: 9 },
    restoreBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    restoreText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: '#fff' },
    forceBtn: {
      flex: 1,
      height: 44,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#F3CFC6',
      backgroundColor: colors.errorSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    forceText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.error },
  });
