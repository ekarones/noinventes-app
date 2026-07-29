import { Alert, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ActionRow, InfoRow } from '../components/Row';
import Card from '../components/Card';
import ProfileScaffold, { ProfileOverline } from '../components/ProfileScaffold';

// Support contact — reemplazar con los datos reales de monatekeda.
// WhatsApp: solo dígitos con código de país (ej. '51999888777'). Deja '' para
// usar el correo. Si ambos están vacíos, la fila avisa que no está configurado.
const SUPPORT_WHATSAPP = '51953253845';
const SUPPORT_EMAIL = 'mizonaonline69@gmail.com';

export default function ProfileScreen() {
  const { user } = useAuth();

  function openSupport() {
    if (SUPPORT_WHATSAPP) {
      Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`).catch(openEmail);
    } else if (SUPPORT_EMAIL) {
      openEmail();
    } else {
      Alert.alert('Soporte', 'Aún no se configuró el contacto de soporte.');
    }
  }

  function openEmail() {
    if (SUPPORT_EMAIL) Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  }

  return (
    <ProfileScaffold
      roleBadge={{ icon: 'storefront-outline', label: user?.branch?.name ?? 'Vendedor' }}
      infoRows={
        <>
          <InfoRow icon="person-outline" label="Nombre" value={user?.name ?? '—'} />
          <InfoRow icon="mail-outline" label="Correo" value={user?.email ?? '—'} />
          <InfoRow
            icon="pricetag-outline"
            label="Rol"
            value={user?.role === 'seller' ? 'Vendedor' : user?.role ?? '—'}
          />
          <InfoRow icon="storefront-outline" label="Sucursal" value={user?.branch?.name ?? '—'} />
          <InfoRow
            icon="finger-print-outline"
            label="ID de vendedor"
            value={user ? `#${user.id}` : '—'}
            last
          />
        </>
      }
      extra={
        <>
          <ProfileOverline>Ayuda</ProfileOverline>
          <Card inset>
            <ActionRow
              icon="chatbubble-ellipses-outline"
              label="Contactar soporte"
              onPress={openSupport}
              last
            />
          </Card>
        </>
      }
    />
  );
}
