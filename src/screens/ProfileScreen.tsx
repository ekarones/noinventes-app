import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';

// Support contact — reemplazar con los datos reales de monatekeda.
// WhatsApp: solo dígitos con código de país (ej. '51999888777'). Deja '' para
// usar el correo. Si ambos están vacíos, la fila avisa que no está configurado.
const SUPPORT_WHATSAPP = '51953253845';
const SUPPORT_EMAIL = 'mizonaonline69@gmail.com';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, signOut, refresh } = useAuth();
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);

  function confirmLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  }

  // Re-fetch /me to refresh profile/branch (e.g. after the admin reassigns the
  // seller's branch), without logging out.
  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await refresh();
      showToast('Sesión actualizada', 'checkmark-circle');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
        signOut();
      } else {
        Alert.alert('No se pudo sincronizar', 'Revisa tu conexión e inténtalo de nuevo.');
      }
    } finally {
      setSyncing(false);
    }
  }

  function openSupport() {
    if (SUPPORT_WHATSAPP) {
      Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`).catch(openEmail);
    } else if (SUPPORT_EMAIL) {
      openEmail();
    } else {
      Alert.alert('Soporte', 'Aún no se configuró el contacto de soporte.');
    }
  }

  function openEmail() {
    if (SUPPORT_EMAIL) Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="storefront-outline" size={14} color={colors.primary} />
            <Text style={styles.roleText}>{user?.branch?.name ?? 'Vendedor'}</Text>
          </View>
        </View>

        {/* Account data */}
        <Text style={styles.sectionTitle}>Datos de la cuenta</Text>
        <View style={styles.card}>
          <InfoRow icon="person-outline" label="Nombre" value={user?.name ?? '—'} />
          <InfoRow icon="mail-outline" label="Correo" value={user?.email ?? '—'} />
          <InfoRow
            icon="pricetag-outline"
            label="Rol"
            value={user?.role === 'seller' ? 'Vendedor' : user?.role ?? '—'}
          />
          <InfoRow icon="storefront-outline" label="Sucursal" value={user?.branch?.name ?? '—'} />
          <InfoRow
            icon="finger-print-outline"
            label="ID de vendedor"
            value={user ? `#${user.id}` : '—'}
            last
          />
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          activeOpacity={0.85}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sync-outline" size={18} color={colors.primary} />
          )}
          <Text style={styles.syncText}>{syncing ? 'Sincronizando…' : 'Sincronizar sesión'}</Text>
        </TouchableOpacity>

        {/* Support */}
        <Text style={styles.sectionTitle}>Ayuda</Text>
        <View style={styles.card}>
          <ActionRow icon="chatbubble-ellipses-outline" label="Contactar soporte" onPress={openSupport} last />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logout} activeOpacity={0.85} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={styles.footerCredit}>
          <Text style={styles.version}>Versión {APP_VERSION}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://mizonaonline.com').catch(() => {})}
          >
            <Text style={styles.credit}>
              Desarrollado por <Text style={styles.creditBrand}>MiZonaOnline.com</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={[styles.rowLabel, styles.actionLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  scroll: { paddingBottom: 24 },
  profileCard: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textOnPrimary, fontSize: 36, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 12 },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  roleText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 15, color: colors.textSecondary },
  rowValue: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
  actionLabel: { flex: 1, color: colors.textPrimary, fontWeight: '600' },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  syncText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  logoutText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  footerCredit: { alignItems: 'center', marginTop: 18, gap: 4 },
  version: { textAlign: 'center', color: colors.textSecondary, fontSize: 12 },
  credit: { textAlign: 'center', color: colors.textSecondary, fontSize: 12 },
  creditBrand: { color: colors.primary, fontWeight: '700' },
});
