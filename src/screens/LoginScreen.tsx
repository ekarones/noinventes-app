import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import Field from '../components/Field';
import Button from '../components/Button';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleLogin() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // success → AuthProvider switches the app to the main navigator
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.status === 429
            ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
            : e.message
          : 'Ocurrió un error inesperado. Inténtalo de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View style={styles.header}>
          <View style={styles.logoTile}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* Email */}
          <Field
            label="Correo electrónico"
            icon="mail-outline"
            placeholder="tucorreo@empresa.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          {/* Password */}
          <Field
            label="Contraseña"
            icon="lock-closed-outline"
            placeholder="Tu contraseña"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
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

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Button
            label="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit}
            style={styles.button}
          />
        </View>

        {/* Footer note */}
        <View style={styles.demoHint}>
          <Text style={styles.demoHintText}>Acceso para personal autorizado</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  logoTile: {
    width: 104,
    height: 104,
    borderRadius: RADIUS.sheet,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  logo: { width: 68, height: 68 },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.body,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    padding: SPACING['2xl'],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#fef2f2',
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  errorText: { color: colors.error, fontSize: FONT_SIZE.caption, flex: 1 },
  button: { marginTop: SPACING['2xl'] },
  demoHint: { alignItems: 'center', marginTop: SPACING['2xl'] },
  demoHintText: { color: colors.textSecondary, fontSize: FONT_SIZE.micro },
});
