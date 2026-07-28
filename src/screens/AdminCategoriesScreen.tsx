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
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
} from '../api/admin/categories';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import SearchBar from '../components/SearchBar';
import Field from '../components/Field';
import LoadingState from '../components/LoadingState';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import type { AdminCategory } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminCategories'>;

const INDENT = 18;

export default function AdminCategoriesScreen({ navigation }: Props) {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);

  // Editor state. `editing` null = creating a new one.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setCategories(await fetchAdminCategories(query || undefined));
      } catch (e: any) {
        setError(e?.message ?? 'No se pudieron cargar las categorías.');
        setCategories([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Descendants of `id` — used to keep a category from being nested under
  // itself or one of its own children (the server rejects it with 422 anyway).
  const descendantsOf = useCallback(
    (id: number): Set<number> => {
      const out = new Set<number>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of categories) {
          if (c.parentId != null && out.has(c.parentId) && !out.has(c.id)) {
            out.add(c.id);
            grew = true;
          }
        }
      }
      return out;
    },
    [categories]
  );

  const parentOptions = useMemo(() => {
    if (!editing) return categories;
    const blocked = descendantsOf(editing.id);
    return categories.filter((c) => !blocked.has(c.id));
  }, [categories, editing, descendantsOf]);

  const parentName = parentId == null ? 'Ninguna (raíz)' : categories.find((c) => c.id === parentId)?.name ?? '—';

  function openCreate() {
    setEditing(null);
    setName('');
    setParentId(null);
    setFormOpen(true);
  }

  function openEdit(c: AdminCategory) {
    setEditing(c);
    setName(c.name);
    setParentId(c.parentId);
    setFormOpen(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, trimmed, parentId);
        showToast('Categoría actualizada', 'checkmark-circle');
      } else {
        await createCategory(trimmed, parentId);
        showToast('Categoría creada', 'checkmark-circle');
      }
      setFormOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(c: AdminCategory) {
    Alert.alert('Eliminar categoría', `¿Eliminar "${c.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(c) },
    ]);
  }

  async function doDelete(c: AdminCategory) {
    try {
      await deleteCategory(c.id);
      showToast('Categoría eliminada', 'checkmark-circle');
      load();
    } catch (e: any) {
      // The server 422 explains what to move first (subcategories / products).
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminCategory }) {
    return (
      <View style={[styles.row, { paddingLeft: SPACING.lg + item.depth * INDENT }]}>
        <Ionicons
          name={item.hasChildren ? 'folder-outline' : 'pricetag-outline'}
          size={18}
          color={item.depth === 0 ? colors.primary : colors.textSecondary}
        />
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
          style={styles.rowBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar categoría ${item.name}`}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.rowBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar categoría ${item.name}`}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Categorías"
        onBack={() => navigation.goBack()}
        action={{ icon: 'add', onPress: openCreate, label: 'Nueva categoría' }}
      />

      <View style={styles.searchWrap}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar categoría..."
        />
      </View>

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
          data={categories}
          keyExtractor={(c) => String(c.id)}
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
              icon="folder-open-outline"
              title="Sin categorías"
              message="Crea la primera con el botón +."
            />
          }
        />
      )}

      {/* Create / edit form */}
      <BottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        keyboardAware
      >
        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Polos"
          autoFocus
        />

        <Text style={styles.label}>Categoría padre</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => setParentPickerOpen(true)}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Categoría padre: ${parentName}`}
        >
          <Text style={styles.selectText} numberOfLines={1}>
            {parentName}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Button
          label={editing ? 'Guardar' : 'Crear'}
          onPress={save}
          loading={saving}
          disabled={!name.trim()}
          style={styles.saveBtn}
        />
      </BottomSheet>

      {/* Parent picker */}
      <BottomSheet
        visible={parentPickerOpen}
        onClose={() => setParentPickerOpen(false)}
        title="Categoría padre"
        scrollable
      >
        <SheetOption
          label="Ninguna (raíz)"
          active={parentId == null}
          onPress={() => {
            setParentId(null);
            setParentPickerOpen(false);
          }}
        />
        {parentOptions.map((c) => (
          <SheetOption
            key={c.id}
            label={c.name}
            depth={c.depth}
            active={parentId === c.id}
            onPress={() => {
              setParentId(c.id);
              setParentPickerOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.md },
  list: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING['2xl'], flexGrow: 1 },
  sep: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  rowMeta: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.hairline },
  rowBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.input,
  },
  selectText: { flex: 1, fontSize: FONT_SIZE.subheading, color: colors.textPrimary },
  saveBtn: { marginTop: SPACING['2xl'] },
});
