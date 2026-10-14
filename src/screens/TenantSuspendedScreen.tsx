import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Shown full-screen when the store is suspended (kill switch): every request
// 404s before auth. We do NOT sign out — the token stays valid for when the
// store is reactivated; "Reintentar" re-checks /me. Rendered outside the role
// theme (the plan/role may be unknown), so colors are literal.
const NAVY = '#16213a';
const AMBER = '#FFC20E';

export default function TenantSuspendedScreen() {
  const insets = useSafeAreaInsets();
  const { recheck, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  async function onRetry() {
    if (checking) return;
    setChecking(true);
    try {
      await recheck();
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="pause-circle-outline" size={48} color={AMBER} />
        </View>
        <Text style={styles.title}>Tienda temporalmente suspendida</Text>
        <Text style={styles.message}>
          El servicio de esta tienda está pausado. Contactá al administrador de tu negocio para
          reactivarlo. Tu sesión se mantiene — no necesitás volver a iniciar sesión.
        </Text>

        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} disabled={checking} activeOpacity={0.85}>
          <Ionicons name="refresh" size={18} color={NAVY} />
          <Text style={styles.retryText}>{checking ? 'Comprobando…' : 'Reintentar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  content: { alignItems: 'center', gap: 14, maxWidth: 360 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 194, 14, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
  message: { fontSize: 14.5, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 21 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    height: 52,
    paddingHorizontal: 28,
    borderRadius: 16,
    backgroundColor: AMBER,
  },
  retryText: { fontSize: 15.5, fontWeight: '900', color: NAVY },
  logoutBtn: { marginTop: 6, padding: 10 },
  logoutText: { fontSize: 13.5, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
});
