import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../theme/tokens';

type Props = {
  /** A short line ABOVE the title — the greeting on the dashboards. */
  overline?: string;
  title: string;
  /** The line under the title (count, active sort…). */
  subtitle?: string;
  /** Controls on the right: sort, clear, QR, trash, "+"… */
  actions?: ReactNode;
  /** Search bar, filter chips — anything that belongs to the header block. */
  children?: ReactNode;
};

// The header of a tab-root screen (Inicio, Catálogo, Ventas): a big title, an
// optional greeting above it and summary line below it, and the screen's actions
// on the right.
//
// The seller and the admin see the same screens with different scopes, so their
// headers must be the same object — not two that merely look alike. They had
// already started to drift (one had 8px of bottom padding, the other 4).
export default function ScreenTitle({ overline, title, subtitle, actions, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
      <View style={[styles.row, !!overline && styles.rowCentered, !!children && styles.rowSpaced]}>
        <View style={styles.texts}>
          {!!overline && <Text style={styles.overline}>{overline}</Text>}
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {!!actions && <View style={styles.actions}>{actions}</View>}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xs },
  row: {
    flexDirection: 'row',
    // Actions hang off the title itself, so they line up with it and not with the
    // subtitle that trails underneath.
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  // With an overline the title block is taller than the action beside it, and
  // top-aligning would pin the action to the greeting instead of the title.
  rowCentered: { alignItems: 'center' },
  // The gap only exists to separate the title from what the header holds below it
  // (a search bar, a chip row). With no children there is nothing to separate.
  rowSpaced: { marginBottom: SPACING.md },
  texts: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  overline: { fontSize: FONT_SIZE.body, color: colors.textSecondary, marginBottom: SPACING.hairline },
  title: {
    fontSize: FONT_SIZE.screenTitle,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  subtitle: { fontSize: FONT_SIZE.bodySm, color: colors.textSecondary, marginTop: SPACING.hairline },
});
