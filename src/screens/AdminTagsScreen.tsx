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
import { createTag, deleteTag, fetchAdminTags, updateTag } from '../api/admin/tags';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, HIT_SLOP, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import LoadingState from '../components/LoadingState';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import type { AdminTag } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminTags'>;

export default function AdminTagsScreen({ navigation }: Props) {
  const { showToast } = useToast();

  const [tags, setTags] = useState<AdminTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTag | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setTags(await fetchAdminTags());
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las etiquetas.');
      setTags([]);
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
    setFormOpen(true);
  }

  function openEdit(t: AdminTag) {
    setEditing(t);
    setName(t.name);
    setFormOpen(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTag(editing.id, trimmed);
        showToast('Etiqueta actualizada', 'checkmark-circle');
      } else {
        await createTag(trimmed);
        showToast('Etiqueta creada', 'checkmark-circle');
      }
      setFormOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(t: AdminTag) {
    const warn =
      t.productsCount > 0
        ? `Se quitará de ${t.productsCount} ${t.productsCount === 1 ? 'producto' : 'productos'}.`
        : '';
    Alert.alert('Eliminar etiqueta', `¿Eliminar "${t.name}"? ${warn}`.trim(), [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(t) },
    ]);
  }

  async function doDelete(t: AdminTag) {
    try {
      await deleteTag(t.id);
      showToast('Etiqueta eliminada', 'checkmark-circle');
      load();
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminTag }) {
    return (
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowMeta}>
            {item.productsCount} {item.productsCount === 1 ? 'producto' : 'productos'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          hitSlop={HIT_SLOP}
          style={styles.rowBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar etiqueta ${item.name}`}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          hitSlop={HIT_SLOP}
          style={styles.rowBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar etiqueta ${item.name}`}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Etiquetas"
        onBack={() => navigation.goBack()}
        action={{ icon: 'add', onPress: openCreate, label: 'Nueva etiqueta' }}
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
          data={tags}
          keyExtractor={(t) => String(t.id)}
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
              icon="pricetags-outline"
              title="Sin etiquetas"
              message="Crea la primera con el botón +."
            />
          }
        />
      )}

      {/* Create / rename form */}
      <BottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar etiqueta' : 'Nueva etiqueta'}
        keyboardAware
      >
        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Novedad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
        />

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
  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  sep: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  rowMeta: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: 1 },
  rowBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { marginTop: 20 },
});
