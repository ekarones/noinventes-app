import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_WEIGHT, ROW_PRESS_OPACITY } from '../theme/tokens';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminMore'>;

// Hub for the master-catalog / management sections. Rows get added here as new
// admin modules ship (atributos, sucursales, usuarios).
export default function AdminMoreScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Gestión</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Catálogo maestro</Text>
        <View style={styles.card}>
          <Row
            icon="folder-outline"
            label="Categorías"
            hint="Organiza el árbol del catálogo"
            onPress={() => navigation.navigate('AdminCategories')}
          />
          <Row
            icon="pricetags-outline"
            label="Etiquetas"
            hint="Tags que agrupan productos"
            onPress={() => navigation.navigate('AdminTags')}
          />
          <Row
            icon="options-outline"
            label="Atributos"
            hint="Color, Talla… y sus valores"
            onPress={() => navigation.navigate('AdminAttributes')}
            last
          />
        </View>

        <Text style={styles.sectionTitle}>Organización</Text>
        <View style={styles.card}>
          <Row
            icon="storefront-outline"
            label="Sucursales"
            hint="Puntos de venta e inventario"
            onPress={() => navigation.navigate('AdminBranches')}
          />
          <Row
            icon="people-outline"
            label="Usuarios"
            hint="Vendedores y administradores"
            onPress={() => navigation.navigate('AdminUsers')}
            last
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  hint,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      activeOpacity={ROW_PRESS_OPACITY}
      onPress={onPress}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: FONT_SIZE.screenTitle, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  sectionTitle: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, color: colors.textPrimary },
  rowHint: { fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: 1 },
});
