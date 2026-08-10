import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Spoken by screen readers; icon-only buttons are meaningless without it. */
  label: string;
  color?: string;
};

type Props = {
  title: string;
  /** Omit on a root screen (no back chevron). */
  onBack?: () => void;
  /** A structured white-card icon button on the right (info, etc.). */
  action?: Action;
  /** A custom right-side node — overrides `action` (e.g. the admin's amber "Editar"). */
  actions?: ReactNode;
};

// The header of a pushed screen (5a): a colour panel with a decorative corner
// circle, a white-card back button, the title, and an optional action. The panel
// colour tells the roles apart (amber for the seller, navy for the admin).
export default function ScreenHeader({ title, onBack, action, actions }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.circle} pointerEvents="none" />

      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={styles.cardBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onChrome} />
        </TouchableOpacity>
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {actions
        ? actions
        : action && (
            <TouchableOpacity
              onPress={action.onPress}
              style={styles.cardBtn}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Ionicons name={action.icon} size={20} color={action.color ?? colors.onChrome} />
            </TouchableOpacity>
          )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingBottom: 16,
      backgroundColor: colors.chromeFill,
      overflow: 'hidden',
    },
    circle: {
      position: 'absolute',
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.headerCircle,
      top: -150,
      right: -90,
    },
    // A white card on the amber chrome, a translucent square on the navy — the
    // same treatment as the tab-root profile button.
    cardBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.chromeButtonBg,
      borderWidth: 2,
      borderColor: colors.chromeButtonBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 17,
      letterSpacing: -0.3,
      fontFamily: FONT_FAMILY.black,
      color: colors.onChrome,
    },
  });
