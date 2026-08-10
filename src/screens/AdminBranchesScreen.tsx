import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import LoadingState from '../components/LoadingState';
import BottomSheet from '../components/BottomSheet';
import PushedHeader from '../components/PushedHeader';
import EmptyState from '../components/EmptyState';
import type { AdminBranch } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminBranches'>;

export default function AdminBranchesScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

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

  const activeCount = branches.filter((b) => b.active).length;

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

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), address: address.trim() || null, active };
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
        ? `\n\nTiene ${b.sellersCount} ${b.sellersCount === 1 ? 'vendedor asignado' : 'vendedores asignados'}: tendrás que reasignarlos.`
        : '\n\nSe perderá su stock registrado.';
    Alert.alert(
      'Eliminar sucursal',
      `¿Eliminar "${b.name}"? Esta acción es irreversible.${warn}`,
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
      // 422 if it still has sellers assigned.
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminBranch }) {
    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, !item.active && styles.iconBoxOff]}>
          <Ionicons
            name="storefront-outline"
            size={19}
            color={item.active ? '#8A6400' : 'rgba(22, 33, 58, 0.5)'}
          />
        </View>
        <View style={styles.info}>
          <View style={styles.nameLine}>
            <Text style={[styles.name, !item.active && styles.nameOff]} numberOfLines={1}>
              {item.name}
            </Text>
            {!item.active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactiva</Text>
              </View>
            )}
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {item.address || 'Sin dirección'}
          </Text>
          <Text style={styles.sellers}>
            {item.sellersCount > 0
              ? `${item.sellersCount} ${item.sellersCount === 1 ? 'vendedor asignado' : 'vendedores asignados'}`
              : 'Sin vendedores asignados'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={styles.editBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar sucursal ${item.name}`}
        >
          <Ionicons name="create-outline" size={15} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.deleteBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar sucursal ${item.name}`}
        >
          <Ionicons name="trash-outline" size={15} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Sucursales"
        subtitle={`${branches.length} ${branches.length === 1 ? 'sucursal' : 'sucursales'} · ${activeCount} ${activeCount === 1 ? 'activa' : 'activas'}`}
        onBack={() => navigation.goBack()}
        addAction={{ label: 'Nueva', onPress: openCreate }}
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
              message="Crea la primera para registrar stock y asignar vendedores."
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
        footer={
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setFormOpen(false)}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
              onPress={save}
              disabled={!canSave}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Text style={[styles.saveText, !canSave && styles.saveTextOff]}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear sucursal'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      >
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej. Sucursal Centro"
          placeholderTextColor="rgba(22, 33, 58, 0.35)"
          autoFocus
        />

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Dirección (opcional)</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Av. Principal 123"
          placeholderTextColor="rgba(22, 33, 58, 0.35)"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchTexts}>
            <Text style={styles.switchLabel}>Activa</Text>
            <Text style={styles.switchHint}>Las inactivas no operan ventas</Text>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: colors.controlBorder, true: '#FFC20E' }}
            thumbColor="#fff"
            ios_backgroundColor={colors.controlBorder}
          />
        </View>

        {!editing && (
          <View style={styles.noteBlock}>
            <Ionicons name="information-circle-outline" size={17} color="rgba(22, 33, 58, 0.5)" />
            <Text style={styles.noteText}>
              Al crearla se inicializa con stock 0 en todo el catálogo.
            </Text>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    iconBoxOff: { backgroundColor: colors.fill, opacity: 0.85 },
    info: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    name: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary, flexShrink: 1 },
    nameOff: { color: 'rgba(22, 33, 58, 0.6)' },
    inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.errorSoft },
    inactiveText: { fontSize: 10, fontFamily: FONT_FAMILY.black, color: colors.error },
    address: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 3 },
    sellers: { fontSize: 11.5, fontFamily: FONT_FAMILY.extrabold, color: 'rgba(22, 33, 58, 0.62)', marginTop: 3 },
    editBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: '#F3CFC6', backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center' },

    fieldLabel: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      marginBottom: 7,
    },
    fieldLabelSpaced: { marginTop: 16 },
    input: {
      height: 54,
      paddingHorizontal: 15,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 16,
      fontSize: 16,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 16,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 16,
    },
    switchTexts: { flex: 1 },
    switchLabel: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    switchHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    noteBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#F7F8FA', borderRadius: 14, padding: 12, marginTop: 12 },
    noteText: { flex: 1, fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.6)', lineHeight: 17 },
    sheetActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { height: 54, paddingHorizontal: 20, borderRadius: 17, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    saveBtn: { flex: 1, height: 54, borderRadius: 17, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    saveBtnOff: { backgroundColor: '#EDEFF3' },
    saveText: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    saveTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
