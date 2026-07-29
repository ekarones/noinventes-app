import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** The "Ver todas" link on the right. */
  action?: { label: string; onPress: () => void };
  /** Sits inside a Card instead of floating on the page: drops the page margins
   *  and the horizontal padding (the Card already pays those), keeping only the
   *  vertical rhythm to the rows below. */
  card?: boolean;
  /** Replaces the leading icon with a small primary-coloured dot. */
  dot?: boolean;
};

// The heading of a section inside a screen: an icon, the title, and optionally a
// link to the full list. Owns its own rhythm, so the six of them across the two
// dashboards can't drift apart.
export default function SectionHeader({ icon, title, action, card, dot }: Props) {
  return (
    <View style={[styles.header, card && styles.headerCard]}>
      <View style={styles.titleRow}>
        {/* The icon reads as part of the title, so it takes the title's colour.
            In the primary tint it was a second, louder thing next to the words —
            and the only element competing with the "Ver todas" link for the eye.
            A `dot` swaps it for a small primary bullet where a mark, not an icon,
            reads better. */}
        {dot ? (
          <View style={styles.dot} />
        ) : (
          <Ionicons name={icon} size={18} color={colors.textPrimary} />
        )}
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
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.md,
  },
  // Inside a Card: no page margins or side padding (the Card owns those); just a
  // top gap from the card edge and a small gap to the first row (which pays its
  // own top padding).
  headerCard: {
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexShrink: 1 },
  // A small primary bullet in the icon's slot. `RADIUS.pill` keeps it a circle at
  // any size; ~10dp reads as an intentional mark next to the 18dp title.
  dot: { width: 10, height: 10, borderRadius: RADIUS.pill, backgroundColor: colors.primary },
  title: {
    fontSize: FONT_SIZE.heading,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
  },
  link: { fontSize: FONT_SIZE.bodySm, fontFamily: FONT_FAMILY.medium, color: colors.primary },
});
