import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createUser, updateUser } from '../api/admin/users';
import { fetchAdminBranches } from '../api/admin/branches';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PushedHeader from '../components/PushedHeader';
import { useToast } from '../context/ToastContext';
import type { AdminBranch, AdminUserRole } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminUserForm'>;

const ROLES: { value: AdminUserRole; label: string }[] = [
  { value: 'seller', label: 'Vendedor' },
  { value: 'admin', label: 'Administrador' },
];

const EMAIL_RE = /.+@.+\..+/;

export default function AdminUserFormScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const styles = useThemedStyles(makeStyles);
  const editing = route.params?.user;

  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminUserRole>(editing?.role ?? 'seller');
  const [branchId, setBranchId] = useState<number | null>(editing?.branch?.id ?? null);

  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [saving, setSaving] = useState(false);

  // Branches feed the seller branch picker.
  useEffect(() => {
    fetchAdminBranches()
      .then(setBranches)
      .catch(() => {
        /* non-fatal: the picker just shows empty */
      });
  }, []);

  const emailValid = EMAIL_RE.test(email.trim());

  // Sellers must have a branch (the API rejects them with 422 otherwise).
  // Password is required on create, optional on edit (blank = keep current).
  const canSubmit =
    name.trim().length > 0 &&
    emailValid &&
    (editing ? true : password.length > 0) &&
    (role === 'admin' || branchId != null) &&
    !saving;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role,
        branchId,
        password: password || undefined,
      };
      if (editing) {
        await updateUser(editing.id, payload);
        showToast('Usuario actualizado', 'checkmark-circle');
      } else {
        await createUser(payload);
        showToast('Usuario creado', 'checkmark-circle');
      }
      navigation.goBack();
    } catch (e: any) {
      // Server enforces password strength, unique email, etc.
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
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Datos */}
        <View style={styles.card}>
          <View>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej. María Pérez"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
            />
          </View>
          <View>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={[styles.input, email.length > 0 && !emailValid && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="maria@tienda.pe"
              placeholderTextColor="rgba(22, 33, 58, 0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Contraseña</Text>
              {!editing && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>requerida al crear</Text>
                </View>
              )}
            </View>
            <View style={styles.pwField}>
              <TextInput
                style={styles.pwInput}
                value={password}
                onChangeText={setPassword}
                placeholder={editing ? 'Sin cambios' : 'Contraseña segura'}
                placeholderTextColor="rgba(22, 33, 58, 0.35)"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={styles.pwToggle}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Text style={styles.pwToggleText}>{showPassword ? 'OCULTAR' : 'VER'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {editing
                ? 'Déjala vacía para no cambiarla. El servidor valida su fuerza.'
                : 'El servidor valida su fuerza.'}
            </Text>
          </View>
        </View>

        {/* Rol y alcance */}
        <View style={styles.card}>
          <View>
            <Text style={styles.label}>Rol</Text>
            <View style={styles.segment}>
              {ROLES.map((r) => {
                const on = role === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.segBtn, on && styles.segBtnOn]}
                    onPress={() => setRole(r.value)}
                    activeOpacity={ROW_PRESS_OPACITY}
                  >
                    <Text style={[styles.segText, on && styles.segTextOn]}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Admins have no branch — the server nulls branch_id for non-sellers. */}
          {role === 'seller' ? (
            <View>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Sucursal</Text>
                <View style={styles.tagRequired}>
                  <Text style={styles.tagRequiredText}>obligatoria</Text>
                </View>
              </View>
              {branches.length === 0 ? (
                <Text style={styles.hint}>No hay sucursales. Crea una primero en Gestión → Sucursales.</Text>
              ) : (
                <View style={styles.chips}>
                  {branches.map((b) => {
                    const on = branchId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setBranchId(b.id)}
                        activeOpacity={ROW_PRESS_OPACITY}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noteBlock}>
              <Ionicons name="information-circle-outline" size={17} color="rgba(22, 33, 58, 0.5)" />
              <Text style={styles.noteText}>
                Un administrador no tiene sucursal: ve toda la operación.
              </Text>
            </View>
          )}
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
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
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
    label: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      marginBottom: 6,
    },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 1 },
    tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: '#FFF3CF' },
    tagText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: '#8A6400' },
    tagRequired: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: colors.errorSoft },
    tagRequiredText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: colors.error },
    input: {
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 15.5,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
    inputError: { borderColor: '#E8836B' },
    pwField: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 50,
      paddingLeft: 14,
      paddingRight: 6,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
    },
    pwInput: { flex: 1, minWidth: 0, fontSize: 15.5, fontFamily: FONT_FAMILY.extrabold, color: colors.primary, padding: 0 },
    pwToggle: { height: 38, paddingHorizontal: 11, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    pwToggleText: { fontSize: 12, fontFamily: FONT_FAMILY.black, letterSpacing: 0.4, color: 'rgba(22, 33, 58, 0.6)' },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 7, lineHeight: 16 },

    segment: { flexDirection: 'row', gap: 8, backgroundColor: colors.fill, borderRadius: 15, padding: 4 },
    segBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
    segBtnOn: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      shadowColor: '#16213a',
      shadowOpacity: 0.14,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segText: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.55)' },
    segTextOn: { color: colors.primary },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { height: 40, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.62)' },
    chipTextOn: { color: '#fff' },

    noteBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#F7F8FA', borderRadius: 14, padding: 12 },
    noteText: { flex: 1, fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.6)', lineHeight: 17 },

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
