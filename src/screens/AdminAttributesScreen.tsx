import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
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
  createAttribute,
  deleteAttribute,
  fetchAdminAttributes,
  renameAttributeValue,
  updateAttribute,
} from '../api/admin/attributes';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import LoadingState from '../components/LoadingState';
import BottomSheet from '../components/BottomSheet';
import PushedHeader from '../components/PushedHeader';
import EmptyState from '../components/EmptyState';
import type { AdminAttribute } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminAttributes'>;

// A row in the editor. `id` present = an existing value (rename it by id);
// `id` null = a brand-new value (the diff-sync PUT will insert it).
type ValueDraft = { id: number | null; text: string; original: string };

export default function AdminAttributesScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

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
          <View style={styles.cardTexts}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.values.length} {item.values.length === 1 ? 'valor' : 'valores'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openEdit(item)}
            style={styles.editBtn}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Editar atributo ${item.name}`}
          >
            <Ionicons name="create-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            style={styles.deleteBtn}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar atributo ${item.name}`}
          >
            <Ionicons name="trash-outline" size={15} color={colors.error} />
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
      <PushedHeader
        title="Atributos"
        subtitle="Base de las variaciones"
        onBack={() => navigation.goBack()}
        addAction={{ label: 'Nuevo', onPress: openCreate }}
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
                {saving ? 'Guardando…' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      >
        {/* The value list can grow long, so this form scrolls inside the sheet. */}
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej. Color"
            placeholderTextColor="rgba(22, 33, 58, 0.35)"
          />

          <View style={styles.valuesHeader}>
            <Text style={styles.fieldLabelInline}>Valores</Text>
            <Text style={styles.valuesHint}>El orden define la posición</Text>
          </View>
          {values.map((v, i) => (
            <View key={`${v.id ?? 'new'}-${i}`} style={styles.valueRow}>
              <Text style={styles.valuePos}>{i + 1}</Text>
              <TextInput
                style={styles.valueInput}
                value={v.text}
                onChangeText={(t) => setValueText(i, t)}
                placeholder="Valor"
                placeholderTextColor="rgba(22, 33, 58, 0.35)"
              />
              <TouchableOpacity
                onPress={() => removeValueRow(i)}
                style={styles.valueRemove}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
                accessibilityLabel="Quitar este valor"
              >
                <Ionicons name="close" size={13} color="rgba(22, 33, 58, 0.6)" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addValueBtn}
            onPress={addValueRow}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Text style={styles.addValueText}>+ Añadir valor</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Renombrar mantiene el vínculo con las variaciones. Quitar un valor en uso será rechazado
            por el servidor.
          </Text>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 18, gap: 12, flexGrow: 1 },

    // ---- Attribute card ----
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 11,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTexts: { flex: 1, minWidth: 0 },
    cardName: { fontSize: 16.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    cardMeta: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    editBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderColor: '#F3CFC6', backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center' },
    valueChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    valueChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 11, backgroundColor: colors.fill },
    valueChipText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.7)' },

    // ---- Sheet form ----
    fieldLabel: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
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
    valuesHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 16, marginBottom: 9 },
    fieldLabelInline: { fontSize: 12, fontFamily: FONT_FAMILY.black, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(22, 33, 58, 0.45)' },
    valuesHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.45)' },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      height: 50,
      paddingLeft: 14,
      paddingRight: 6,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
    },
    valuePos: { fontSize: 12, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.35)' },
    valueInput: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, padding: 0 },
    valueRemove: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
    addValueBtn: {
      height: 48,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: '#C9CFDB',
      borderStyle: 'dashed',
      backgroundColor: '#FAFBFC',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    addValueText: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: colors.primary },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.45)', marginTop: 10, lineHeight: 16 },
    sheetActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { height: 54, paddingHorizontal: 20, borderRadius: 17, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    saveBtn: { flex: 1, height: 54, borderRadius: 17, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    saveBtnOff: { backgroundColor: '#EDEFF3' },
    saveText: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    saveTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
