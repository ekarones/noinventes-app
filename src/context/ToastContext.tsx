import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type ToastContextValue = {
  // Shows a floating confirmation message. `icon` defaults to a checkmark.
  showToast: (message: string, icon?: keyof typeof Ionicons.glyphMap) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 1800;

type ToastData = { message: string; icon: keyof typeof Ionicons.glyphMap };

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const anim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, icon: keyof typeof Ionicons.glyphMap = 'checkmark-circle') => {
      // Cancel any pending hide and any in-flight animation so the previous
      // toast can't linger or overlap with this one.
      if (hideTimer.current) clearTimeout(hideTimer.current);
      anim.stopAnimation();
      anim.setValue(0);

      // Replace the content and animate the single toast in from scratch.
      setToast({ message, icon });
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }).start();

      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          // Unmount only if this hide actually completed (not interrupted by a
          // newer toast), so no stale message stays in the tree.
          if (finished) setToast(null);
        });
      }, VISIBLE_MS);
    },
    [anim]
  );

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrapper,
            { bottom: insets.bottom + 80, opacity: anim, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.toast}>
            <Ionicons name={toast.icon} size={20} color={colors.textOnPrimary} />
            <Text style={styles.text} numberOfLines={1}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: '100%',
  },
  text: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '600', flexShrink: 1 },
});
