import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY } from '../theme/tokens';

type Props = {
  /** A short line ABOVE the title — the greeting on the dashboards. */
  overline?: string;
  title: string;
  /** The line under the title (branch / global context, count, active sort…). */
  subtitle?: string;
  /** Controls on the right: the profile button, sort, QR… aligned to the title. */
  actions?: ReactNode;
  /** Search bar, filter chips — anything that belongs to the header block. */
  children?: ReactNode;
};

// The header of a tab-root screen (Inicio, Catálogo, Ventas) in the 5a language: a
// colour panel with a decorative corner circle, a big title with an optional
// greeting above and context line below, and the screen's actions on the right.
//
// The seller and the admin see the same screens with different scopes, so their
// headers are the same object — the panel colour is what tells the roles apart
// (amber for the seller, navy for the admin).
export default function ScreenTitle({ overline, title, subtitle, actions, children }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      {/* A solid disc, clipped to the header — a bright arc in the top-right. */}
      <View style={styles.circle} pointerEvents="none" />

      <View style={[styles.row, !!children && styles.rowSpaced]}>
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 22,
      paddingBottom: 20,
      backgroundColor: colors.chromeFill,
      overflow: 'hidden',
    },
    circle: {
      position: 'absolute',
      width: 270,
      height: 270,
      borderRadius: 999,
      backgroundColor: colors.headerCircle,
      top: -120,
      right: -90,
    },
    row: {
      flexDirection: 'row',
      // Actions align to the title's top edge, not the greeting or context.
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    // The gap only exists to separate the title block from what the header holds
    // below it (a search bar, a chip row).
    rowSpaced: { marginBottom: 12 },
    texts: { flex: 1 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    overline: { fontFamily: FONT_FAMILY.bold, fontSize: 14.5, color: colors.onChromeMuted },
    title: {
      fontSize: 30,
      letterSpacing: -0.9,
      fontFamily: FONT_FAMILY.black,
      color: colors.onChrome,
      marginTop: 2,
    },
    subtitle: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12.5,
      color: colors.onChromeMuted,
      marginTop: 4,
    },
  });
