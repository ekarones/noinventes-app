import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';

type Props = {
  label: string;
  value: string;
  /** Colour of the accent bar — amber for money figures, navy for counts. */
  accent: string;
};

// A single statistic on a dashboard (5a): a white card topped by a short accent
// bar, the figure in navy and its label below. Both roles read the same four
// (total sales, count, items sold, average ticket) from one component.
export default function KpiCard({ label, value, accent }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      {/* Shrinks to fit rather than truncating a long total in the narrow card. */}
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// The two-column grid the cards wrap into. The parent screen owns the outer
// margin, so the grid only spaces the cards from each other.
export function KpiGrid({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.grid}>{children}</View>;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: {
      // Just under half, so two fit per row; flexGrow then shares the remainder.
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    accent: { width: 26, height: 4, borderRadius: 2, marginBottom: 11 },
    value: { fontSize: 22, fontFamily: FONT_FAMILY.black, color: colors.primary, letterSpacing: -0.4 },
    label: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 3 },
  });
