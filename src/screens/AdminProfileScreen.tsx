import { useAuth } from '../context/AuthContext';
import { InfoRow } from '../components/Row';
import ProfileScaffold from '../components/ProfileScaffold';

// Admin identity + session management. The mobile API only exposes `/me` and
// `/logout` for admins, so this screen is identity, session refresh and logout —
// all of which live in the shared ProfileScaffold.
export default function AdminProfileScreen() {
  const { user } = useAuth();

  return (
    <ProfileScaffold
      roleBadge={{ icon: 'shield-checkmark-outline', label: 'Administrador' }}
      infoRows={
        <>
          <InfoRow icon="person-outline" label="Nombre" value={user?.name ?? '—'} />
          <InfoRow icon="mail-outline" label="Correo" value={user?.email ?? '—'} />
          <InfoRow icon="pricetag-outline" label="Rol" value="Administrador" />
          <InfoRow
            icon="finger-print-outline"
            label="ID de usuario"
            value={user ? `#${user.id}` : '—'}
            last
          />
        </>
      }
    />
  );
}
