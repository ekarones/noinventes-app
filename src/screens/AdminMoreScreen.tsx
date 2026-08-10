import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenTitle from '../components/ScreenTitle';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminMore'>;

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// Only the param-less destinations of this hub.
type Route =
  | 'AdminCategories'
  | 'AdminTags'
  | 'AdminAttributes'
  | 'AdminBranches'
  | 'AdminUsers'
  | 'AdminCompany';
type Row = { icon: keyof typeof Ionicons.glyphMap; name: string; desc: string; route: Route };
type Group = { title: string; tint: 'amber' | 'navy'; rows: Row[] };

// Hub for the master-catalog / management sections. Rows get added here as new
// admin modules ship.
const GROUPS: Group[] = [
  {
    title: 'Catálogo maestro',
    tint: 'amber',
    rows: [
      { icon: 'folder-outline', name: 'Categorías', desc: 'Organiza el árbol del catálogo', route: 'AdminCategories' },
      { icon: 'pricetags-outline', name: 'Etiquetas', desc: 'Tags que agrupan productos', route: 'AdminTags' },
      { icon: 'options-outline', name: 'Atributos', desc: 'Color, Talla… y sus valores', route: 'AdminAttributes' },
    ],
  },
  {
    title: 'Organización',
    tint: 'navy',
    rows: [
      { icon: 'storefront-outline', name: 'Sucursales', desc: 'Puntos de venta e inventario', route: 'AdminBranches' },
      { icon: 'people-outline', name: 'Usuarios', desc: 'Vendedores y administradores', route: 'AdminUsers' },
    ],
  },
  {
    title: 'Facturación',
    tint: 'navy',
    rows: [
      { icon: 'business-outline', name: 'Datos de la empresa', desc: 'Emisor de las boletas y facturas', route: 'AdminCompany' },
    ],
  },
];

export default function AdminMoreScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <ScreenTitle title="Gestión" subtitle="Catálogo maestro, organización y facturación" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.overline}>{group.title}</Text>
            <View style={styles.card}>
              {group.rows.map((r, i) => (
                <TouchableOpacity
                  key={r.route}
                  style={[styles.row, i > 0 && styles.rowDivided]}
                  onPress={() => navigation.navigate(r.route as never)}
                  activeOpacity={ROW_PRESS_OPACITY}
                  accessibilityRole="button"
                >
                  <View style={[styles.iconBox, group.tint === 'amber' ? styles.iconAmber : styles.iconNavy]}>
                    <Ionicons
                      name={r.icon}
                      size={20}
                      color={group.tint === 'amber' ? '#8A6400' : '#16213A'}
                    />
                  </View>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowName}>{r.name}</Text>
                    <Text style={styles.rowDesc}>{r.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(22, 33, 58, 0.3)" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.credit}>Versión {APP_VERSION} · MiZonaOnline.com</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 18, paddingBottom: 24 },
    group: { gap: 8 },
    overline: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15 },
    rowDivided: { borderTopWidth: 1, borderTopColor: '#EEF0F4' },
    iconBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    iconAmber: { backgroundColor: '#FFF3CF' },
    iconNavy: { backgroundColor: '#E8EBF2' },
    rowTexts: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    rowDesc: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    credit: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.4)', textAlign: 'center', marginTop: 2 },
  });
