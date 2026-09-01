import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createSupplier, updateSupplier, type SupplierPayload } from '../api/admin/suppliers';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PushedHeader from '../components/PushedHeader';
import { useToast } from '../context/ToastContext';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminSupplierForm'>;

const RUC_RE = /^\d{11}$/;

export default function AdminSupplierFormScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const editing = route.params?.supplier;

  const [ruc, setRuc] = useState(editing?.ruc ?? '');
  const [razonSocial, setRazonSocial] = useState(editing?.razonSocial ?? '');
  const [nombreComercial, setNombreComercial] = useState(editing?.nombreComercial ?? '');
  const [contactName, setContactName] = useState(editing?.contactName ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const rucValid = RUC_RE.test(ruc.trim());
  const canSubmit = rucValid && razonSocial.trim().length > 0 && !saving;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload: SupplierPayload = {
        ruc: ruc.trim(),
        razonSocial: razonSocial.trim(),
        nombreComercial: nombreComercial.trim() || null,
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        isActive,
      };
      if (editing) {
        await updateSupplier(editing.id, payload);
        showToast('Proveedor actualizado', 'checkmark-circle');
      } else {
        await createSupplier(payload);
        showToast('Proveedor creado', 'checkmark-circle');
      }
      navigation.goBack();
    } catch (e: any) {
      // 422: RUC mal formado o ya existe en este tenant.
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PushedHeader
        title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Identificación */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identificación</Text>
          <View>
            <View style={styles.labelRow}>
              <Text style={styles.label}>RUC</Text>
              <Text style={[styles.counter, rucValid ? styles.counterOk : styles.counterBad]}>
                {rucValid ? '11 dígitos ✓' : `${ruc.trim().length}/11`}
              </Text>
            </View>
            <TextInput
              style={[styles.rucInput, ruc.length > 0 && !rucValid && styles.inputError]}
              value={ruc}
              onChangeText={(t) => setRuc(t.replace(/\D/g, '').slice(0, 11))}
              placeholder="20123456789"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              keyboardType="number-pad"
              maxLength={11}
            />
          </View>
          <View>
            <Text style={styles.label}>Razón social</Text>
            <TextInput
              style={styles.input}
              value={razonSocial}
              onChangeText={setRazonSocial}
              placeholder="Distribuidora S.A.C."
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              autoCapitalize="characters"
            />
          </View>
          <View>
            <Text style={styles.label}>Nombre comercial (opcional)</Text>
            <TextInput
              style={styles.input}
              value={nombreComercial}
              onChangeText={setNombreComercial}
              placeholder="Distri"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
            />
            <Text style={styles.hint}>Si lo dejas vacío se usa la razón social.</Text>
          </View>
        </View>

        {/* Contacto */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.cardTitle}>Contacto</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>opcional</Text>
            </View>
          </View>
          <View>
            <Text style={styles.label}>Persona de contacto</Text>
            <TextInput
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Juan Pérez"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
            />
          </View>
          <View style={styles.twoCols}>
            <View style={styles.col}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="987654321"
                placeholderTextColor="rgba(22, 33, 58, 0.35)"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="contacto@distri.com"
                placeholderTextColor="rgba(22, 33, 58, 0.35)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Av. Ejemplo 123"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
            />
          </View>
          <View>
            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={styles.textarea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Entrega los martes, cuenta bancaria…"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              multiline
              textAlignVertical="top"
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTexts}>
              <Text style={styles.switchLabel}>Activo</Text>
              <Text style={styles.switchHint}>Los inactivos no aparecen al crear órdenes</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.controlBorder, true: '#FFC20E' }}
              thumbColor="#fff"
              ios_backgroundColor={colors.controlBorder}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaOff]}
          onPress={save}
          disabled={!canSubmit}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear proveedor'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 12, paddingBottom: 24 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 13,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
    },
    label: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      marginBottom: 6,
    },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
    counter: { fontSize: 11, fontFamily: FONT_FAMILY.black },
    counterOk: { color: '#8A6400' },
    counterBad: { color: colors.error },
    tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: colors.fill },
    tagText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.5)' },
    input: {
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 15,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
    rucInput: {
      height: 52,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 17,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.5,
      color: colors.primary,
    },
    inputError: { borderColor: '#E8836B' },
    textarea: {
      minHeight: 70,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 14.5,
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
      lineHeight: 20,
    },
    twoCols: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 7, lineHeight: 16 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 16,
    },
    switchTexts: { flex: 1 },
    switchLabel: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    switchHint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },

    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: '#E9EBF0',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
    },
    cta: { height: 58, borderRadius: 18, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    ctaOff: { backgroundColor: '#EDEFF3' },
    ctaText: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    ctaTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
