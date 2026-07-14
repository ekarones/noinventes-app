import { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// Admin identity + session management. The mobile API only clears `/me` and
// `/logout` for admins, so this screen is identity, session refresh and logout.
export default function AdminProfileScreen() {
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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Perfil" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <Text style={styles.roleText}>Administrador</Text>
          </View>
        </View>

        {/* Account data */}
        <Text style={styles.sectionTitle}>Datos de la cuenta</Text>
        <View style={styles.card}>
          <InfoRow icon="person-outline" label="Nombre" value={user?.name ?? '—'} />
          <InfoRow icon="mail-outline" label="Correo" value={user?.email ?? '—'} />
          <InfoRow icon="pricetag-outline" label="Rol" value="Administrador" />
          <InfoRow
            icon="finger-print-outline"
            label="ID de usuario"
            value={user ? `#${user.id}` : '—'}
            last
          />
        </View>

        <Button
          label={syncing ? 'Sincronizando…' : 'Sincronizar sesión'}
          icon="sync-outline"
          variant="secondary"
          size="md"
          onPress={handleSync}
          loading={syncing}
          style={styles.syncBtn}
        />

        {/* Logout */}
        <Button
          label="Cerrar sesión"
          icon="log-out-outline"
          variant="outline"
          onPress={confirmLogout}
          style={styles.logout}
        />

        <View style={styles.footerCredit}>
          <Text style={styles.version}>Versión {APP_VERSION}</Text>
          <TouchableOpacity
            activeOpacity={ROW_PRESS_OPACITY}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 24 },
  profileCard: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textOnPrimary, fontSize: FONT_SIZE.avatar, fontWeight: FONT_WEIGHT.bold },
  name: { fontSize: FONT_SIZE.titleSm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: 12 },
  email: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, marginTop: 2 },
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
  roleText: { color: colors.primary, fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium },
  sectionTitle: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
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
  rowLabel: { fontSize: FONT_SIZE.body, color: colors.textSecondary },
  rowValue: { flex: 1, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary, textAlign: 'right' },
  syncBtn: { marginHorizontal: 20, marginTop: 12 },
  logout: { marginHorizontal: 20, marginTop: 24 },
  footerCredit: { alignItems: 'center', marginTop: 18, gap: 4 },
  version: { textAlign: 'center', color: colors.textSecondary, fontSize: FONT_SIZE.micro },
  credit: { textAlign: 'center', color: colors.textSecondary, fontSize: FONT_SIZE.micro },
  creditBrand: { color: colors.primary, fontWeight: FONT_WEIGHT.bold },
});
