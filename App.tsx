import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { ToastProvider } from './src/context/ToastContext';
import { PrinterProvider } from './src/context/PrinterContext';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import { colors } from './src/theme/colors';

function Root() {
  const { user, initializing } = useAuth();

  // While we validate a saved token against /me, show a brief splash to avoid
  // flashing the login screen for already-signed-in sellers.
  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Admins get their own navigator (no cart — they don't sell). Sellers get the
  // full POS tab navigator. Routing by role here keeps admins out of the
  // seller-only screens that would just 403 against the mobile API.
  if (user.role === 'admin') {
    return (
      <NavigationContainer>
        <AdminNavigator />
      </NavigationContainer>
    );
  }

  return (
    <CartProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </CartProvider>
  );
}

export default function App() {
  // Manrope is the app typeface (its weights are wired through FONT_FAMILY in
  // src/theme/tokens.ts). Hold on a splash until the font files are ready, so
  // text doesn't render once in the system font and then reflow into Manrope.
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        {/* Outside the auth gate: the printer session belongs to the device, not
            to whoever is signed in, so it survives a sign-out. */}
        <PrinterProvider>
          <AuthProvider>
            <View style={styles.root}>
              <StatusBar style="dark" />
              <Root />
            </View>
          </AuthProvider>
        </PrinterProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
