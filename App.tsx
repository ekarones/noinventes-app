import type { ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { ToastProvider } from './src/context/ToastContext';
import { PrinterProvider } from './src/context/PrinterContext';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import ChatFab from './src/components/ChatFab';
import { colors } from './src/theme/colors';
import { ThemeProvider } from './src/theme/theme';

function Root() {
  const { user, initializing } = useAuth();

  // The admin's chrome header is dark navy, so its status-bar content must be
  // light; everywhere else (the seller's amber header, the white login/splash)
  // takes dark content.
  // Dark bars (navy) → light status-bar content: the admin's chrome and the
  // login's navy header. The seller's amber header takes dark content.
  const statusBarStyle = user?.role === 'seller' ? 'dark' : 'light';

  let content: ReactNode;
  if (initializing) {
    // While we validate a saved token against /me, show a brief splash to avoid
    // flashing the login screen for already-signed-in sellers.
    content = (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (!user) {
    content = <LoginScreen />;
  } else if (user.role === 'admin') {
    // Admins get their own navigator (no cart — they don't sell). Sellers get the
    // full POS tab navigator. Routing by role here keeps admins out of the
    // seller-only screens that would just 403 against the mobile API.
    content = (
      <ThemeProvider role="admin">
        <NavigationContainer>
          <AdminNavigator />
        </NavigationContainer>
        <ChatFab />
      </ThemeProvider>
    );
  } else {
    content = (
      <ThemeProvider role="seller">
        <CartProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <ChatFab />
        </CartProvider>
      </ThemeProvider>
    );
  }

  return (
    <>
      <StatusBar style={statusBarStyle} />
      {content}
    </>
  );
}

export default function App() {
  // Nunito is the app typeface (its weights are wired through FONT_FAMILY in
  // src/theme/tokens.ts). The 800/900 weights carry the login's display type.
  // Hold on a splash until the font files are ready, so text doesn't render once
  // in the system font and then reflow into Nunito.
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
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
              {/* StatusBar is rendered inside Root, where it can adapt to the role. */}
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
