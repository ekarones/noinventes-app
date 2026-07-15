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
import { FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';
import Avatar from '../components/Avatar';
import { ActionRow, InfoRow } from '../components/Row';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

// Support contact — reemplazar con los datos reales de monatekeda.
// WhatsApp: solo dígitos con código de país (ej. '51999888777'). Deja '' para
// usar el correo. Si ambos están vacíos, la fila avisa que no está configurado.
const SUPPORT_WHATSAPP = '51953253845';
const SUPPORT_EMAIL = 'mizonaonline69@gmail.com';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
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
      <ScreenHeader title="Perfil" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View style={styles.profileCard}>
          <Avatar name={user?.name} size="lg" />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="storefront-outline" size={14} color={colors.primary} />
            <Text style={styles.roleText}>{user?.branch?.name ?? 'Vendedor'}</Text>
          </View>
        </View>

        {/* Account data */}
        <Text style={styles.overline}>Datos de la cuenta</Text>
        <Card inset>
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
        </Card>

        <Button
          label={syncing ? 'Sincronizando…' : 'Sincronizar sesión'}
          icon="sync-outline"
          variant="secondary"
          size="md"
          onPress={handleSync}
          loading={syncing}
          style={styles.syncBtn}
        />

        {/* Support */}
        <Text style={styles.overline}>Ayuda</Text>
        <Card inset>
          <ActionRow icon="chatbubble-ellipses-outline" label="Contactar soporte" onPress={openSupport} last />
        </Card>

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



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: SPACING['2xl'] },
  profileCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  name: { fontSize: FONT_SIZE.titleSm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginTop: SPACING.md },
  email: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, marginTop: SPACING.hairline },
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
  roleText: { color: colors.primary, fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium },
  overline: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.xl,
  },
  syncBtn: { marginHorizontal: SPACING.xl, marginTop: SPACING.md },
  logout: { marginHorizontal: SPACING.xl, marginTop: SPACING['2xl'] },
  footerCredit: { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.xs },
  version: { textAlign: 'center', color: colors.textSecondary, fontSize: FONT_SIZE.micro },
  credit: { textAlign: 'center', color: colors.textSecondary, fontSize: FONT_SIZE.micro },
  creditBrand: { color: colors.primary, fontWeight: FONT_WEIGHT.bold },
});
