import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SIZE, FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Icon = keyof typeof Ionicons.glyphMap;

// The three rows that live inside a `Card`. The seller and the admin each had
// their own copy of the first two, byte for byte.

/** A label and its value, e.g. "Correo   maria@tienda.pe". */
export function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: Icon;
  label: string;
  value: string;
  /** Drops the separator — the last row of a card doesn't need one. */
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.border]}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** A row that navigates somewhere — carries a chevron. */
export function ActionRow({
  icon,
  label,
  hint,
  onPress,
  last,
}: {
  icon: Icon;
  label: string;
  /** A second line under the label, explaining where the row goes. */
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.border]}
      activeOpacity={ROW_PRESS_OPACITY}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.actionTexts}>
        <Text style={styles.actionLabel}>{label}</Text>
        {!!hint && <Text style={styles.actionHint}>{hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </TouchableOpacity>
  );
}

/** A single fact with an icon, no label — the customer, the date, the notes. */
export function MetaRow({ icon, text }: { icon: Icon; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.body, color: colors.textSecondary },
  value: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  iconBox: {
    width: SIZE.iconBox,
    height: SIZE.iconBox,
    borderRadius: RADIUS.control,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTexts: { flex: 1 },
  actionLabel: {
    fontSize: FONT_SIZE.body,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textPrimary,
  },
  actionHint: { fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.micro,
    color: colors.textSecondary,
    marginTop: SPACING.hairline,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  metaText: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.bodySm, color: colors.textPrimary, flex: 1 },
});
