import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../theme/tokens';
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
};

// The placeholder shown when a list is empty or a request failed. Centralised so
// "nothing here" and "it broke" always read the same way: a muted icon, a short
// title, one line of explanation, and — when the user can do something about it —
// a single action.
export default function EmptyState({ icon, title, message, action }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.border} />
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
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZE.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 21,
  },
  action: { marginTop: SPACING.xl, paddingHorizontal: SPACING['2xl'] },
});
