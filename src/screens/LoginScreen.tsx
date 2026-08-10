import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

const TENANT_DOMAIN = '.noinventes.com';

// Spec-final colours for this bespoke login (model 5a). The brand navy/amber come
// through the theme; the rest are one-off surface/border tints from the handoff.
const NAVY = {
  a35: 'rgba(22, 33, 58, 0.35)', // CTA-off label
  a42: 'rgba(22, 33, 58, 0.42)', // footer
  a45: 'rgba(22, 33, 58, 0.45)', // field hint
  a60: 'rgba(22, 33, 58, 0.60)', // "Ver" button
};
const WHITE60 = 'rgba(255, 255, 255, 0.6)'; // subtitle on navy
const FIELD_BORDER = '#dfe2ea';
const ERROR_BORDER = '#e8836b';
const CHIP_BG = '#fff3cf';
const CHIP_TEXT = '#8a6400';
const BANNER_BG = '#fdece8';
const BANNER_TEXT = '#c22f0c';
const CTA_OFF_BG = '#edeff3';
const VER_PRESS_BG = '#f1f3f7';

type FieldKey = 'store' | 'email' | 'password';

// Lowercase, strip spaces, and drop a pasted scheme or the domain suffix.
const normalizeStore = (t: string) =>
  t
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^https?:\/\//, '')
    .replace(/\.noinventes\.com.*$/, '');

