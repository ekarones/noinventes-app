import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

type Props = {
  title: string;
  /** A context line under the title (product name, count…). */
  subtitle?: string;
  onBack: () => void;
  /** The management screens use 24; the form screens use 22. */
  titleSize?: number;
  /** The amber "+" action pill on the right (Nueva categoría / Nuevo atributo). */
  addAction?: { label: string; onPress: () => void };
  /** Any other right-side node (overrides `addAction`). */
  actions?: ReactNode;
};

// The header of a "big" pushed screen (5a): a colour panel with a decorative
// circle, a white-card back button, a large title with an optional subtitle, and
// an optional right action. Amber for the seller, navy for the admin (which is
// where these management/form screens live).
export default function PushedHeader({
  title,
  subtitle,
  onBack,
  titleSize = 24,
  addAction,
  actions,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.circle} pointerEvents="none" />
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={22} color={colors.onChrome} />
        </TouchableOpacity>

        <View style={styles.texts}>
          <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {actions
          ? actions
          : addAction && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={addAction.onPress}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
                accessibilityLabel={addAction.label}
              >
                <Text style={styles.addPlus}>+</Text>
                <Text style={styles.addText}>{addAction.label}</Text>
              </TouchableOpacity>
            )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    header: { paddingHorizontal: 18, paddingBottom: 16, backgroundColor: colors.chromeFill, overflow: 'hidden' },
    circle: {
      position: 'absolute',
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.headerCircle,
      top: -152,
      right: -98,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.chromeButtonBg,
      borderWidth: 2,
      borderColor: colors.chromeButtonBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texts: { flex: 1, minWidth: 0 },
    title: { letterSpacing: -0.6, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    subtitle: { fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: colors.onChromeMuted, marginTop: 2 },
    // The amber "+" pill on the navy header — a navy hairline + shadow so it reads
    // as a raised chip over the amber decorative circle.
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: '#FFC20E',
      borderWidth: 2,
      borderColor: '#16213A',
      shadowColor: '#0A0F1C',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    addPlus: { fontSize: 18, fontFamily: FONT_FAMILY.black, color: '#16213A', lineHeight: 20 },
    addText: { fontSize: 14, fontFamily: FONT_FAMILY.black, color: '#16213A' },
  });
