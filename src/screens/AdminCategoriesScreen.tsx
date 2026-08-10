import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import BottomSheet from '../components/BottomSheet';
import PushedHeader from '../components/PushedHeader';
import EmptyState from '../components/EmptyState';
import type { AdminCategory } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminCategories'>;

const INDENT = 22;

export default function AdminCategoriesScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

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

  // Descendants of `id` — keeps a category from being nested under itself or one
  // of its own children (the server rejects it with 422 anyway).
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

  const rootCount = categories.filter((c) => c.parentId == null).length;

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
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar "${c.name}"? Los productos de esta categoría quedarán sin categoría asignada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(c) },
      ]
    );
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

  function renderRow(item: AdminCategory, idx: number) {
    return (
      <View
        key={item.id}
        style={[styles.row, idx > 0 && styles.rowDivided, { paddingLeft: item.depth * INDENT }]}
      >
        <View style={[styles.iconBox, item.hasChildren ? styles.iconFolder : styles.iconLeaf]}>
          <Ionicons
            name={item.hasChildren ? 'folder-outline' : 'pricetag-outline'}
            size={16}
            color={item.hasChildren ? '#8A6400' : 'rgba(22, 33, 58, 0.55)'}
          />
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, item.depth === 0 && styles.rowNameRoot]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowMeta}>
            {item.productsCount} {item.productsCount === 1 ? 'producto' : 'productos'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={styles.editBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar categoría ${item.name}`}
        >
          <Ionicons name="create-outline" size={15} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.deleteBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar categoría ${item.name}`}
        >
          <Ionicons name="trash-outline" size={15} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  const parentChips = [{ id: null as number | null, name: 'Ninguna (raíz)' }, ...parentOptions];

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Categorías"
        subtitle={`${categories.length} categorías · ${rootCount} raíz`}
        onBack={() => navigation.goBack()}
        addAction={{ label: 'Nueva', onPress: openCreate }}
      />

      <View style={styles.searchWrap}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar categoría..."
          bordered
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {categories.length === 0 ? (
            <EmptyState
              icon="folder-open-outline"
              title="Sin categorías"
              message="Crea la primera para organizar el catálogo."
            />
          ) : (
            <View style={styles.listCard}>{categories.map(renderRow)}</View>
          )}
        </ScrollView>
      )}

      {/* Create / edit form */}
      <BottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
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
              style={[styles.saveBtn, !name.trim() && styles.saveBtnOff]}
              onPress={save}
              disabled={!name.trim() || saving}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Text style={[styles.saveText, !name.trim() && styles.saveTextOff]}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
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
          placeholder="Ej. Polos"
          placeholderTextColor="rgba(22, 33, 58, 0.35)"
          autoFocus
        />

        <Text style={styles.fieldLabel}>Categoría padre</Text>
        <View style={styles.chips}>
          {parentChips.map((p) => {
            const active = parentId === p.id;
            return (
              <TouchableOpacity
                key={String(p.id)}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setParentId(p.id)}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>No puede anidarse bajo sí misma ni bajo sus descendientes.</Text>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchWrap: { backgroundColor: colors.surface, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E9EBF0' },
    scroll: { padding: 18, flexGrow: 1 },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    rowDivided: { borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    iconBox: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    iconFolder: { backgroundColor: '#FFF3CF' },
    iconLeaf: { backgroundColor: colors.fill },
    rowInfo: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 14.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
    rowNameRoot: { fontFamily: FONT_FAMILY.black },
    rowMeta: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    editBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: '#F3CFC6', backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center' },

    // ---- Sheet form ----
    fieldLabel: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      marginTop: 14,
      marginBottom: 7,
    },
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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { height: 38, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.65)' },
    chipTextActive: { color: '#fff' },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.45)', marginTop: 9 },
    sheetActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { height: 54, paddingHorizontal: 20, borderRadius: 17, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    saveBtn: { flex: 1, height: 54, borderRadius: 17, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    saveBtnOff: { backgroundColor: '#EDEFF3' },
    saveText: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    saveTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
