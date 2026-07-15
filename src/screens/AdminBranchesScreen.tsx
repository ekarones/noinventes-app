import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  createBranch,
  deleteBranch,
  fetchAdminBranches,
  updateBranch,
} from '../api/admin/branches';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import LoadingState from '../components/LoadingState';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import type { AdminBranch } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminBranches'>;

export default function AdminBranchesScreen({ navigation }: Props) {
  const { showToast } = useToast();

  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBranch | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setBranches(await fetchAdminBranches());
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las sucursales.');
      setBranches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openCreate() {
    setEditing(null);
    setName('');
    setAddress('');
    setActive(true);
    setFormOpen(true);
  }

  function openEdit(b: AdminBranch) {
    setEditing(b);
    setName(b.name);
    setAddress(b.address ?? '');
    setActive(b.active);
    setFormOpen(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const payload = { name: trimmed, address: address.trim() || null, active };
      if (editing) {
        await updateBranch(editing.id, payload);
        showToast('Sucursal actualizada', 'checkmark-circle');
      } else {
        await createBranch(payload);
        showToast('Sucursal creada', 'checkmark-circle');
      }
      setFormOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(b: AdminBranch) {
    const warn =
      b.sellersCount > 0
        ? `\n\nTiene ${b.sellersCount} ${b.sellersCount === 1 ? 'vendedor asignado' : 'vendedores asignados'}.`
        : '';
    Alert.alert(
      'Eliminar sucursal',
      `¿Eliminar "${b.name}"? Esta acción no se puede deshacer.${warn}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(b) },
      ]
    );
  }

  async function doDelete(b: AdminBranch) {
    try {
      await deleteBranch(b.id);
      showToast('Sucursal eliminada', 'checkmark-circle');
      load();
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminBranch }) {
    return (
      <View style={styles.row}>
        <View style={[styles.iconBox, !item.active && styles.iconBoxOff]}>
          <Ionicons
            name="storefront-outline"
            size={20}
            color={item.active ? colors.primary : colors.textSecondary}
          />
        </View>
        <View style={styles.rowInfo}>
          <View style={styles.nameLine}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            {!item.active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactiva</Text>
              </View>
            )}
          </View>
          {!!item.address && (
            <Text style={styles.rowAddress} numberOfLines={1}>
              {item.address}
            </Text>
          )}
          <Text style={styles.rowMeta}>
            {item.sellersCount} {item.sellersCount === 1 ? 'vendedor' : 'vendedores'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={styles.rowBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar sucursal ${item.name}`}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.rowBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar sucursal ${item.name}`}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Sucursales"
        onBack={() => navigation.goBack()}
        action={{ icon: 'add', onPress: openCreate, label: 'Nueva sucursal' }}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => load() }}
        />
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(b) => String(b.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              title="Sin sucursales"
              message="Crea la primera con el botón +."
            />
          }
        />
      )}

      {/* Create / edit form */}
      <BottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar sucursal' : 'Nueva sucursal'}
        keyboardAware
      >
        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Sucursal Centro"
          autoFocus
        />

        <Field
          label="Dirección (opcional)"
          value={address}
          onChangeText={setAddress}
          placeholder="Ej. Av. Principal 123"
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Activa</Text>
            <Text style={styles.switchHint}>Las inactivas no operan ventas</Text>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={active ? colors.primary : '#f4f3f4'}
          />
        </View>

        {!editing && (
          <Text style={styles.hint}>Al crearla se inicializa con stock 0 en todo el catálogo.</Text>
        )}

        <Button
          label={editing ? 'Guardar' : 'Crear'}
          onPress={save}
          loading={saving}
          disabled={!name.trim()}
          style={styles.saveBtn}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING['2xl'], flexGrow: 1 },
  sep: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxOff: { backgroundColor: colors.border },
  rowInfo: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowName: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, flexShrink: 1 },
  inactiveBadge: { backgroundColor: colors.border, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.hairline, borderRadius: RADIUS.badge },
  inactiveText: { fontSize: FONT_SIZE.badge, fontWeight: FONT_WEIGHT.bold, color: colors.textSecondary },
  rowAddress: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.hairline },
  rowMeta: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.hairline },
  rowBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xl },
  switchLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  switchHint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.hairline },
  hint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.sm, lineHeight: 17 },
  saveBtn: { marginTop: SPACING['2xl'] },
});
