import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

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
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
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
          <View style={styles.linkWrap}>
            <Text style={styles.link}>{action.label}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  // A bullet in the role's chrome colour (amber for the seller, navy for the
  // admin). `RADIUS.pill` keeps it a circle at any size.
  dot: { width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: colors.chromeFill },
  title: {
    fontSize: 16.5,
    fontFamily: FONT_FAMILY.black,
    color: colors.primary,
  },
  // "Ver todas": navy label underlined in amber.
  linkWrap: { borderBottomWidth: 2, borderBottomColor: colors.chromeFill, paddingBottom: 2 },
  link: { fontSize: 13, fontFamily: FONT_FAMILY.extrabold, color: colors.primary },
});
