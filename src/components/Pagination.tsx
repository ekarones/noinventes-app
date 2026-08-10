import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

type Props = {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
  /** A page is in flight — the controls stay visible but stop accepting taps. */
  loading?: boolean;
};

// Which page numbers to draw. Always the first and the last, plus a window around
// the current one; the holes collapse into an ellipsis so the strip keeps its
// width whether there are 3 pages or 300.
function pageWindow(page: number, lastPage: number): (number | 'gap')[] {
  const wanted = [1, lastPage, page - 1, page, page + 1];
  const pages = [...new Set(wanted)].filter((p) => p >= 1 && p <= lastPage).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

// Numbered pagination (5a): a centred strip of pills. The current page fills in
// the role's chrome colour. Shows nothing when everything fits on one page.
export default function Pagination({ page, lastPage, onChange, loading }: Props) {
  const styles = useThemedStyles(makeStyles);
  if (lastPage <= 1) return null;

  return (
    <View style={styles.row}>
      {pageWindow(page, lastPage).map((p, i) =>
        p === 'gap' ? (
          <Text key={`gap-${i}`} style={styles.gap}>
            …
          </Text>
        ) : (
          <TouchableOpacity
            key={p}
            style={[styles.page, p === page && styles.pageActive]}
            onPress={() => onChange(p)}
            disabled={loading || p === page}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Página ${p}`}
            accessibilityState={{ selected: p === page }}
          >
            <Text style={[styles.pageText, p === page && styles.pageTextActive]}>{p}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 8,
      paddingTop: 18,
      paddingBottom: 4,
    },
    page: {
      minWidth: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    pageActive: { backgroundColor: colors.chromeFill, borderColor: colors.chromeFill },
    pageText: { fontSize: 13.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    pageTextActive: { color: colors.onChrome },
    gap: {
      minWidth: 16,
      textAlign: 'center',
      fontFamily: FONT_FAMILY.black,
      fontSize: 13.5,
      color: 'rgba(22, 33, 58, 0.4)',
    },
  });
