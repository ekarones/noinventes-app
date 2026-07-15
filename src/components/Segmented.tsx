import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { CONTROL_HEIGHT, FONT_SIZE, FONT_WEIGHT, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Option<T> = { value: T; label: string };

type Props<T> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// A row of mutually-exclusive options that split the width evenly — the period
// selector on both dashboards (Hoy / Semana / Mes). Unlike a chip row it doesn't
// scroll: the options are few and fixed.
export default function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(o.value)}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    // It closes the pinned header block on both dashboards, so it owns the gap to
    // whatever comes below — the KPI grid no longer pads its own top.
    paddingBottom: SPACING.md,
  },
  option: {
    flex: 1,
    height: CONTROL_HEIGHT.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.textSecondary,
  },
  labelActive: { color: colors.textOnPrimary },
});
