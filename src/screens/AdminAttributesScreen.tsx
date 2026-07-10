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
  createAttribute,
  deleteAttribute,
  fetchAdminAttributes,
  renameAttributeValue,
  updateAttribute,
} from '../api/admin/attributes';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import type { AdminAttribute } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminAttributes'>;

// A row in the editor. `id` present = an existing value (rename it by id);
// `id` null = a brand-new value (the diff-sync PUT will insert it).
type ValueDraft = { id: number | null; text: string; original: string };

export default function AdminAttributesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAttribute | null>(null);
  const [name, setName] = useState('');
  const [values, setValues] = useState<ValueDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setAttributes(await fetchAdminAttributes());
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los atributos.');
      setAttributes([]);
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
    setValues([{ id: null, text: '', original: '' }]);
    setFormOpen(true);
  }

  function openEdit(a: AdminAttribute) {
    setEditing(a);
    setName(a.name);
    setValues(a.values.map((v) => ({ id: v.id, text: v.value, original: v.value })));
    setFormOpen(true);
  }

  function setValueText(index: number, text: string) {
    setValues((prev) => prev.map((v, i) => (i === index ? { ...v, text } : v)));
  }

  function addValueRow() {
    setValues((prev) => [...prev, { id: null, text: '', original: '' }]);
  }

  function removeValueRow(index: number) {
    setValues((prev) => prev.filter((_, i) => i !== index));
  }

  const cleanValues = values.map((v) => ({ ...v, text: v.text.trim() })).filter((v) => v.text);
  const canSave = name.trim().length > 0 && cleanValues.length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (!editing) {
        await createAttribute(name.trim(), cleanValues.map((v) => v.text));
        showToast('Atributo creado', 'checkmark-circle');
      } else {
        // Order matters. The PUT diff-syncs values BY STRING, so a renamed value
        // would read as "old removed + new added" and lose its id (breaking the
        // variations that point at it). Rename existing values by id FIRST, then
        // send the post-rename array so the diff sees them as unchanged.
        const renamed = cleanValues.filter((v) => v.id != null && v.text !== v.original);
        for (const v of renamed) {
          await renameAttributeValue(editing.id, v.id!, v.text);
        }
        await updateAttribute(editing.id, name.trim(), cleanValues.map((v) => v.text));
        showToast('Atributo actualizado', 'checkmark-circle');
      }
      setFormOpen(false);
      load();
    } catch (e: any) {
      // A removed value that's still used by a variation comes back as 422.
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(a: AdminAttribute) {
    Alert.alert(
      'Eliminar atributo',
      `¿Eliminar "${a.name}"? Se borrarán también sus ${a.values.length} valores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(a) },
      ]
    );
  }

  async function doDelete(a: AdminAttribute) {
    try {
      await deleteAttribute(a.id);
      showToast('Atributo eliminado', 'checkmark-circle');
      load();
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminAttribute }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.values.length} {item.values.length === 1 ? 'valor' : 'valores'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8} style={styles.rowBtn}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={styles.rowBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        {item.values.length > 0 && (
          <View style={styles.valueChips}>
            {item.values.map((v) => (
              <View key={v.id} style={styles.valueChip}>
                <Text style={styles.valueChipText}>{v.value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Atributos</Text>
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
          data={attributes}
          keyExtractor={(a) => String(a.id)}
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
            <View style={styles.center}>
              <Ionicons name="options-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>Sin atributos</Text>
              <Text style={styles.muted}>Crea el primero (ej. Color, Talla) con el botón +.</Text>
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
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editing ? 'Editar atributo' : 'Nuevo atributo'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Color"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>Valores</Text>
              {values.map((v, i) => (
                <View key={`${v.id ?? 'new'}-${i}`} style={styles.valueRow}>
                  <TextInput
                    style={[styles.input, styles.valueInput]}
                    value={v.text}
                    onChangeText={(t) => setValueText(i, t)}
                    placeholder={`Valor ${i + 1}`}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity onPress={() => removeValueRow(i)} hitSlop={8} style={styles.rowBtn}>
                    <Ionicons name="close-circle-outline" size={22} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addValueBtn} onPress={addValueRow} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.addValueText}>Añadir valor</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>
                El orden define la posición. Quitar un valor en uso por alguna variación será
                rechazado por el servidor.
              </Text>

              <TouchableOpacity
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={save}
                disabled={!canSave}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.saveText}>{editing ? 'Guardar' : 'Crear'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  list: { padding: 20, gap: 14, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  rowBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  valueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  valueChip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  valueChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
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
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  valueInput: { flex: 1 },
  addValueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    marginTop: 4,
  },
  addValueText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 14, lineHeight: 17 },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  saveBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.6 },
  saveText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
