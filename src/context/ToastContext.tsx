import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY } from '../theme/tokens';

// An optional tappable action on the right of the toast (e.g. "VER CARRITO").
type ToastAction = { label: string; onPress: () => void };

type ToastContextValue = {
  // Shows a floating confirmation message. `icon` defaults to a checkmark.
  showToast: (
    message: string,
    icon?: keyof typeof Ionicons.glyphMap,
    action?: ToastAction
  ) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2600;

type ToastData = { message: string; icon: keyof typeof Ionicons.glyphMap; action?: ToastAction };

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const anim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setToast(null);
      }
    );
  }, [anim]);

  const showToast = useCallback(
    (
      message: string,
      icon: keyof typeof Ionicons.glyphMap = 'checkmark-circle',
      action?: ToastAction
    ) => {
      // Cancel any pending hide and any in-flight animation so the previous toast
      // can't linger or overlap with this one.
      if (hideTimer.current) clearTimeout(hideTimer.current);
      anim.stopAnimation();
      anim.setValue(0);

      setToast({ message, icon, action });
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }).start();

      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) setToast(null);
          }
        );
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
          // `box-none` lets taps pass through the empty area but still reach the
          // action button when there is one.
          pointerEvents={toast.action ? 'box-none' : 'none'}
          style={[
            styles.wrapper,
            { bottom: insets.bottom + 80, opacity: anim, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.toast}>
            <Ionicons name={toast.icon} size={18} color="#ffc20e" />
            <Text style={styles.text} numberOfLines={1}>
              {toast.message}
            </Text>
            {toast.action && (
              <TouchableOpacity
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
              >
                <Text style={styles.actionText}>{toast.action.label}</Text>
              </TouchableOpacity>
            )}
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
    left: 22,
    right: 22,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#16213a',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    maxWidth: '100%',
    shadowColor: '#0a0f1c',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  text: {
    flexShrink: 1,
    color: '#ffffff',
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.extrabold,
  },
  actionText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: '#ffc20e' },
});
