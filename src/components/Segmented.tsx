import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

export type SegmentedOption<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
};

// The pill-track segmented toggle from the 5a language (the dashboards' period
// switch). The active segment lifts to white, framed by the role's chrome colour
// (amber for the seller, navy for the admin); the rest sit flat on the track.
export default function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => onChange(opt.id)}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && [styles.segmentActive, { borderColor: colors.chromeFill }]]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    track: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      backgroundColor: colors.fill,
      padding: 4,
      borderRadius: 14,
    },
    segment: {
      flex: 1,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    segmentActive: {
      backgroundColor: colors.surface,
      shadowColor: '#16213a',
      shadowOpacity: 0.14,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    // The track sits on a WHITE band (not the chrome), so the idle label is a
    // muted navy for both roles — never the role's on-chrome colour.
    label: {
      fontSize: 13.5,
      fontFamily: FONT_FAMILY.black,
      color: 'rgba(22, 33, 58, 0.55)',
    },
    // Navy label on the raised white segment, for both roles.
    labelActive: { color: colors.primary },
  });
