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
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import PushedHeader from '../components/PushedHeader';
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
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

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
      loadPage(page);
    } catch (e: any) {
      // The server 422s on self-deletion; its message explains why.
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminUser }) {
    const isMe = me?.id === item.id;
    const isAdmin = item.role === 'admin';
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, isAdmin ? styles.avatarAdmin : styles.avatarSeller]}>
          <Text style={[styles.avatarText, isAdmin ? styles.avatarTextAdmin : styles.avatarTextSeller]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {isMe && (
              <View style={styles.meBadge}>
                <Text style={styles.meText}>Tú</Text>
              </View>
            )}
          </View>
          <Text style={styles.email} numberOfLines={1}>
            {item.email}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.roleBadge, isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeSeller]}>
              <Text style={[styles.roleText, isAdmin ? styles.roleTextAdmin : styles.roleTextSeller]}>
                {isAdmin ? 'Administrador' : 'Vendedor'}
              </Text>
            </View>
            {item.branch && (
              <View style={styles.branchBadge}>
                <Text style={styles.branchText} numberOfLines={1}>
                  {item.branch.name}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminUserForm', { user: item })}
          style={styles.editBtn}
          activeOpacity={ROW_PRESS_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`Editar usuario ${item.name}`}
        >
          <Ionicons name="create-outline" size={15} color={colors.primary} />
        </TouchableOpacity>
        {/* Deleting yourself is rejected by the server — don't even offer it. */}
        {!isMe && (
          <TouchableOpacity
            onPress={() => confirmDelete(item)}
            style={styles.deleteBtn}
            activeOpacity={ROW_PRESS_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar usuario ${item.name}`}
          >
            <Ionicons name="trash-outline" size={15} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PushedHeader
        title="Usuarios"
        subtitle={meta ? `${meta.total} en el equipo` : undefined}
        onBack={() => navigation.goBack()}
        addAction={{ label: 'Nuevo', onPress: () => navigation.navigate('AdminUserForm', {}) }}
      />

      <View style={styles.filters}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre..."
          bordered
        />
        <View style={styles.roleChips}>
          {ROLE_FILTERS.map((r) => {
            const on = role === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleChip, on && styles.roleChipOn]}
                onPress={() => setRole(r.value)}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityRole="button"
              >
                <Text style={[styles.roleChipText, on && styles.roleChipTextOn]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
              title="Sin resultados"
              message="Prueba con otro nombre o cambia el rol."
            />
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    filters: {
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      paddingVertical: 12,
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor: '#E9EBF0',
    },
    roleChips: { flexDirection: 'row', gap: 7 },
    roleChip: { height: 34, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    roleChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleChipText: { fontSize: 12.5, fontFamily: FONT_FAMILY.black, color: 'rgba(22, 33, 58, 0.6)' },
    roleChipTextOn: { color: '#fff' },

    list: { padding: 18, gap: 10, flexGrow: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      shadowColor: '#16213a',
      shadowOpacity: 0.07,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    avatarAdmin: { backgroundColor: colors.primary },
    avatarSeller: { backgroundColor: '#FFC20E' },
    avatarText: { fontSize: 16, fontFamily: FONT_FAMILY.black },
    avatarTextAdmin: { color: '#FFC20E' },
    avatarTextSeller: { color: '#16213A' },
    info: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    name: { fontSize: 15, fontFamily: FONT_FAMILY.black, color: colors.primary, flexShrink: 1 },
    meBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#FFC20E' },
    meText: { fontSize: 10, fontFamily: FONT_FAMILY.black, color: '#16213A' },
    email: { fontSize: 12, fontFamily: FONT_FAMILY.bold, color: 'rgba(22, 33, 58, 0.5)', marginTop: 2 },
    badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 5 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    roleBadgeAdmin: { backgroundColor: '#E8EBF2' },
    roleBadgeSeller: { backgroundColor: colors.fill },
    roleText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black },
    roleTextAdmin: { color: colors.primary },
    roleTextSeller: { color: 'rgba(22, 33, 58, 0.6)' },
    branchBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#FFF3CF', maxWidth: 150 },
    branchText: { fontSize: 10.5, fontFamily: FONT_FAMILY.black, color: '#8A6400' },
    editBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: colors.controlBorder, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1.5, borderColor: '#F3CFC6', backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center' },
  });
