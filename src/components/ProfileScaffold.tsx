import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePosMode } from '../context/PosModeContext';
import { ApiError } from '../api/client';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type Row = { label: string; value: string };

type Props = {
  /** The pill under the name — its icon and label are the only identity that
   *  differs between a seller and an admin. */
  roleBadge: { icon: keyof typeof Ionicons.glyphMap; label: string };
  /** The label/value rows of the "Datos de la cuenta" card — the caller builds
   *  them from `user` because the fields differ (the seller shows branch + id). */
  rows: Row[];
  /** The seller's "Contactar soporte" row; omit for the admin. */
  support?: { onPress: () => void };
};

// Both profile screens are the same page with two scopes (5a): a colour header, an
// elevated identity card, the account data, "sync session", logout, and the footer
// credit — plus a verbatim-shared stylesheet. Only the role badge, which rows show
// and the seller's support row differ, so those are props and everything else lives
// here once. The header colour tells the roles apart (amber seller / navy admin).
export default function ProfileScaffold({ roleBadge, rows, support }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  const navigation = useNavigation();
  const { user, signOut, refresh } = useAuth();
  const { showToast } = useToast();
  const pos = usePosMode();
  const [syncing, setSyncing] = useState(false);

  // An admin switches between the admin panel and the seller POS ("modo venta")
  // from here — the mode swap lives in Perfil, not in a tab.
  const isAdmin = user?.role === 'admin';

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? '?';

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
      {/* Header (5a): colour panel + white-card back + "Perfil". The extra bottom
          padding leaves room for the identity card to tuck under it. */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerCircle} pointerEvents="none" />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color={colors.onChrome} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>
      </View>

      {/* Lifted up so the identity card overlaps the header's lower edge. */}
      <ScrollView
        style={styles.scrollLift}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <View style={styles.identityTexts}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name ?? '—'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Ionicons name={roleBadge.icon} size={15} color={colors.primary} />
            <Text style={styles.roleText}>{roleBadge.label}</Text>
          </View>
        </View>

        {/* Account data */}
        <View style={styles.dataCard}>
          {rows.map((r, i) => (
            <View key={r.label} style={[styles.dataRow, i > 0 && styles.dataRowDivided]}>
              <Text style={styles.dataLabel}>{r.label}</Text>
              <Text style={styles.dataValue} numberOfLines={1}>
                {r.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Mode switch (admin only): admin panel ⇄ seller POS */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.modeBtn}
            onPress={pos.isAdminPos ? pos.exit : pos.enter}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <Ionicons
              name={pos.isAdminPos ? 'grid-outline' : 'cart-outline'}
              size={18}
              color={colors.onChrome}
            />
            <Text style={styles.modeText}>
              {pos.isAdminPos ? 'Volver al panel de administración' : 'Entrar a modo venta'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sync */}
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
        >
          <Ionicons name="sync-outline" size={18} color={colors.primary} />
          <Text style={styles.syncText}>{syncing ? 'Sincronizando…' : 'Sincronizar sesión'}</Text>
        </TouchableOpacity>

        {/* User guide — both roles */}
        <View style={styles.supportCard}>
          <TouchableOpacity
            style={styles.supportRow}
            onPress={() => navigation.navigate('Guide' as never)}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
          >
            <View style={styles.supportIcon}>
              <Ionicons name="book-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.supportTexts}>
              <Text style={styles.supportTitle}>Guía de uso</Text>
              <Text style={styles.supportSub}>Cómo usar la app paso a paso</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(22, 33, 58, 0.3)" />
          </TouchableOpacity>
        </View>

        {/* Support (seller only) */}
        {support && (
          <View style={styles.supportCard}>
            <TouchableOpacity
              style={styles.supportRow}
              onPress={support.onPress}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <View style={styles.supportIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.supportTexts}>
                <Text style={styles.supportTitle}>Contactar soporte</Text>
                <Text style={styles.supportSub}>Abre WhatsApp con MiZonaOnline</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(22, 33, 58, 0.3)" />
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmLogout}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Footer credit */}
        <View style={styles.footer}>
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // ---- Header ----
    header: {
      paddingHorizontal: 18,
      paddingBottom: 44,
      backgroundColor: colors.chromeFill,
      overflow: 'hidden',
    },
    headerCircle: {
      position: 'absolute',
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.headerCircle,
      top: -150,
      right: -96,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.chromeButtonBg,
      borderWidth: 2,
      borderColor: colors.chromeButtonBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 26, letterSpacing: -0.8, fontFamily: FONT_FAMILY.black, color: colors.onChrome },

    // ---- Content ----
    scrollLift: { marginTop: -30 },
    scroll: { paddingHorizontal: 18, paddingBottom: 24, gap: 12 },

    // ---- Identity ----
    identityCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 20,
      alignItems: 'center',
      gap: 9,
      shadowColor: '#16213a',
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    avatar: {
      width: 78,
      height: 78,
      borderRadius: 26,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#16213a',
      shadowOpacity: 0.28,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    avatarInitial: { fontSize: 32, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    identityTexts: { alignItems: 'center' },
    name: { fontSize: 21, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.5 },
    email: { fontSize: 13.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, marginTop: 2 },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.tabActiveBg,
    },
    roleText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: colors.primary },

    // ---- Account data ----
    dataCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    dataRowDivided: { borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    dataLabel: {
      width: 104,
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
    },
    dataValue: { flex: 1, textAlign: 'right', fontSize: 14, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },

    // ---- Mode switch (admin) ----
    modeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.chromeFill,
      shadowColor: '#16213a',
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    modeText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.onChrome },

    // ---- Sync ----
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
    },
    syncText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },

    // ---- Support ----
    supportCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    supportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
    supportIcon: {
      width: 36,
      height: 36,
      borderRadius: 13,
      backgroundColor: colors.tabActiveBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    supportTexts: { flex: 1, minWidth: 0 },
    supportTitle: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    supportSub: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, marginTop: 2 },

    // ---- Logout ----
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 54,
      borderRadius: 17,
      backgroundColor: colors.errorSoft,
      borderWidth: 1.5,
      borderColor: '#F3CFC6',
    },
    logoutText: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.error },

    // ---- Footer ----
    footer: { alignItems: 'center', marginTop: 6, gap: 4 },
    version: { fontSize: 12, fontFamily: FONT_FAMILY.extrabold, color: colors.textSecondary },
    credit: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary },
    creditBrand: { fontFamily: FONT_FAMILY.black, color: colors.primary },
  });
