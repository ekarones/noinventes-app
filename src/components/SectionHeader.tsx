import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, HIT_SLOP, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** The "Ver todas" link on the right. */
  action?: { label: string; onPress: () => void };
};

// The heading of a section inside a screen: an icon, the title, and optionally a
// link to the full list. Owns its own rhythm, so the six of them across the two
// dashboards can't drift apart.
export default function SectionHeader({ icon, title, action }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {/* The icon reads as part of the title, so it takes the title's colour.
            In the primary tint it was a second, louder thing next to the words —
            and the only element competing with the "Ver todas" link for the eye. */}
        <Ionicons name={icon} size={18} color={colors.textPrimary} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          activeOpacity={ROW_PRESS_OPACITY}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
        >
          <Text style={styles.link}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 1 },
  title: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  link: { fontSize: FONT_SIZE.bodySm, fontWeight: FONT_WEIGHT.medium, color: colors.primary },
});
