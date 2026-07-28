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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createUser, updateUser } from '../api/admin/users';
import { fetchAdminBranches } from '../api/admin/branches';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import Field from '../components/Field';
import ScreenHeader from '../components/ScreenHeader';
import { useToast } from '../context/ToastContext';
import BottomSheet, { SheetOption } from '../components/BottomSheet';
import Button from '../components/Button';
import type { AdminBranch, AdminUserRole } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminUserForm'>;

const ROLES: { value: AdminUserRole; label: string; hint: string }[] = [
  { value: 'seller', label: 'Vendedor', hint: 'Opera la app y registra ventas' },
  { value: 'admin', label: 'Administrador', hint: 'Gestiona el catálogo y el equipo' },
];

export default function AdminUserFormScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const editing = route.params?.user;

  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminUserRole>(editing?.role ?? 'seller');
  const [branchId, setBranchId] = useState<number | null>(editing?.branch?.id ?? null);

  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Branches are only needed for the seller branch picker.
  useEffect(() => {
    fetchAdminBranches()
      .then(setBranches)
      .catch(() => {
        /* non-fatal: the picker just shows empty */
      });
  }, []);

  const branchName =
    branchId == null ? 'Selecciona una sucursal' : branches.find((b) => b.id === branchId)?.name ?? '—';

  // Sellers must have a branch (the API rejects them with 422 otherwise).
  // Password is required on create, optional on edit (blank = keep current).
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
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
      <ScreenHeader
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{ padding: SPACING.sm, paddingBottom: SPACING['2xl'] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej. María Pérez"
        />

        <Field
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="maria@tienda.pe"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Field
          label="Contraseña"
          hint={editing ? 'Déjala vacía para no cambiarla.' : undefined}
          value={password}
          onChangeText={setPassword}
          placeholder={editing ? 'Sin cambios' : 'Contraseña segura'}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          accessory={
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={HIT_SLOP}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          }
        />

        <Text style={styles.label}>Rol</Text>
        {ROLES.map((r) => {
          const active = role === r.value;
          return (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, active && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
              activeOpacity={ROW_PRESS_OPACITY}
            >
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={active ? colors.primary : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                <Text style={styles.roleHint}>{r.hint}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Admins have no branch — the server nulls branch_id for non-sellers. */}
        {role === 'seller' && (
          <>
            <Text style={styles.label}>Sucursal</Text>
            <TouchableOpacity style={styles.select} onPress={() => setBranchPickerOpen(true)} activeOpacity={ROW_PRESS_OPACITY}>
              <Text
                style={[styles.selectText, branchId == null && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {branchName}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.hint}>Un vendedor necesita una sucursal para poder operar.</Text>
          </>
        )}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear usuario'}
          onPress={save}
          loading={saving}
          disabled={!canSubmit}
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Branch picker */}
      <BottomSheet
        visible={branchPickerOpen}
        onClose={() => setBranchPickerOpen(false)}
        title="Sucursal"
        scrollable
      >
        {branches.length === 0 ? (
          <Text style={styles.hint}>No hay sucursales. Crea una primero.</Text>
        ) : (
          branches.map((b) => (
            <SheetOption
              key={b.id}
              label={b.name}
              hint={b.active ? undefined : 'Inactiva'}
              active={branchId === b.id}
              onPress={() => {
                setBranchId(b.id);
                setBranchPickerOpen(false);
              }}
            />
          ))
        )}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    // Transparent at rest; the selected state frames it in primary — same as the
    // category filter.
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  roleLabelActive: { color: colors.primary },
  roleHint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.hairline },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    height: CONTROL_HEIGHT.input,
  },
  selectText: { flex: 1, fontSize: FONT_SIZE.subheading, color: colors.textPrimary },
  selectPlaceholder: { color: colors.textSecondary },
  hint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.sm, lineHeight: 17 },
  saveBtn: { marginTop: SPACING['2xl'] },
});
