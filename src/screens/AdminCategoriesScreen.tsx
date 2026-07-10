import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
} from '../api/admin/categories';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import type { AdminCategory } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminCategories'>;

const INDENT = 18;

export default function AdminCategoriesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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
      <View style={[styles.row, { paddingLeft: 14 + item.depth * INDENT }]}>
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
        <Text style={styles.headerTitle}>Categorías</Text>
        <TouchableOpacity onPress={openCreate} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar categoría..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
            <View style={styles.center}>
              <Ionicons name="folder-open-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>Sin categorías</Text>
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
            <Text style={styles.sheetTitle}>
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Polos"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />

            <Text style={styles.label}>Categoría padre</Text>
            <TouchableOpacity style={styles.select} onPress={() => setParentPickerOpen(true)}>
              <Text style={styles.selectText} numberOfLines={1}>
                {parentName}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

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

      {/* Parent picker */}
      <Modal
        visible={parentPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setParentPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setParentPickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Categoría padre</Text>
            <ScrollView>
              <PickerRow
                label="Ninguna (raíz)"
                active={parentId == null}
                depth={0}
                onPress={() => {
                  setParentId(null);
                  setParentPickerOpen(false);
                }}
              />
              {parentOptions.map((c) => (
                <PickerRow
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PickerRow({
  label,
  depth,
  active,
  onPress,
}: {
  label: string;
  depth: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pickerRow, { paddingLeft: 4 + depth * INDENT }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
    </TouchableOpacity>
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
  searchWrap: { paddingHorizontal: 20, paddingBottom: 10 },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingRight: 4 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
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
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  selectText: { flex: 1, fontSize: 16, color: colors.textPrimary },
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingRight: 4,
  },
  pickerLabel: { flex: 1, fontSize: 16, color: colors.textPrimary },
  pickerLabelActive: { fontWeight: '700', color: colors.primary },
});
