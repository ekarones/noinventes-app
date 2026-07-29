import { useState, type ReactNode } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';
import Avatar from './Avatar';
import Card from './Card';
import Button from './Button';
import ScreenHeader from './ScreenHeader';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Props = {
  /** The pill under the name — its icon and label are the only identity that
   *  differs between a seller and an admin. */
  roleBadge: { icon: keyof typeof Ionicons.glyphMap; label: string };
  /** The `InfoRow`s inside the "Datos de la cuenta" card — the caller builds
   *  them from `user` because the fields differ (the seller shows branch + id). */
  infoRows: ReactNode;
  /** An optional extra section between the sync button and logout (the seller's
   *  "Ayuda / Contactar soporte" card). */
  extra?: ReactNode;
};

// Both profile screens are the same page with two scopes: identity card, account
// data, "sync session", logout, and the footer credit — plus a verbatim-shared
// stylesheet. Only the role badge and which rows show differ, so those are props
// and everything else lives here once.
export default function ProfileScaffold({ roleBadge, infoRows, extra }: Props) {
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
  // seller's branch) without logging out.
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
          <Avatar name={user?.name} size="lg" />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name={roleBadge.icon} size={14} color={colors.primary} />
            <Text style={styles.roleText}>{roleBadge.label}</Text>
          </View>
        </View>

        {/* Account data */}
        <Text style={styles.overline}>Datos de la cuenta</Text>
        <Card inset>{infoRows}</Card>

        <Button
          label={syncing ? 'Sincronizando…' : 'Sincronizar sesión'}
          icon="sync-outline"
          variant="secondary"
          size="md"
          onPress={handleSync}
          loading={syncing}
          style={styles.syncBtn}
        />

        {extra}

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

// The uppercase section label, for an `extra` section to match "Datos de la
// cuenta" without the caller re-declaring the style.
export function ProfileOverline({ children }: { children: ReactNode }) {
  return <Text style={styles.overline}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: SPACING['2xl'] },
  profileCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  name: { fontSize: FONT_SIZE.titleSm, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, marginTop: SPACING.md },
  email: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, marginTop: SPACING.hairline },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
  roleText: { color: colors.primary, fontSize: FONT_SIZE.caption, fontFamily: FONT_FAMILY.medium },
  overline: {
    fontSize: FONT_SIZE.caption,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.sm,
  },
  syncBtn: { marginHorizontal: SPACING.sm, marginTop: SPACING.md },
  logout: { marginHorizontal: SPACING.sm, marginTop: SPACING['2xl'] },
  footerCredit: { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.xs },
  version: { fontFamily: FONT_FAMILY.regular, textAlign: 'center', color: colors.textSecondary, fontSize: FONT_SIZE.micro },
  credit: { fontFamily: FONT_FAMILY.regular, textAlign: 'center', color: colors.textSecondary, fontSize: FONT_SIZE.micro },
  creditBrand: { color: colors.primary, fontFamily: FONT_FAMILY.bold },
});
