import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminCompany, updateAdminCompany } from '../api/admin/company';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import PushedHeader from '../components/PushedHeader';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminCompany'>;

// The RUC is a Peruvian 11-digit tax id — the one hard rule the server also checks.
const RUC_RE = /^\d{11}$/;
const UBIGEO_RE = /^\d{6}$/;

export default function AdminCompanyScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [provincia, setProvincia] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [ubigeo, setUbigeo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const company = await fetchAdminCompany();
      // null = the store hasn't configured its issuer data yet; leave the form
      // blank for a first-time setup.
      if (company) {
        setRuc(company.ruc);
        setRazonSocial(company.razonSocial);
        setNombreComercial(company.nombreComercial);
        setDireccion(company.direccion ?? '');
        setDistrito(company.distrito ?? '');
        setProvincia(company.provincia ?? '');
        setDepartamento(company.departamento ?? '');
        setUbigeo(company.ubigeo ?? '');
      }
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los datos de la empresa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const rucValid = RUC_RE.test(ruc.trim());
  const ubigeoValid = ubigeo.trim().length === 0 || UBIGEO_RE.test(ubigeo.trim());
  const canSubmit = rucValid && razonSocial.trim().length > 0 && ubigeoValid && !saving;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await updateAdminCompany({
        ruc: ruc.trim(),
        razonSocial: razonSocial.trim(),
        // Blank falls back to the razón social server-side.
        nombreComercial: nombreComercial.trim(),
        direccion: direccion.trim() || null,
        distrito: distrito.trim() || null,
        provincia: provincia.trim() || null,
        departamento: departamento.trim() || null,
        ubigeo: ubigeo.trim() || null,
      });
      showToast('Datos de la empresa guardados', 'checkmark-circle');
      navigation.goBack();
    } catch (e: any) {
      // Server re-validates the RUC and required fields.
      Alert.alert('No se pudo guardar', e?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PushedHeader
        title="Datos de la empresa"
        onBack={() => navigation.goBack()}
        titleSize={22}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: load }}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* What this is for */}
            <View style={styles.warnBlock}>
              <Ionicons name="information-circle-outline" size={18} color="#B57F00" />
              <Text style={styles.warnText}>
                Estos datos identifican al emisor y se imprimen en la cabecera de cada boleta o
                factura.
              </Text>
            </View>

            {/* Identificación */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Identificación</Text>
              <View>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>RUC</Text>
                  <Text style={[styles.counter, rucValid ? styles.counterOk : styles.counterBad]}>
                    {rucValid ? '11 dígitos ✓' : `${ruc.trim().length}/11`}
                  </Text>
                </View>
                <TextInput
                  style={[styles.rucInput, ruc.length > 0 && !rucValid && styles.inputError]}
                  value={ruc}
                  onChangeText={(t) => setRuc(t.replace(/\D/g, '').slice(0, 11))}
                  placeholder="20123456789"
                  placeholderTextColor="rgba(22, 33, 58, 0.35)"
                  keyboardType="number-pad"
                  maxLength={11}
                />
              </View>
              <View>
                <Text style={styles.label}>Razón social</Text>
                <TextInput
                  style={styles.input}
                  value={razonSocial}
                  onChangeText={setRazonSocial}
                  placeholder="Mi Empresa S.A.C."
                  placeholderTextColor="rgba(22, 33, 58, 0.35)"
                  autoCapitalize="characters"
                />
              </View>
              <View>
                <Text style={styles.label}>Nombre comercial (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={nombreComercial}
                  onChangeText={setNombreComercial}
                  placeholder="Mi Tienda"
                  placeholderTextColor="rgba(22, 33, 58, 0.35)"
                />
                <Text style={styles.hint}>Si lo dejas vacío se usa la razón social.</Text>
              </View>
            </View>

            {/* Domicilio fiscal */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <Text style={styles.cardTitle}>Domicilio fiscal</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>opcional</Text>
                </View>
              </View>
              <View>
                <Text style={styles.label}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  value={direccion}
                  onChangeText={setDireccion}
                  placeholder="Av. Siempre Viva 742"
                  placeholderTextColor="rgba(22, 33, 58, 0.35)"
                />
              </View>
              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={styles.label}>Distrito</Text>
                  <TextInput
                    style={styles.input}
                    value={distrito}
                    onChangeText={setDistrito}
                    placeholder="Miraflores"
                    placeholderTextColor="rgba(22, 33, 58, 0.35)"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Provincia</Text>
                  <TextInput
                    style={styles.input}
                    value={provincia}
                    onChangeText={setProvincia}
                    placeholder="Lima"
                    placeholderTextColor="rgba(22, 33, 58, 0.35)"
                  />
                </View>
              </View>
              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={styles.label}>Departamento</Text>
                  <TextInput
                    style={styles.input}
                    value={departamento}
                    onChangeText={setDepartamento}
                    placeholder="Lima"
                    placeholderTextColor="rgba(22, 33, 58, 0.35)"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Ubigeo</Text>
                  <TextInput
                    style={[styles.input, !ubigeoValid && styles.inputError]}
                    value={ubigeo}
                    onChangeText={(t) => setUbigeo(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="150122"
                    placeholderTextColor="rgba(22, 33, 58, 0.35)"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
              <Text style={styles.hint}>Se usa en reportes y en el pie del ticket. Ubigeo: 6 dígitos.</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cta, !canSubmit && styles.ctaOff]}
              onPress={save}
              disabled={!canSubmit}
              activeOpacity={ROW_PRESS_OPACITY}
              accessibilityRole="button"
            >
              <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
                {saving ? 'Guardando…' : 'Guardar datos'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 18, gap: 12, paddingBottom: 24 },
    warnBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: '#FFF9E6',
      borderWidth: 1.5,
      borderColor: '#F5D98A',
      borderRadius: 16,
      padding: 12,
    },
    warnText: { flex: 1, fontSize: 12.5, fontFamily: FONT_FAMILY.extrabold, color: '#7A5600', lineHeight: 18 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 13,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
    },
    label: {
      fontSize: 11.5,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: 'rgba(22, 33, 58, 0.45)',
      marginBottom: 6,
    },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
    counter: { fontSize: 11, fontFamily: FONT_FAMILY.black },
    counterOk: { color: '#8A6400' },
    counterBad: { color: colors.error },
    tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: colors.fill },
    tagText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.5)' },
    input: {
      height: 50,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 15,
      fontFamily: FONT_FAMILY.extrabold,
      color: colors.primary,
    },
    rucInput: {
      height: 52,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 15,
      fontSize: 17,
      fontFamily: FONT_FAMILY.black,
      letterSpacing: 0.5,
      color: colors.primary,
    },
    inputError: { borderColor: '#E8836B' },
    twoCols: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    hint: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 7, lineHeight: 16 },

    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: '#E9EBF0',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
    },
    cta: { height: 58, borderRadius: 18, backgroundColor: '#FFC20E', alignItems: 'center', justifyContent: 'center' },
    ctaOff: { backgroundColor: '#EDEFF3' },
    ctaText: { fontSize: 17, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    ctaTextOff: { color: 'rgba(22, 33, 58, 0.35)' },
  });
