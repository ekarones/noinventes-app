import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { deleteUser, fetchAdminUsers } from '../api/admin/users';
import type { PaginationMeta } from '../api/products';
import { colors } from '../theme/colors';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
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
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user: me } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const query = useDebounce(searchText, 400);
  const [role, setRole] = useState<RoleFilter>('all');

  const roleParam = useMemo(() => (role === 'all' ? undefined : role), [role]);

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const { items, meta: m } = await fetchAdminUsers({
          search: query || undefined,
          role: roleParam,
          page: 1,
          perPage: PER_PAGE,
        });
        setUsers(items);
        setMeta(m);
      } catch (e: any) {
        setError(e?.message ?? 'No se pudieron cargar los usuarios.');
        setUsers([]);
        setMeta(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query, roleParam]
  );

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  async function loadMore() {
    if (!meta || loadingMore || meta.currentPage >= meta.lastPage) return;
    setLoadingMore(true);
    try {
      const { items, meta: m } = await fetchAdminUsers({
        search: query || undefined,
        role: roleParam,
        page: meta.currentPage + 1,
        perPage: PER_PAGE,
      });
      setUsers((prev) => [...prev, ...items]);
      setMeta(m);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }

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
      loadFirstPage();
    } catch (e: any) {
      // The server 422s on self-deletion; its message explains why.
      Alert.alert('No se pudo eliminar', e?.message ?? 'Inténtalo de nuevo.');
    }
  }

  function renderItem({ item }: { item: AdminUser }) {
    const isMe = me?.id === item.id;
    return (
      <View style={styles.row}>
        <View style={[styles.avatar, item.role === 'admin' && styles.avatarAdmin]}>
          <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
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
          hitSlop={8}
          style={styles.rowBtn}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        {/* Deleting yourself is rejected by the server — don't even offer it. */}
        {!isMe && (
          <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8} style={styles.rowBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usuarios</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminUserForm', {})}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ROLE_FILTERS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.chip, role === r.value && styles.chipActive]}
              onPress={() => setRole(r.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, role === r.value && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.muted}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFirstPage()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFirstPage(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>Sin usuarios</Text>
              <Text style={styles.muted}>Prueba con otra búsqueda o filtro.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  filters: { paddingHorizontal: 20 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary, height: '100%' },
  chips: { gap: 8, paddingVertical: 10, paddingRight: 8 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  muted: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  sep: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAdmin: { backgroundColor: colors.textPrimary },
  avatarText: { color: colors.textOnPrimary, fontSize: 18, fontWeight: '700' },
  rowInfo: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, flexShrink: 1 },
  meBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  meText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  rowEmail: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  roleBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeAdmin: { backgroundColor: '#e5e7eb' },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  roleTextAdmin: { color: colors.textPrimary },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 140,
  },
  branchText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  rowBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
