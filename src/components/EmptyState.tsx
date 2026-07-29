import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, SPACING } from '../theme/tokens';
import Button from './Button';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  /** Renders a call to action below the message (e.g. "Reintentar"). */
  action?: {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
  };
  /**
   * For an empty SECTION rather than an empty screen. Drops the `flex: 1` — which
   * would otherwise swallow all the room left and shove the sections below it off
   * the page — and scales everything down to fit inside the block.
   */
  compact?: boolean;
};

// The placeholder shown when a list is empty or a request failed. Centralised so
// "nothing here" and "it broke" always read the same way: a muted icon, a short
// title, one line of explanation, and — when the user can do something about it —
// a single action.
export default function EmptyState({ icon, title, message, action, compact }: Props) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Ionicons name={icon} size={compact ? 36 : 56} color={colors.border} />
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!message && <Text style={styles.message}>{message}</Text>}
      {action && (
        <Button
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          size="md"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING['3xl'],
    paddingHorizontal: SPACING['3xl'],
  },
  compact: { flex: 0, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  title: {
    fontSize: FONT_SIZE.heading,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  message: { fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 21,
  },
  action: { marginTop: SPACING.xl, paddingHorizontal: SPACING['2xl'] },
});
