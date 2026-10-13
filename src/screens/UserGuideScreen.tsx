import { useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import PushedHeader from '../components/PushedHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Section = { id: string; icon: keyof typeof Ionicons.glyphMap; title: string; steps: string[] };

// Guide shown to a seller — the POS flow end to end.
const SELLER_SECTIONS: Section[] = [
  {
    id: 'login',
    icon: 'log-in-outline',
    title: 'Iniciar sesión',
    steps: [
      'Ingresá el código de tu tienda (subdominio), tu correo y contraseña.',
      'Si olvidaste tus datos, pedíselos al administrador de tu comercio.',
    ],
  },
  {
    id: 'inicio',
    icon: 'home-outline',
    title: 'Inicio',
    steps: [
      'Ve tus ventas de hoy, la semana o el mes con el selector de período.',
      'Mira tu total vendido, cantidad de ventas, ticket promedio y tus productos más vendidos.',
      'Tocá una venta reciente para ver su detalle.',
    ],
  },
  {
    id: 'catalogo',
    icon: 'grid-outline',
    title: 'Catálogo',
    steps: [
      'Buscá por nombre o código, o filtrá por categoría.',
      'Usá el escáner (ícono de QR) para agregar un producto al toque escaneando su etiqueta.',
      'Tocá un producto para ver su detalle; en los variables elegí la variación (color, talla…).',
      'Tocá "Agregar" para sumarlo al carrito.',
    ],
  },
  {
    id: 'carrito',
    icon: 'cart-outline',
    title: 'Carrito',
    steps: [
      'Ajustá las cantidades con + / −, o deslizá para quitar un producto.',
      'Podés aplicar un descuento al total.',
      'Tocá "Ir a cobrar" cuando esté listo.',
    ],
  },
  {
    id: 'cobrar',
    icon: 'card-outline',
    title: 'Cobrar',
    steps: [
      'Escribí el nombre del cliente (opcional) y elegí el método de pago.',
      'Tocá "Cobrar" para registrar la venta y ver la boleta.',
      'Para cobrar con tarjeta/Yape, elegí "Link Culqi": se genera un QR que el cliente escanea y paga desde su teléfono.',
    ],
  },
  {
    id: 'ventas',
    icon: 'receipt-outline',
    title: 'Ventas (historial)',
    steps: [
      'Buscá por cliente o por N° de venta, y filtrá por fecha o método de pago.',
      'Abrí una venta para ver su boleta, compartirla o imprimirla.',
      'Podés anular una venta: el stock vuelve a tu sucursal.',
    ],
  },
  {
    id: 'chat',
    icon: 'chatbubble-ellipses-outline',
    title: 'Chat de ayuda',
    steps: [
      'Tocá el botón flotante de chat para preguntarle al asistente.',
      'Probá con "¿Cuánto vendí hoy?" o "Productos más vendidos".',
    ],
  },
  {
    id: 'perfil',
    icon: 'person-outline',
    title: 'Perfil',
    steps: [
      'Revisá tus datos y tu sucursal asignada.',
      '"Sincronizar sesión" actualiza tu perfil si el administrador cambió algo.',
      'Contactá soporte o cerrá sesión desde aquí.',
    ],
  },
];

// Guide shown to an admin — management plus selling from the POS.
const ADMIN_SECTIONS: Section[] = [
  {
    id: 'inicio',
    icon: 'stats-chart-outline',
    title: 'Inicio (panel general)',
    steps: [
      'KPIs de todo el comercio: total vendido, ventas, ticket promedio.',
      'Filtrá por período y por sucursal.',
      'Revisá productos con stock bajo y las estadísticas de compras a proveedores.',
      'Ve ventas por sucursal, por vendedor y los más vendidos.',
    ],
  },
  {
    id: 'vender',
    icon: 'cart-outline',
    title: 'Vender (modo venta)',
    steps: [
      'Entrá a modo venta desde tu Perfil → "Entrar a modo venta".',
      'Armá el carrito desde el catálogo y, en Cobrar, elegí la sucursal donde se registra la venta.',
      'En "Ventas" ves solo las que vos registraste; para ver todas usá Ventas del panel.',
      'Volvé al panel desde Perfil → "Volver al panel de administración".',
    ],
  },
  {
    id: 'ventas',
    icon: 'receipt-outline',
    title: 'Ventas (todas)',
    steps: [
      'Ve todas las ventas del comercio, de cualquier vendedor y sucursal.',
      'Filtrá por fecha, método, sucursal o vendedor.',
      'Abrí una venta para su boleta, imprimirla o anularla.',
    ],
  },
  {
    id: 'catalogo',
    icon: 'cube-outline',
    title: 'Catálogo (productos)',
    steps: [
      'Creá y editá productos (simples o variables) con imágenes y descripciones.',
      'En variables, cargá las variaciones (color, talla…) y sus precios.',
      'Editá el stock por sucursal. Los eliminados quedan en la Papelera para restaurar.',
    ],
  },
  {
    id: 'gestion',
    icon: 'options-outline',
    title: 'Gestión (Más)',
    steps: [
      'Organizá el catálogo: categorías, etiquetas y atributos.',
      'Administrá sucursales y usuarios (vendedores y admins).',
      'Cargá los datos de la empresa (emisor de las boletas).',
      'Imprimí etiquetas (stickers con QR) de tus productos.',
    ],
  },
  {
    id: 'abastecimiento',
    icon: 'briefcase-outline',
    title: 'Abastecimiento',
    steps: [
      'Registrá proveedores (RUC, contacto…).',
      'Creá órdenes de compra: borrador → enviada → recibida.',
      'Al marcar una orden como recibida, el stock entra automáticamente a la sucursal.',
    ],
  },
  {
    id: 'cobros',
    icon: 'card-outline',
    title: 'Cobros con tarjeta (Culqi)',
    steps: [
      'Generá un cobro con link: monto, descripción y vigencia.',
      'Compartí el enlace por WhatsApp o mostrá el QR para que el cliente pague con tarjeta o Yape.',
      'La pantalla se actualiza sola cuando el cliente paga (cobrado / rechazado / vencido).',
    ],
  },
  {
    id: 'chat',
    icon: 'chatbubble-ellipses-outline',
    title: 'Chat de ayuda',
    steps: [
      'Tocá el botón flotante de chat para consultarle al asistente.',
      'Probá con "ventas por sucursal" o "productos con poco stock".',
    ],
  },
  {
    id: 'perfil',
    icon: 'person-outline',
    title: 'Perfil',
    steps: [
      'Revisá tus datos de administrador.',
      '"Sincronizar sesión" refresca tu perfil sin cerrar sesión.',
      'Cerrá sesión desde aquí.',
    ],
  },
];

export default function UserGuideScreen() {
  const navigation = useNavigation();
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const sections = isAdmin ? ADMIN_SECTIONS : SELLER_SECTIONS;

  // Start with the first section open so the screen isn't a wall of closed rows.
  const [open, setOpen] = useState<Record<string, boolean>>({ [sections[0].id]: true });

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Guía de uso"
        subtitle={isAdmin ? 'Cómo administrar y vender' : 'Cómo usar el punto de venta'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Un repaso rápido de cada sección. Tocá un tema para ver los pasos.
        </Text>

        {sections.map((s) => {
          const isOpen = !!open[s.id];
          return (
            <View key={s.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggle(s.id)}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={s.icon} size={19} color="#8A6400" />
                </View>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="rgba(22, 33, 58, 0.4)"
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.steps}>
                  {s.steps.map((step, i) => (
                    <View key={i} style={styles.step}>
                      <View style={styles.bullet} />
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.footer}>
          ¿Dudas? Usá el chat de ayuda o Contactar soporte desde tu Perfil.
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 10, paddingBottom: 28 },
    intro: { fontSize: 13, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, lineHeight: 18, marginBottom: 2 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: '#FFF3CF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { flex: 1, fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary },
    steps: { paddingHorizontal: 16, paddingBottom: 15, paddingTop: 2, gap: 9 },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.chromeFill, marginTop: 6 },
    stepText: { flex: 1, fontSize: 13.5, fontFamily: FONT_FAMILY.medium, color: colors.primary, lineHeight: 19 },
    footer: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  });
