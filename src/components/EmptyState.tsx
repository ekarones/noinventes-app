import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_FAMILY, SPACING } from '../theme/tokens';
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
   * For an empty SECTION rather than an empty screen. Drops the card and the
   * `flex: 1`, and scales down — for use inside an already-white panel (the
   * dashboards' section cards).
   */
  compact?: boolean;
};

// The placeholder shown when a list is empty or a request failed (5a). On a full
// screen it sits in a white card; inside a section it's a plain centred block.
export default function EmptyState({ icon, title, message, action, compact }: Props) {
  const content = (
    <>
      <Ionicons name={icon} size={compact ? 36 : 42} color="rgba(22, 33, 58, 0.25)" />
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
    </>
  );

  if (compact) return <View style={styles.compact}>{content}</View>;
  return (
    <View style={styles.container}>
      <View style={styles.card}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 34,
    paddingHorizontal: 24,
    shadowColor: '#16213a',
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  compact: { alignItems: 'center', paddingVertical: SPACING.md },
  title: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.black,
    color: colors.primary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    color: 'rgba(22, 33, 58, 0.5)',
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 19,
  },
  action: { marginTop: SPACING.lg, paddingHorizontal: SPACING['2xl'] },
});