export default function LoginScreen() {
  const { signIn, lastTenant } = useAuth();
  // Pre-filled with the last store signed into, so returning users don't retype it.
  const [store, setStore] = useState(lastTenant ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<FieldKey | null>(null);
  const [errorFields, setErrorFields] = useState<FieldKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  // On short screens the spec hides the footer and tightens the field rhythm.
  const compact = useWindowDimensions().height < 640;

  const canSubmit = store.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !loading;

  // Any edit clears the error banner + field highlights (spec).
  const clearError = () => {
    if (error) setError(null);
    if (errorFields.length) setErrorFields([]);
  };

  async function handleLogin() {
    if (!canSubmit) return;
    setError(null);
    setErrorFields([]);
    setLoading(true);
    try {
      await signIn(store, email, password);
      // success → AuthProvider switches the app to the main navigator
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      const message =
        e instanceof ApiError
          ? status === 429
            ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
            : status === 404
              ? 'No encontramos esa tienda. Revisa el subdominio.'
              : status === 400
                ? 'Falta indicar la tienda.'
                : e.message
          : 'Ocurrió un error inesperado. Inténtalo de nuevo.';
      // Highlight the field(s) at fault; clear only the password on a bad login.
      if (status === 404 || status === 400) {
        setErrorFields(['store']);
      } else if (status !== 429) {
        setErrorFields(['email', 'password']);
        setPassword('');
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function forgotPassword() {
    Alert.alert(
      '¿Olvidaste tu contraseña?',
      'Pide a un administrador de tu tienda que la restablezca desde el panel.'
    );
  }

  const fieldBorder = (key: FieldKey) =>
    errorFields.includes(key) ? ERROR_BORDER : focused === key ? colors.onChrome : FIELD_BORDER;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Navy header with the brand + a solid amber corner arc */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={styles.circle} pointerEvents="none" />
        <View style={styles.logoTile}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} contentFit="cover" />
        </View>
        <View>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>
      </View>

      {/* White sheet with the form */}
      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { rowGap: compact ? 14 : 26, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tienda */}
          <View>
            <Text style={styles.label}>Tienda</Text>
            <View style={[styles.field, styles.fieldWithChip, { borderColor: fieldBorder('store') }]}>
              <TextInput
                style={styles.input}
                placeholder="mi-tienda"
                placeholderTextColor={NAVY.a35}
                autoCapitalize="none"
                autoCorrect={false}
                value={store}
                onChangeText={(t) => {
                  setStore(normalizeStore(t));
                  clearError();
                }}
                onFocus={() => setFocused('store')}
                onBlur={() => setFocused(null)}
                returnKeyType="next"
              />
              <View style={styles.chip}>
                <Text style={styles.chipText}>{TENANT_DOMAIN}</Text>
              </View>
            </View>
            <Text style={styles.hint}>El subdominio que te dieron al crear la cuenta.</Text>
          </View>

          {/* Correo */}
          <View>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={[styles.field, { borderColor: fieldBorder('email') }]}>
              <TextInput
                style={styles.input}
                placeholder="tucorreo@empresa.com"
                placeholderTextColor={NAVY.a35}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearError();
                }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Contraseña */}
          <View>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.field, styles.fieldWithBtn, { borderColor: fieldBorder('password') }]}>
              <TextInput
                style={styles.input}
                placeholder="Tu contraseña"
                placeholderTextColor={NAVY.a35}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearError();
                }}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={({ pressed }) => [styles.verBtn, pressed && styles.verBtnPressed]}
              >
                <Text style={styles.verText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Error banner */}
          {error && (
            <View style={styles.banner}>
              <Ionicons name="alert-circle" size={17} color={BANNER_TEXT} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          )}

          {/* CTA */}
          <Pressable
            onPress={handleLogin}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
            accessibilityState={{ disabled: !canSubmit, busy: loading }}
            style={({ pressed }) => [
              styles.cta,
              canSubmit
                ? [styles.ctaOn, pressed && styles.ctaPressed]
                : styles.ctaOff,
            ]}
          >
            <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
              {loading ? 'Validando…' : 'Iniciar sesión'}
            </Text>
          </Pressable>

          {/* Forgot password */}
          <TouchableOpacity
            onPress={forgotPassword}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            style={styles.linkWrap}
          >
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {!compact && <Text style={styles.footer}>Acceso para personal autorizado</Text>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Navy fills behind the sheet's rounded top corners.
  flex: { flex: 1, backgroundColor: colors.primary },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingBottom: 30,
    gap: 16,
    overflow: 'hidden',
  },
  // Solid amber disc, clipped to the header — a bright arc in the top-right.
  circle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: colors.chromeFill,
    top: -104,
    right: -84,
  },
  logoTile: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  logo: { width: 66, height: 66 },
  title: {
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontFamily: FONT_FAMILY.black,
    color: colors.textOnPrimary,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 15,
    color: WHITE60,
    marginTop: 6,
  },

  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  sheetContent: { paddingTop: 32, paddingHorizontal: 26 },

  label: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.extrabold,
    color: colors.onChrome,
    marginBottom: 8,
  },
  field: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  fieldWithChip: { paddingRight: 4 },
  fieldWithBtn: { paddingRight: 6 },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: colors.onChrome,
  },
  chip: {
    backgroundColor: CHIP_BG,
    borderRadius: 11,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  chipText: { fontSize: 12, fontFamily: FONT_FAMILY.extrabold, color: CHIP_TEXT },
  verBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verBtnPressed: { backgroundColor: VER_PRESS_BG },
  verText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, letterSpacing: 0.4, color: NAVY.a60 },
  hint: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 11.5,
    color: NAVY.a45,
    marginTop: 8,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: BANNER_BG,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bannerText: { flex: 1, fontFamily: FONT_FAMILY.bold, fontSize: 13, color: BANNER_TEXT },

  cta: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOn: {
    backgroundColor: colors.chromeFill,
    shadowColor: colors.chromeFill,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaPressed: { backgroundColor: colors.chromeFillPressed },
  ctaOff: { backgroundColor: CTA_OFF_BG },
  ctaText: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
  ctaTextOff: { color: NAVY.a35 },

  linkWrap: {
    alignSelf: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.chromeFill,
    paddingBottom: 2,
  },
  link: { fontSize: 13.5, fontFamily: FONT_FAMILY.extrabold, color: colors.onChrome },

  footer: {
    textAlign: 'center',
    fontFamily: FONT_FAMILY.bold,
    color: NAVY.a42,
    fontSize: 12.5,
  },
});
