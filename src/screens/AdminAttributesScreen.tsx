import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import Field from '../components/Field';
import LoadingState from '../components/LoadingState';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import type { AdminAttribute } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminAttributes'>;

// A row in the editor. `id` present = an existing value (rename it by id);
// `id` null = a brand-new value (the diff-sync PUT will insert it).
type ValueDraft = { id: number | null; text: string; original: string };

export default function AdminAttributesScreen({ navigation }: Props) {
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
          <TouchableOpacity
            onPress={() => openEdit(item)}
            style={styles.rowBtn}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Editar atributo ${item.name}`}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            style={styles.rowBtn}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar atributo ${item.name}`}
          >
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
      <ScreenHeader
        title="Atributos"
        onBack={() => navigation.goBack()}
        action={{ icon: 'add', onPress: openCreate, label: 'Nuevo atributo' }}
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
            <EmptyState
              icon="options-outline"
              title="Sin atributos"
              message="Crea el primero (ej. Color, Talla) con el botón +."
            />
          }
        />
      )}

      {/* Create / edit form */}
      <BottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar atributo' : 'Nuevo atributo'}
        keyboardAware
      >
        {/* The value list can grow long, so this form scrolls inside the sheet. */}
        <ScrollView keyboardShouldPersistTaps="handled">
          <Field
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Ej. Color"
          />

          <Text style={styles.label}>Valores</Text>
          {values.map((v, i) => (
            <View key={`${v.id ?? 'new'}-${i}`} style={styles.valueRow}>
              <Field
                value={v.text}
                onChangeText={(t) => setValueText(i, t)}
                placeholder={`Valor ${i + 1}`}
                containerStyle={styles.valueInput}
              />
              <TouchableOpacity
                onPress={() => removeValueRow(i)}
                style={styles.rowBtn}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
                accessibilityLabel="Quitar este valor"
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addValueBtn}
            onPress={addValueRow}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addValueText}>Añadir valor</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            El orden define la posición. Quitar un valor en uso por alguna variación será rechazado
            por el servidor.
          </Text>

          <Button
            label={editing ? 'Guardar' : 'Crear'}
            onPress={save}
            loading={saving}
            disabled={!canSave}
            style={styles.saveBtn}
          />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: SPACING.xl, paddingTop: SPACING.xs, gap: SPACING.lg, flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: colors.border, padding: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  cardMeta: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.hairline },
  rowBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  valueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  valueChip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.badge,
  },
  valueChipText: { fontSize: FONT_SIZE.micro, fontWeight: FONT_WEIGHT.medium, color: colors.primary },
  label: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  // The row owns the vertical rhythm here, so the field must not add its own.
  valueInput: { flex: 1, marginBottom: 0 },
  addValueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 44,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    marginTop: SPACING.xs,
  },
  addValueText: { color: colors.primary, fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.bold },
  hint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.sm, lineHeight: 17 },
  saveBtn: { marginTop: SPACING['2xl'] },
});
