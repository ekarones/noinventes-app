import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createVariation, updateVariation } from '../api/admin/products';
import { fetchAdminAttributes } from '../api/admin/attributes';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import { buildVariationCode } from '../utils/slug';
import { pickImages } from '../utils/imagePicker';
import type { AdminAttribute } from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminVariationForm'>;

export default function AdminVariationFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    productId,
    productName,
    productCode,
    productUnitValue,
    productFinalPrice,
    variation,
    attributeIds,
  } = route.params;
  const editing = !!variation;

  const [code, setCode] = useState(variation?.code ?? '');
  // Once the admin edits the code by hand, stop auto-generating it (only when
  // creating; on edit the code stands on its own from the start).
  const [codeTouched, setCodeTouched] = useState(editing);
  // On create, inherit the parent's unit value / price as editable defaults.
  const [unitValue, setUnitValue] = useState(
    editing ? String(variation!.unitValue) : productUnitValue != null ? String(productUnitValue) : '1'
  );
  const [finalPrice, setFinalPrice] = useState(
    editing ? String(variation!.finalPrice) : productFinalPrice != null ? String(productFinalPrice) : ''
  );

  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [loadingAttrs, setLoadingAttrs] = useState(!editing);
  // attributeId → selected value id
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [picker, setPicker] = useState<AdminAttribute | null>(null);
  const [saving, setSaving] = useState(false);

  // Used only when the product has no variations yet and none were pre-chosen:
  // the admin picks which attributes this product will use.
  const [chosenIds, setChosenIds] = useState<number[]>([]);
  const [attributePickerOpen, setAttributePickerOpen] = useState(false);

  // Newly-picked reference image (local URI). Null means "no new pick": on edit
  // the existing remote image is shown instead. Only sent to the server when set.
  const [imageUri, setImageUri] = useState<string | null>(null);
  const previewUri = imageUri ?? variation?.imageUrl ?? null;

  async function pickImage() {
    const [uri] = await pickImages();
    if (uri) setImageUri(uri);
  }

  // Attributes are only needed when creating (the combo is immutable on edit).
  useEffect(() => {
    if (editing) return;
    fetchAdminAttributes()
      .then(setAttributes)
      .catch(() => {})
      .finally(() => setLoadingAttrs(false));
  }, [editing]);

  // The product's existing variations pin the attribute set: a new variation must
  // supply exactly one value per attribute already in use. If the product has no
  // variations yet, this first one establishes the set, so any attributes go.
  const requiredAttributes = useMemo(() => {
    if (!attributeIds || attributeIds.length === 0) return null;
    const wanted = new Set(attributeIds);
    return attributes.filter((a) => wanted.has(a.id));
  }, [attributes, attributeIds]);

  // Either the set is pinned by the product, or the admin picks it here.
  const pickable = requiredAttributes ?? attributes.filter((a) => chosenIds.includes(a.id));

  // Every attribute in play needs exactly one value.
  const comboReady = pickable.length > 0 && pickable.every((a) => selection[a.id] != null);

  // Selected value ids, in attribute order — the same order used both for the
  // POST payload and the auto-generated code, so the two always agree.
  const orderedValueIds = pickable.map((a) => selection[a.id]).filter((id) => id != null);

  // Auto-generate the code from the product code + chosen value slugs, the same
  // way the server does (Str::slug). Runs while creating and until the admin
  // types their own code. Needs productCode from the caller.
  useEffect(() => {
    if (codeTouched || !productCode) return;
    const values = pickable
      .map((a) => a.values.find((v) => v.id === selection[a.id])?.value)
      .filter((v): v is string => !!v);
    setCode(buildVariationCode(productCode, values));
  }, [codeTouched, productCode, pickable, selection]);

  function toggleAttribute(id: number) {
    setChosenIds((prev) => {
      if (!prev.includes(id)) return [...prev, id];
      // Dropping an attribute must drop its value too, or it'd be sent anyway.
      setSelection((sel) => {
        const next = { ...sel };
        delete next[id];
        return next;
      });
      return prev.filter((a) => a !== id);
    });
  }

  const price = parseFloat(finalPrice);
  const unit = parseFloat(unitValue);
  const canSubmit =
    code.trim().length > 0 &&
    Number.isFinite(price) &&
    Number.isFinite(unit) &&
    (editing || comboReady) &&
    !saving;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (editing) {
        await updateVariation(
          variation!.id,
          {
            code: code.trim(),
            unitValue: unit,
            finalPrice: price,
          },
          imageUri ?? undefined
        );
        showToast('Variación actualizada', 'checkmark-circle');
      } else {
        await createVariation(
          productId,
          {
            code: code.trim(),
            unitValue: unit,
            finalPrice: price,
            attributeValueIds: orderedValueIds,
          },
          imageUri ?? undefined
        );
        showToast('Variación creada', 'checkmark-circle');
      }
      navigation.goBack();
    } catch (e: any) {
      // 422 covers: not a variable product, wrong attribute set, duplicate combo,
      // duplicate code. The server message says which.
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const comboLabel = variation?.attributeValues.map((a) => a.value).join(' · ');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Editar variación' : 'Nueva variación'}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.productName}>{productName}</Text>
        {editing && !!comboLabel && <Text style={styles.productSub}>{comboLabel}</Text>}

        {/* Reference image — same look as the product form. On edit it preloads
            the existing photo; the ✕ only undoes a fresh pick. */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.85}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={34} color={colors.textSecondary} />
              <Text style={styles.imageHint}>Imagen de referencia</Text>
            </View>
          )}
          {imageUri && (
            <TouchableOpacity
              style={styles.imageRemove}
              onPress={() => setImageUri(null)}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </TouchableOpacity>
          )}
          <View style={styles.imageBadge}>
            <Ionicons name="camera-outline" size={16} color={colors.textOnPrimary} />
          </View>
        </TouchableOpacity>

        {/* Attribute combo — only when creating */}
        {!editing && (
          <>
            <Text style={styles.label}>Combinación</Text>
            {loadingAttrs ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : attributes.length === 0 ? (
              <Text style={styles.warn}>
                No hay atributos creados. Créalos primero en Gestión → Atributos.
              </Text>
            ) : (
              <>
                {/* No pinned set → the admin chooses which attributes apply. */}
                {!requiredAttributes && (
                  <View style={styles.attrRow}>
                    <Text style={styles.attrName}>Atributos de este producto</Text>
                    <TouchableOpacity
                      style={[styles.select, chosenIds.length > 0 && styles.selectActive]}
                      onPress={() => setAttributePickerOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.selectText, chosenIds.length === 0 && styles.selectPlaceholder]}
                        numberOfLines={1}
                      >
                        {chosenIds.length === 0
                          ? 'Selecciona los atributos'
                          : pickable.map((a) => a.name).join(' · ')}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {pickable.map((a) => {
                  const chosen = a.values.find((v) => v.id === selection[a.id]);
                  return (
                    <View key={a.id} style={styles.attrRow}>
                      <Text style={styles.attrName}>{a.name}</Text>
                      <TouchableOpacity
                        style={[styles.select, chosen && styles.selectActive]}
                        onPress={() => setPicker(a)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.selectText, !chosen && styles.selectPlaceholder]}
                          numberOfLines={1}
                        >
                          {chosen?.value ?? 'Selecciona'}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <Text style={styles.hint}>
                  {requiredAttributes
                    ? 'Debes elegir un valor por cada atributo del producto.'
                    : 'Esta primera variación fija los atributos del producto. Elige un valor por cada uno.'}
                </Text>
              </>
            )}
          </>
        )}

        <Text style={styles.label}>Código</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(t) => {
            setCodeTouched(true);
            setCode(t);
          }}
          placeholder="Ej. POL-001-RJ-M"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {!editing && !codeTouched && productCode && (
          <Text style={styles.hint}>Se genera solo a partir del producto y los valores. Puedes editarlo.</Text>
        )}

        <Text style={styles.label}>Precio final</Text>
        <TextInput
          style={styles.input}
          value={finalPrice}
          onChangeText={setFinalPrice}
          placeholder="39.90"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Valor unitario</Text>
        <TextInput
          style={styles.input}
          value={unitValue}
          onChangeText={setUnitValue}
          placeholder="1"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
        />

        {!editing && (
          <Text style={styles.hint}>
            La variación se crea con stock 0. Podrás asignarlo desde el detalle del producto.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
          onPress={save}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.saveText}>{editing ? 'Guardar cambios' : 'Crear variación'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Attribute value picker */}
      <Modal
        visible={picker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPicker(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{picker?.name}</Text>
            <ScrollView>
              {picker?.values.map((v) => {
                const active = selection[picker.id] === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.pickerRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelection((prev) => ({ ...prev, [picker.id]: v.id }));
                      setPicker(null);
                    }}
                  >
                    <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]}>
                      {v.value}
                    </Text>
                    {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Attribute multi-select (only when the set isn't pinned yet) */}
      <Modal
        visible={attributePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAttributePickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAttributePickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Atributos del producto</Text>
            <ScrollView>
              {attributes.map((a) => {
                const active = chosenIds.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={styles.pickerRow}
                    activeOpacity={0.7}
                    onPress={() => toggleAttribute(a.id)}
                  >
                    <Ionicons
                      name={active ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]}>
                        {a.name}
                      </Text>
                      <Text style={styles.attrValues} numberOfLines={1}>
                        {a.values.map((v) => v.value).join(', ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setAttributePickerOpen(false)}>
              <Text style={styles.saveText}>Listo</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  productName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  productSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 18, marginBottom: 6 },
  input: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: colors.textPrimary,
  },
  imagePicker: { alignSelf: 'center', width: 150, height: 150, borderRadius: 18, marginTop: 16 },
  imagePreview: { width: 150, height: 150, borderRadius: 18 },
  imageBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  imageRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  imageHint: { fontSize: 12, color: colors.textSecondary },
  attrRow: { marginBottom: 10 },
  attrName: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectActive: { borderColor: colors.primary },
  selectText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  selectPlaceholder: { color: colors.textSecondary },
  warn: { fontSize: 14, color: colors.warning, lineHeight: 20 },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 17 },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.6 },
  saveText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
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
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  pickerLabel: { flex: 1, fontSize: 16, color: colors.textPrimary },
  pickerLabelActive: { fontWeight: '700', color: colors.primary },
  attrValues: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  doneBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
});
