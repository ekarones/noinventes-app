import { useCallback, useState } from 'react';
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
import { createTag, deleteTag, fetchAdminTags, updateTag } from '../api/admin/tags';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import LoadingState from '../components/LoadingState';
import BottomSheet from '../components/BottomSheet';
import PushedHeader from '../components/PushedHeader';
import EmptyState from '../components/EmptyState';
import type { AdminTag } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminTags'>;

export default function AdminTagsScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

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

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTag(editing.id, name.trim());
        showToast('Etiqueta actualizada', 'checkmark-circle');
      } else {
        await createTag(name.trim());
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
        ? `Se quitará de ${t.productsCount} ${t.productsCount === 1 ? 'producto' : 'productos'} (no se eliminan).`
        : 'No la usa ningún producto.';
    Alert.alert('Eliminar etiqueta', `¿Eliminar "${t.name}"? ${warn}`, [
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

  function renderRow(item: AdminTag, index: number) {
    return (
      <View key={item.id} style={[styles.row, index > 0 && styles.rowDivided]}>
        <View style={styles.iconBox}>
          <Ionicons name="pricetag-outline" size={16} color="#8A6400" />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowMeta}>
            {item.productsCount > 0
              ? `${item.productsCount} ${item.productsCount === 1 ? 'producto' : 'productos'}`
              : 'Sin productos'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={styles.editBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar etiqueta ${item.name}`}
        >
          <Ionicons name="create-outline" size={15} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.deleteBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar etiqueta ${item.name}`}
        >
          <Ionicons name="trash-outline" size={15} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Etiquetas"
        subtitle={`${tags.length} ${tags.length === 1 ? 'etiqueta' : 'etiquetas'}`}
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {tags.length === 0 ? (
            <EmptyState
              icon="pricetags-outline"
              title="Sin etiquetas"
              message="Crea la primera para agrupar productos."
            />
          ) : (
            <View style={styles.listCard}>{tags.map(renderRow)}</View>
          )}
        </ScrollView>
      )}

      {/* Create / rename form */}
      <BottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar etiqueta' : 'Nueva etiqueta'}
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
                {saving ? 'Guardando…' : editing ? 'Guardar' : 'Crear etiqueta'}
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
          placeholder="Ej. Novedad"
          placeholderTextColor="rgba(22, 33, 58, 0.35)"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </BottomSheet>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
    rowDivided: { borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    iconBox: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF3CF', alignItems: 'center', justifyContent: 'center' },
    rowInfo: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    rowMeta: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
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
    sheetActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { height: 54, paddingHorizontal: 20, borderRadius: 17, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    saveBtn: { flex: 1, height: 54, borderRadius: 17, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    saveBtnOff: { backgroundColor: '#EDEFF3' },
    saveText: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    saveTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
