import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { createUser, updateUser } from '../api/admin/users';
import { fetchAdminBranches } from '../api/admin/branches';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import type { AdminBranch, AdminUserRole } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminUserForm'>;

const ROLES: { value: AdminUserRole; label: string; hint: string }[] = [
  { value: 'seller', label: 'Vendedor', hint: 'Opera la app y registra ventas' },
  { value: 'admin', label: 'Administrador', hint: 'Gestiona el catálogo y el equipo' },
];

export default function AdminUserFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Editar usuario' : 'Nuevo usuario'}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej. María Pérez"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="maria@tienda.pe"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>
          Contraseña {editing && <Text style={styles.optional}>(dejar vacío para no cambiarla)</Text>}
        </Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder={editing ? 'Sin cambios' : 'Contraseña segura'}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Rol</Text>
        {ROLES.map((r) => {
          const active = role === r.value;
          return (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, active && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
              activeOpacity={0.8}
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
            <TouchableOpacity style={styles.select} onPress={() => setBranchPickerOpen(true)}>
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

        <TouchableOpacity
          style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
          onPress={save}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.saveText}>{editing ? 'Guardar cambios' : 'Crear usuario'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Branch picker */}
      <Modal
        visible={branchPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBranchPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBranchPickerOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sucursal</Text>
            <ScrollView>
              {branches.length === 0 ? (
                <Text style={styles.hint}>No hay sucursales. Crea una primero.</Text>
              ) : (
                branches.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.pickerRow}
                    onPress={() => {
                      setBranchId(b.id);
                      setBranchPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.pickerLabel, branchId === b.id && styles.pickerLabelActive]}
                      >
                        {b.name}
                      </Text>
                      {!b.active && <Text style={styles.pickerHint}>Inactiva</Text>}
                    </View>
                    {branchId === b.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  passwordInput: { flex: 1, fontSize: 16, color: colors.textPrimary, height: '100%' },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  roleLabelActive: { color: colors.primary },
  roleHint: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
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
  pickerLabel: { fontSize: 16, color: colors.textPrimary },
  pickerLabelActive: { fontWeight: '700', color: colors.primary },
  pickerHint: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
});
