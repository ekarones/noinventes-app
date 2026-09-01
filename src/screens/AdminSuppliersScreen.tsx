import { useCallback, useMemo, useState } from 'react';
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
  deleteSupplier,
  fetchAdminSuppliers,
  type SupplierStatusFilter,
} from '../api/admin/suppliers';
import { usePagedList } from '../hooks/usePagedList';
import { useDebounce } from '../hooks/useDebounce';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import PushedHeader from '../components/PushedHeader';
import type { AdminSupplier } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminSuppliers'>;

const PER_PAGE = 20;

const STATUS_FILTERS: { value: SupplierStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

export default function AdminSuppliersScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  const [status, setStatus] = useState<SupplierStatusFilter>('all');

  const fetchPage = useCallback(
    (page: number) => fetchAdminSuppliers({ search: query || undefined, status, page, perPage: PER_PAGE }),
    [query, status]
  );
  const {
    items: suppliers,
    meta,
    page,
    loading,
    refreshing,
    error,
    listRef,
    loadPage,
  } = usePagedList<AdminSupplier>(fetchPage, 'No se pudieron cargar los proveedores.');

  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  const subtitle = useMemo(() => (meta ? `${meta.total} proveedores` : undefined), [meta]);

  function confirmDelete(s: AdminSupplier) {
    Alert.alert(
      'Eliminar proveedor',
      `¿Eliminar "${s.displayName}"? Si tiene órdenes de compra no se podrá borrar — en ese caso desactívalo para conservar el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(s) },
      ]
    );
  }

  async function doDelete(s: AdminSupplier) {
    try {
      await deleteSupplier(s.id);
      showToast('Proveedor eliminado', 'checkmark-circle');
      loadPage(page);
    } catch (e: any) {
      Alert.alert(
        'No se pudo eliminar',
        e?.message ?? 'Puede tener órdenes de compra asociadas. Desactívalo en su lugar.'
      );
    }
  }

  function renderItem({ item }: { item: AdminSupplier }) {
    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, !item.isActive && styles.iconBoxOff]}>
          <Ionicons
            name="business-outline"
            size={19}
            color={item.isActive ? '#8A6400' : 'rgba(22, 33, 58, 0.5)'}
          />
        </View>
        <View style={styles.info}>
          <View style={styles.nameLine}>
            <Text style={[styles.name, !item.isActive && styles.nameOff]} numberOfLines={1}>
              {item.displayName}
            </Text>
            {!item.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactivo</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.rucChip}>
              <Text style={styles.rucText}>RUC {item.ruc}</Text>
            </View>
          </View>
          {(item.contactName || item.phone) && (
            <Text style={styles.contact} numberOfLines={1}>
              {[item.contactName, item.phone].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminSupplierForm', { supplier: item })}
          style={styles.editBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar proveedor ${item.displayName}`}
        >
          <Ionicons name="create-outline" size={15} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.deleteBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar proveedor ${item.displayName}`}
        >
          <Ionicons name="trash-outline" size={15} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Proveedores"
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
        addAction={{ label: 'Nuevo', onPress: () => navigation.navigate('AdminSupplierForm', {}) }}
      />

      <View style={styles.filters}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="RUC, razón social o contacto..."
          bordered
        />
        <View style={styles.statusChips}>
          {STATUS_FILTERS.map((f) => {
            const on = status === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.statusChip, on && styles.statusChipOn]}
                onPress={() => setStatus(f.value)}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
              >
                <Text style={[styles.statusChipText, on && styles.statusChipTextOn]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && suppliers.length === 0 ? (
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
          data={suppliers}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
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
            <Pagination page={page} lastPage={meta?.lastPage ?? 1} onChange={loadPage} loading={loading} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title="Sin proveedores"
              message="Crea el primero con el botón +."
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
    filters: {
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      paddingVertical: 12,
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor: '#E9EBF0',
    },
    statusChips: { flexDirection: 'row', gap: 7 },
    statusChip: { height: 34, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    statusChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    statusChipText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.6)' },
    statusChipTextOn: { color: '#fff' },

    list: { padding: 18, gap: 10, flexGrow: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    iconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF3CF', alignItems: 'center', justifyContent: 'center' },
    iconBoxOff: { backgroundColor: colors.fill },
    info: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    name: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary, flexShrink: 1 },
    nameOff: { color: 'rgba(22, 33, 58, 0.6)' },
    inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.fill },
    inactiveText: { fontSize: 10, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.55)' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
    rucChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.fill },
    rucText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.55)' },
    contact: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 4 },
    editBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: '#F3CFC6', backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center' },
  });
