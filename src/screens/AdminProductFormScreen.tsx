import { useEffect, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createProduct, updateProduct, type ProductPayload } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import { fetchAdminTags } from '../api/admin/tags';
import { fetchAdminAttributes } from '../api/admin/attributes';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import type {
  AdminAttribute,
  AdminCategory,
  AdminProductStatus,
  AdminTag,
  ProductType,
} from '../types';
import type { AdminProductsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminProductsStackParamList, 'AdminProductForm'>;

const STATUSES: { value: AdminProductStatus; label: string; hint: string }[] = [
  { value: 'published', label: 'Publicado', hint: 'Visible para los vendedores' },
  { value: 'public', label: 'Público', hint: 'Visible, sin destacar' },
  { value: 'private', label: 'Privado', hint: 'Oculto en la app del vendedor' },
];

const TYPES: { value: ProductType; label: string; hint: string }[] = [
  { value: 'simple', label: 'Simple', hint: 'Un solo SKU y stock' },
  { value: 'variable', label: 'Variable', hint: 'Con variaciones (color, talla…)' },
];

export default function AdminProductFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const product = route.params?.product;
  const editing = !!product;

  const [code, setCode] = useState(product?.code ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [status, setStatus] = useState<AdminProductStatus>(product?.status ?? 'published');
  const [type, setType] = useState<ProductType>(product?.type ?? 'simple');
  const [categoryId, setCategoryId] = useState<number | null>(product?.category?.id ?? null);
  const [unitValue, setUnitValue] = useState(String(product?.unitValue ?? '1'));
  const [finalPrice, setFinalPrice] = useState(product ? String(product.finalPrice) : '');
  const [unitOfMeasure, setUnitOfMeasure] = useState(product?.unitOfMeasure ?? 'unit');
  const [tagIds, setTagIds] = useState<number[]>(product?.tags.map((t) => t.id) ?? []);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Which attributes a new variable product will use. The API doesn't persist
  // this on the product (it derives the set from the variations), so we carry
  // the choice straight into the first-variation form after creating.
  const [attributes, setAttributes] = useState<AdminAttribute[]>([]);
  const [attributeIds, setAttributeIds] = useState<number[]>([]);
  const [attributePickerOpen, setAttributePickerOpen] = useState(false);

  useEffect(() => {
    fetchAdminCategories()
      .then(setCategories)
      .catch(() => {});
    fetchAdminTags()
      .then(setTags)
      .catch(() => {});
    fetchAdminAttributes()
      .then(setAttributes)
      .catch(() => {});
  }, []);

  const categoryName =
    categoryId == null ? 'Sin categoría' : categories.find((c) => c.id === categoryId)?.name ?? '—';

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Concede acceso a tus fotos para elegir una imagen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }

  function toggleTag(id: number) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function toggleAttribute(id: number) {
    setAttributeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  // A new variable product needs at least one attribute — its variations are
  // combinations of them.
  const needsAttributes = !editing && type === 'variable';

  const price = parseFloat(finalPrice);
  const unit = parseFloat(unitValue);
  const canSubmit =
    code.trim().length > 0 &&
    name.trim().length > 0 &&
    unitOfMeasure.trim().length > 0 &&
    Number.isFinite(price) &&
    Number.isFinite(unit) &&
    (!needsAttributes || attributeIds.length > 0) &&
    !saving;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload: ProductPayload = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        shortDescription: shortDescription.trim() || null,
        status,
        type,
        categoryId,
        unitValue: unit,
        finalPrice: price,
        unitOfMeasure: unitOfMeasure.trim(),
        tagIds,
        // Only meaningful when creating a variable product; the API ignores it
        // on update and for simple products.
        attributeIds: needsAttributes ? attributeIds : undefined,
      };
      if (editing) {
        await updateProduct(product!.id, payload, imageUri ?? undefined);
        showToast('Producto actualizado', 'checkmark-circle');
        navigation.goBack();
        return;
      }

      const newId = await createProduct(payload, imageUri ?? undefined);
      showToast('Producto creado', 'checkmark-circle');

      // For a variable product, go straight to its first variation with the
      // chosen attributes pinned. The server already stored them on the
      // `product_attribute` pivot, so coming back later works too — the detail
      // screen reads them from GET /admin/products/{id}.
      if (needsAttributes && newId != null) {
        navigation.replace('AdminVariationForm', {
          productId: newId,
          productName: payload.name,
          attributeIds,
        });
        return;
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const currentImage = imageUri ?? product?.images.find((i) => i.isFeatured)?.url ?? null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Editar producto' : 'Nuevo producto'}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Featured image */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.85}>
          {currentImage ? (
            <Image source={{ uri: currentImage }} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={34} color={colors.textSecondary} />
              <Text style={styles.imageHint}>Imagen destacada</Text>
            </View>
          )}
          <View style={styles.imageBadge}>
            <Ionicons name="camera-outline" size={16} color={colors.textOnPrimary} />
          </View>
        </TouchableOpacity>
        {editing && (
          <Text style={styles.hint}>
            Elegir una nueva imagen reemplaza la destacada actual. Gestiona la galería completa desde
            el detalle del producto.
          </Text>
        )}

        <Text style={styles.label}>Código</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Ej. POL-001"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej. Polo básico"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Descripción corta</Text>
        <TextInput
          style={styles.input}
          value={shortDescription}
          onChangeText={setShortDescription}
          placeholder="Resumen breve"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Detalle del producto"
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
        />

        {/* Type — immutable once created (variations depend on it). */}
        {!editing && (
          <>
            <Text style={styles.label}>Tipo</Text>
            {TYPES.map((t) => (
              <OptionCard
                key={t.value}
                label={t.label}
                hint={t.hint}
                active={type === t.value}
                onPress={() => setType(t.value)}
              />
            ))}
          </>
        )}

        {/* Attributes — only a new variable product picks its own set. */}
        {needsAttributes && (
          <>
            <Text style={styles.label}>Atributos del producto</Text>
            <TouchableOpacity style={styles.select} onPress={() => setAttributePickerOpen(true)}>
              <Text
                style={[styles.selectText, attributeIds.length === 0 && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {attributeIds.length === 0
                  ? 'Selecciona los atributos'
                  : attributes
                      .filter((a) => attributeIds.includes(a.id))
                      .map((a) => a.name)
                      .join(' · ')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.hint}>
              Cada variación tendrá un valor por cada atributo elegido. Al guardar pasarás a crear la
              primera variación.
            </Text>
          </>
        )}

        <Text style={styles.label}>Estado</Text>
        {STATUSES.map((s) => (
          <OptionCard
            key={s.value}
            label={s.label}
            hint={s.hint}
            active={status === s.value}
            onPress={() => setStatus(s.value)}
          />
        ))}

        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity style={styles.select} onPress={() => setCategoryPickerOpen(true)}>
          <Text
            style={[styles.selectText, categoryId == null && styles.selectPlaceholder]}
            numberOfLines={1}
          >
            {categoryName}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.label}>Etiquetas</Text>
        <TouchableOpacity style={styles.select} onPress={() => setTagPickerOpen(true)}>
          <Text
            style={[styles.selectText, tagIds.length === 0 && styles.selectPlaceholder]}
            numberOfLines={1}
          >
            {tagIds.length === 0
              ? 'Ninguna'
              : `${tagIds.length} ${tagIds.length === 1 ? 'etiqueta' : 'etiquetas'}`}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.label}>
          Precio final {type === 'variable' && <Text style={styles.optional}>(precio base)</Text>}
        </Text>
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

        <Text style={styles.label}>Unidad de medida</Text>
        <TextInput
          style={styles.input}
          value={unitOfMeasure}
          onChangeText={setUnitOfMeasure}
          placeholder="unit"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />

        {!editing && (
          <Text style={styles.hint}>
            Se creará con stock 0 en todas las sucursales.
            {type === 'variable' ? ' Luego agrega sus variaciones desde el detalle.' : ''}
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
            <Text style={styles.saveText}>{editing ? 'Guardar cambios' : 'Crear producto'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category picker */}
      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Categoría</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.pickerRow}
                activeOpacity={0.7}
                onPress={() => {
                  setCategoryId(null);
                  setCategoryPickerOpen(false);
                }}
              >
                <Text style={[styles.pickerLabel, categoryId == null && styles.pickerLabelActive]}>
                  Sin categoría
                </Text>
                {categoryId == null && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerRow, { paddingLeft: 4 + c.depth * 18 }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCategoryId(c.id);
                    setCategoryPickerOpen(false);
                  }}
                >
                  <Text
                    style={[styles.pickerLabel, categoryId === c.id && styles.pickerLabelActive]}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                  {categoryId === c.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tag multi-select */}
      <Modal
        visible={tagPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTagPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTagPickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Etiquetas</Text>
            <ScrollView>
              {tags.length === 0 ? (
                <Text style={styles.hint}>No hay etiquetas. Créalas en Gestión → Etiquetas.</Text>
              ) : (
                tags.map((t) => {
                  const active = tagIds.includes(t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.pickerRow}
                      activeOpacity={0.7}
                      onPress={() => toggleTag(t.id)}
                    >
                      <Ionicons
                        name={active ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={active ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]}>
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setTagPickerOpen(false)}>
              <Text style={styles.saveText}>Listo</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Attribute multi-select */}
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
              {attributes.length === 0 ? (
                <Text style={styles.hint}>No hay atributos. Créalos en Gestión → Atributos.</Text>
              ) : (
                attributes.map((a) => {
                  const active = attributeIds.includes(a.id);
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
                        <Text style={styles.optionHint} numberOfLines={1}>
                          {a.values.map((v) => v.value).join(', ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
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

function OptionCard({
  label,
  hint,
  active,
  onPress,
}: {
  label: string;
  hint: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, active && styles.optionCardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={active ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={active ? colors.primary : colors.textSecondary}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{label}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
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
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  imagePicker: { alignSelf: 'center', width: 150, height: 150, borderRadius: 18 },
  imagePreview: { width: 150, height: 150, borderRadius: 18 },
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
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 18, marginBottom: 6 },
  optional: { fontWeight: '400', color: colors.textSecondary, fontSize: 12 },
  input: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textArea: { height: 100, paddingTop: 14 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  optionCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  optionLabelActive: { color: colors.primary },
  optionHint: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
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
  selectPlaceholder: { color: colors.textSecondary },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 10, lineHeight: 17 },
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
  doneBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
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
});
