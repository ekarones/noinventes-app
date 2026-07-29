import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, SPACING, TOUCH_MIN } from '../theme/tokens';

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
  /** Optional action on the right (e.g. "+", trash). */
  action?: Action;
};

// The header of a pushed screen: back chevron, centred title, optional action.
// Owns its safe-area top padding, so screens don't each re-derive it.
//
// The side slots are always the same width, which is what keeps the title
// optically centred whether or not there's an action on the right.
export default function ScreenHeader({ title, onBack, action }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.slot}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.slot}>
        {action && (
          <TouchableOpacity
            onPress={action.onPress}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon} size={24} color={action.color ?? colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  // Fixed-width side slots keep the title centred with or without an action.
  slot: { width: TOUCH_MIN, alignItems: 'center' },
  iconBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.heading,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
  },
});
