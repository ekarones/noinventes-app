import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../theme/tokens';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** The headline figure of the screen — filled with the primary colour. */
  highlight?: boolean;
};

// A single statistic on a dashboard. Both roles read the same four (total sales,
// count, items sold, average ticket) — from two identical copies, until now.
export default function KpiCard({ icon, label, value, highlight }: Props) {
  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <View style={[styles.icon, highlight && styles.iconHighlight]}>
        <Ionicons name={icon} size={20} color={highlight ? colors.textOnPrimary : colors.primary} />
      </View>
      <View style={styles.texts}>
        {/* Shrinks to fit rather than truncating a long total in the narrow card. */}
        <Text
          style={[styles.value, highlight && styles.textOnPrimary]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        <Text style={[styles.label, highlight && styles.textOnPrimarySoft]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// The two-column grid the cards wrap into.
export function KpiGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.sm,
    paddingTop: 0,
    // `sm`, matching the period pills and the catalogue's card gap.
    gap: SPACING.sm,
  },
  card: {
    // Just under half, so two fit per row; flexGrow then shares out the remainder.
    width: '47%',
    flexGrow: 1,
    // Icon on the left, the figure and its label stacked on the right — one row.
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
  },
  cardHighlight: { backgroundColor: colors.primary, borderColor: colors.primary },
  icon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHighlight: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  texts: { flex: 1 },
  value: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  label: { fontSize: FONT_SIZE.caption, color: colors.textSecondary, marginTop: SPACING.hairline },
  textOnPrimary: { color: colors.textOnPrimary },
  textOnPrimarySoft: { color: 'rgba(255, 255, 255, 0.85)' },
});
