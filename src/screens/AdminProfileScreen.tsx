import { useAuth } from '../context/AuthContext';
import ProfileScaffold from '../components/ProfileScaffold';

// Admin identity + session management. The mobile API only exposes `/me` and
// `/logout` for admins, so this screen is identity, session refresh and logout —
// all of which live in the shared ProfileScaffold.
export default function AdminProfileScreen() {
  const { user } = useAuth();

  return (
    <ProfileScaffold
      roleBadge={{ icon: 'shield-checkmark-outline', label: 'Administrador' }}
      rows={[
        { label: 'Nombre', value: user?.name ?? '—' },
        { label: 'Correo', value: user?.email ?? '—' },
        { label: 'Rol', value: 'Administrador' },
        { label: 'ID de usuario', value: user ? `#${user.id}` : '—' },
      ]}
    />
  );
}
