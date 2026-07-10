import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useToast } from '../context/ToastContext';
import type { AdminBranch } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminBranches'>;

export default function AdminBranchesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.rowBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={styles.rowBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sucursales</Text>
        <TouchableOpacity onPress={openCreate} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.muted}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
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
            <View style={styles.center}>
              <Ionicons name="storefront-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>Sin sucursales</Text>
              <Text style={styles.muted}>Crea la primera con el botón +.</Text>
            </View>
          }
        />
      )}

      {/* Create / edit form */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.overlayFill} onPress={() => setFormOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editing ? 'Editar sucursal' : 'Nueva sucursal'}</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Sucursal Centro"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />

            <Text style={styles.label}>Dirección (opcional)</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Ej. Av. Principal 123"
              placeholderTextColor={colors.textSecondary}
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
              <Text style={styles.hint}>
                Al crearla se inicializa con stock 0 en todo el catálogo.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
              onPress={save}
              disabled={!name.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveText}>{editing ? 'Guardar' : 'Crear'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  muted: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  sep: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxOff: { backgroundColor: colors.border },
  rowInfo: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, flexShrink: 1 },
  inactiveBadge: { backgroundColor: colors.border, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  inactiveText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  rowAddress: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  rowMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  rowBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  overlayFill: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 8, marginBottom: 6 },
  input: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: colors.textPrimary,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  switchHint: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 14, lineHeight: 17 },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.6 },
  saveText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
