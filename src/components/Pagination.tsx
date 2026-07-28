import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  ROW_PRESS_OPACITY,
  SPACING,
  TOUCH_MIN,
} from '../theme/tokens';

type Props = {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
  /** A page is in flight — the controls stay visible but stop accepting taps. */
  loading?: boolean;
};

// Which page numbers to draw. Always the first and the last, plus a window
// around the current one; the holes between them collapse into an ellipsis, so
// the strip keeps its width whether there are 3 pages or 300.
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

// Numbered pagination for a paged list. Shows nothing at all when everything
// fits on one page — a lone "1" is noise, not navigation.
export default function Pagination({ page, lastPage, onChange, loading }: Props) {
  if (lastPage <= 1) return null;

  const canPrev = page > 1 && !loading;
  const canNext = page < lastPage && !loading;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.step, !canPrev && styles.disabled]}
        onPress={() => onChange(page - 1)}
        disabled={!canPrev}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Página anterior"
      >
        <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

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

      <TouchableOpacity
        style={[styles.step, !canNext && styles.disabled]}
        onPress={() => onChange(page + 1)}
        disabled={!canNext}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Página siguiente"
      >
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
  },
  // Same selectable shape as the filters: flat at rest, framed in primary with a
  // soft fill once it's the page you're on.
  page: {
    minWidth: TOUCH_MIN,
    height: TOUCH_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  pageActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pageText: {
    fontSize: FONT_SIZE.bodySm,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.textSecondary,
  },
  pageTextActive: { color: colors.primary },
  step: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.35 },
  gap: {
    minWidth: SPACING.lg,
    textAlign: 'center',
    fontSize: FONT_SIZE.bodySm,
    color: colors.textSecondary,
  },
});
