import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, HIT_SLOP, ROW_PRESS_OPACITY } from '../theme/tokens';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Kept for call-site compatibility; the 5a box is always bordered. */
  bordered?: boolean;
  /** A small amber chip before "LIMPIAR" — e.g. "N° EXACTO" when the query is a
   *  sale number. Omit for none. */
  badge?: string | null;
};

// The search box of every list screen (5a): a leading magnifier, the input, an
// optional context chip, and a "LIMPIAR" text button that only appears once
// there's something to clear.
export default function SearchBar({ value, onChangeText, placeholder, badge }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.box}>
      <Ionicons name="search" size={17} color="rgba(22, 33, 58, 0.45)" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(22, 33, 58, 0.4)"
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
      />
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          activeOpacity={ROW_PRESS_OPACITY}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
        >
          <Text style={styles.clear}>LIMPIAR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: '#e6e8ee',
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      height: '100%',
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      color: colors.primary,
    },
    clear: { fontSize: 12, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.5)' },
    // Themed so it reads on either role's header band: amber-soft for the seller,
    // navy-light for the admin.
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.tabActiveBg },
    badgeText: { fontSize: 10, fontFamily: FONT_FAMILY.black, color: colors.primary },
  });
