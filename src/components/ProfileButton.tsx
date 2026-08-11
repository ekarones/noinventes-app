import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

type Props = {
  name?: string | null;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Render the raised amber pill (amber fill, navy hairline, drop shadow) — the
   *  same chip as the management headers. Used on the admin's navy header. */
  raised?: boolean;
};

// The profile button that rides in a tab-root header (5a). A rounded square with
// the user's initial: a white card with a navy initial on the seller's amber
// header, a translucent white square with a white initial on the admin's navy.
export default function ProfileButton({ name, onPress, accessibilityLabel, raised }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={ROW_PRESS_OPACITY}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Perfil'}
      style={[
        styles.button,
        raised
          ? styles.buttonRaised
          : { backgroundColor: colors.chromeButtonBg, borderColor: colors.chromeButtonBorder },
      ]}
    >
      <Text style={[styles.initial, raised && styles.initialRaised]}>
        {name?.charAt(0).toUpperCase() ?? '?'}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    button: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonRaised: {
      backgroundColor: '#ffc20e',
      borderColor: '#16213a',
      shadowColor: '#0A0F1C',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    initial: { fontSize: 18, fontFamily: FONT_FAMILY.black, color: colors.onChrome },
    initialRaised: { color: '#16213a' },
  });
