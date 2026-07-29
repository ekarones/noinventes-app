import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { deleteUser, fetchAdminUsers } from '../api/admin/users';
import { usePagedList } from '../hooks/usePagedList';
import { colors } from '../theme/colors';
import { FONT_SIZE, FONT_FAMILY, RADIUS, ROW_PRESS_OPACITY, SPACING, TOUCH_MIN } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Chip, { ChipRow } from '../components/Chip';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import type { AdminUser, AdminUserRole } from '../types';
import type { AdminMoreStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AdminMoreStackParamList, 'AdminUsers'>;

const PER_PAGE = 20;

type RoleFilter = 'all' | AdminUserRole;

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'seller', label: 'Vendedores' },
  { value: 'admin', label: 'Admins' },
];

export default function AdminUsersScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const { user: me } = useAuth();


  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  const [role, setRole] = useState<RoleFilter>('all');

  const roleParam = useMemo(() => (role === 'all' ? undefined : role), [role]);

  const fetchPage = useCallback(
    (page: number) => fetchAdminUsers({ search: query || undefined, role: roleParam, page, perPage: PER_PAGE }),
    [query, roleParam]
  );
  const {
    items: users,
    meta,
    page,
    loading,
    refreshing,
    error,
    listRef,
    loadPage,
  } = usePagedList<AdminUser>(fetchPage, 'No se pudieron cargar los usuarios.');

  // Runs on focus and whenever a filter changes — either way the result set is
  // new, so it starts at page 1.
  useFocusEffect(
    useCallback(() => {
      loadPage(1);
    }, [loadPage])
  );

  function confirmDelete(u: AdminUser) {
    Alert.alert('Eliminar usuario', `¿Eliminar a "${u.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(u) },
    ]);
  }

  async function doDelete(u: AdminUser) {
    try {
      await deleteUser(u.id);
      showToast('Usuario eliminado', 'checkmark-circle');
      // Stay on the page you were looking at; loadPage steps back if it emptied.
      loadPage(page);
    } catch (e: any) {
      // The server 422s on self-deletion; its message explains why.
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminUser }) {
    const isMe = me?.id === item.id;
    return (
      <View style={styles.row}>
        <Avatar name={item.name} style={item.role === 'admin' && styles.avatarAdmin} />
        <View style={styles.rowInfo}>
          <View style={styles.nameLine}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            {isMe && (
              <View style={styles.meBadge}>
                <Text style={styles.meText}>Tú</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowEmail} numberOfLines={1}>
            {item.email}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.roleBadge, item.role === 'admin' && styles.roleBadgeAdmin]}>
              <Text style={[styles.roleText, item.role === 'admin' && styles.roleTextAdmin]}>
                {item.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </Text>
            </View>
            {item.branch && (
              <View style={styles.branchBadge}>
                <Ionicons name="storefront-outline" size={11} color={colors.textSecondary} />
                <Text style={styles.branchText} numberOfLines={1}>
                  {item.branch.name}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminUserForm', { user: item })}
          style={styles.rowBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar usuario ${item.name}`}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        {/* Deleting yourself is rejected by the server — don't even offer it. */}
        {!isMe && (
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            style={styles.rowBtn}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar usuario ${item.name}`}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Usuarios"
        onBack={() => navigation.goBack()}
        action={{
          icon: 'add',
          onPress: () => navigation.navigate('AdminUserForm', {}),
          label: 'Nuevo usuario',
        }}
      />

      <View style={styles.filters}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre..."
        />
        <ChipRow>
          {ROLE_FILTERS.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              active={role === r.value}
              onPress={() => setRole(r.value)}
            />
          ))}
        </ChipRow>
      </View>

      {loading && users.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          message={error}
          action={{ label: 'Reintentar', onPress: () => loadPage(1) }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={users}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPage(page, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            <Pagination
              page={page}
              lastPage={meta?.lastPage ?? 1}
              onChange={loadPage}
              loading={loading}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Sin usuarios"
              message="Prueba con otra búsqueda o filtro."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { paddingHorizontal: SPACING.sm },
  list: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING['2xl'], flexGrow: 1 },
  sep: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  avatarAdmin: { backgroundColor: colors.textPrimary },
  rowInfo: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowName: { fontSize: FONT_SIZE.body, fontFamily: FONT_FAMILY.medium, color: colors.textPrimary, flexShrink: 1 },
  meBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.hairline, borderRadius: RADIUS.badge },
  meText: { fontSize: FONT_SIZE.badge, fontFamily: FONT_FAMILY.bold, color: colors.primary },
  rowEmail: { fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.micro, color: colors.textSecondary, marginTop: SPACING.hairline },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  roleBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.hairline, borderRadius: RADIUS.badge },
  roleBadgeAdmin: { backgroundColor: '#e5e7eb' },
  roleText: { fontSize: FONT_SIZE.badge, fontFamily: FONT_FAMILY.bold, color: colors.primary },
  roleTextAdmin: { color: colors.textPrimary },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.hairline,
    borderRadius: RADIUS.badge,
    maxWidth: 140,
  },
  branchText: { fontSize: FONT_SIZE.badge, color: colors.textSecondary, fontFamily: FONT_FAMILY.medium },
  rowBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
});
