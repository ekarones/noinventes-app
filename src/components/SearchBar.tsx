import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SIZE, FONT_FAMILY, CONTROL_HEIGHT, FONT_SIZE, HIT_SLOP, RADIUS, ROW_PRESS_OPACITY, SPACING } from '../theme/tokens';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

// The search box of every list screen. The clear "✕" only appears once there's
// something to clear, and it's the reason this is a component: six screens each
// re-implemented it, and each had to remember its own hit slop and label.
export default function SearchBar({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.disc}>
        <Ionicons name="search" size={18} color={colors.primary} />
      </View>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
      />

      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          activeOpacity={ROW_PRESS_OPACITY}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
        >
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    // Same box as the filter pills: white with a transparent border, fully
    // rounded, and the same `pill` height — so the whole header row lines up.
    backgroundColor: colors.surface,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    // The disc brings its own visual margin, so the left padding shrinks.
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.md,
    height: CONTROL_HEIGHT.pill,
  },
  // Circular via RADIUS.pill, never width/2 — the same primary-tinted disc the
  // filter and sort pills carry, so the whole header row reads as one family.
  disc: {
    width: SIZE.disc,
    height: SIZE.disc,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { fontFamily: FONT_FAMILY.regular,
    flex: 1,
    height: '100%',
    fontSize: FONT_SIZE.subheading,
    color: colors.textPrimary,
  },
});
