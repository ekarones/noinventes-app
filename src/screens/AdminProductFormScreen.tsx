import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createProduct, updateProduct, type ProductPayload } from '../api/admin/products';
import { fetchAdminCategories } from '../api/admin/categories';
import { fetchAdminTags } from '../api/admin/tags';
import { fetchAdminAttributes } from '../api/admin/attributes';
import { pickImages } from '../utils/imagePicker';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY } from '../theme/tokens';
import Field from '../components/Field';
import ScreenHeader from '../components/ScreenHeader';
import { useToast } from '../context/ToastContext';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import Button from '../components/Button';
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
    const [uri] = await pickImages();
    if (uri) setImageUri(uri);
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
          productCode: payload.code,
          productUnitValue: payload.unitValue,
          productFinalPrice: payload.finalPrice,
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

  // A newly-picked local file, else the existing featured image. The preview is
  // only 150px, so use the thumbnail rather than the full-size original.
  const currentImage = imageUri ?? product?.images.find((i) => i.isFeatured)?.thumbUrl ?? null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Featured image */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={ROW_PRESS_OPACITY}>
          {currentImage ? (
            <Image
              source={currentImage}
              style={styles.imagePreview}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
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

        <Field
          label="Código"
          value={code}
          onChangeText={setCode}
          placeholder="Ej. POL-001"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Polo básico"
        />

        <Field
          label="Descripción corta"
          value={shortDescription}
          onChangeText={setShortDescription}
          placeholder="Resumen breve"
        />

        <Field
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Detalle del producto"
          multiline
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
            <TouchableOpacity style={styles.select} onPress={() => setAttributePickerOpen(true)} activeOpacity={ROW_PRESS_OPACITY}>
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
        <TouchableOpacity style={styles.select} onPress={() => setCategoryPickerOpen(true)} activeOpacity={ROW_PRESS_OPACITY}>
          <Text
            style={[styles.selectText, categoryId == null && styles.selectPlaceholder]}
            numberOfLines={1}
          >
            {categoryName}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.label}>Etiquetas</Text>
        <TouchableOpacity style={styles.select} onPress={() => setTagPickerOpen(true)} activeOpacity={ROW_PRESS_OPACITY}>
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
        <Field
          value={finalPrice}
          onChangeText={setFinalPrice}
          placeholder="39.90"
          keyboardType="decimal-pad"
        />

        <Field
          label="Valor unitario"
          value={unitValue}
          onChangeText={setUnitValue}
          placeholder="1"
          keyboardType="decimal-pad"
        />

        <Field
          label="Unidad de medida"
          value={unitOfMeasure}
          onChangeText={setUnitOfMeasure}
          placeholder="unit"
          autoCapitalize="none"
        />

        {!editing && (
          <Text style={styles.hint}>
            Se creará con stock 0 en todas las sucursales.
            {type === 'variable' ? ' Luego agrega sus variaciones desde el detalle.' : ''}
          </Text>
        )}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear producto'}
          onPress={save}
          loading={saving}
          disabled={!canSubmit}
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Category picker */}
      <BottomSheet
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        title="Categoría"
        scrollable
      >
        <SheetOption
          label="Sin categoría"
          active={categoryId == null}
          onPress={() => {
            setCategoryId(null);
            setCategoryPickerOpen(false);
          }}
        />
        {categories.map((c) => (
          <SheetOption
            key={c.id}
            label={c.name}
            depth={c.depth}
            active={categoryId === c.id}
            onPress={() => {
              setCategoryId(c.id);
              setCategoryPickerOpen(false);
            }}
          />
        ))}
      </BottomSheet>

      {/* Tag multi-select */}
      <BottomSheet
        visible={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        title="Etiquetas"
        scrollable
        footer={
          <Button
            label="Listo"
            size="md"
            onPress={() => setTagPickerOpen(false)}
            style={styles.doneBtn}
          />
        }
      >
        {tags.length === 0 ? (
          <Text style={styles.hint}>No hay etiquetas. Créalas en Gestión → Etiquetas.</Text>
        ) : (
          tags.map((t) => (
            <SheetOption
              key={t.id}
              label={t.name}
              multi
              active={tagIds.includes(t.id)}
              onPress={() => toggleTag(t.id)}
            />
          ))
        )}
      </BottomSheet>

      {/* Attribute multi-select */}
      <BottomSheet
        visible={attributePickerOpen}
        onClose={() => setAttributePickerOpen(false)}
        title="Atributos del producto"
        scrollable
        footer={
          <Button
            label="Listo"
            size="md"
            onPress={() => setAttributePickerOpen(false)}
            style={styles.doneBtn}
          />
        }
      >
        {attributes.length === 0 ? (
          <Text style={styles.hint}>No hay atributos. Créalos en Gestión → Atributos.</Text>
        ) : (
          attributes.map((a) => (
            <SheetOption
              key={a.id}
              label={a.name}
              hint={a.values.map((v) => v.value).join(', ')}
              multi
              active={attributeIds.includes(a.id)}
              onPress={() => toggleAttribute(a.id)}
            />
          ))
        )}
      </BottomSheet>
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
      activeOpacity={ROW_PRESS_OPACITY}
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
  imageHint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary },
  imageBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  label: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, marginTop: 18, marginBottom: 6 },
  optional: { fontWeight: FONT_WEIGHT.regular, color: colors.textSecondary, fontSize: FONT_SIZE.micro },
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
  optionLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  optionLabelActive: { color: colors.primary },
  optionHint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: 1 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  selectText: { flex: 1, fontSize: FONT_SIZE.subheading, color: colors.textPrimary },
  selectPlaceholder: { color: colors.textSecondary },
  hint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: 10, lineHeight: 17 },
  saveBtn: { marginTop: 28 },
  doneBtn: { marginTop: 10 },
});
