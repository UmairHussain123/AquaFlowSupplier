import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import EmptyState from '../../../Component/Common/EmptyState';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import Pill from '../../../Component/Common/Pill';
import RestrictedScreen from '../../../Component/People/RestrictedScreen';
import StaffCard from '../../../Component/People/StaffCard';
import {useDebounce} from '../../../hooks/useDebounce';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage, pluralize} from '../../../helper/helperFunction';
import {
  listStaff,
  revokeStaff,
  type StaffMember,
  type StaffRole,
  type StaffRoleOption,
  type StaffShopOption,
} from '../../../Server/Staff/StaffApi';

const PER_PAGE = 15;

type RoleFilter = 'all' | StaffRole;
type StatusFilter = 'all' | 'active' | 'suspended';

const ROLE_OPTIONS: {value: RoleFilter; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'supplier_manager', label: 'Managers'},
  {value: 'supplier_delivery_staff', label: 'Riders'},
];

// No "All" chip — an unselected status row means all statuses.
const STATUS_OPTIONS: {value: Exclude<StatusFilter, 'all'>; label: string}[] = [
  {value: 'active', label: 'Active'},
  {value: 'suspended', label: 'Suspended'},
];

/**
 * The owner's team — shop managers and delivery riders. Owner-only on the
 * API, so anyone else gets a short explanation instead of a 403.
 */
const StaffScreen: React.FC = () => {
  const {isOwner} = useSupplierRoles();

  if (!isOwner) {
    return (
      <RestrictedScreen
        title="Staff"
        heading="Owner only"
        message="Only the shop owner can add, edit or remove managers and riders."
      />
    );
  }

  return <StaffList />;
};

/** Page-numbered list; "Load more" appends the next page. */
const StaffList: React.FC = () => {
  const navigation = useNavigation<any>();

  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 350);

  const [rows, setRows] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRoleOption[]>([]);
  const [shops, setShops] = useState<StaffShopOption[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // Bumped on every fresh load so a slow response for old filters is dropped.
  const requestId = useRef(0);

  const fetchPage = useCallback(
    (pageNumber: number) =>
      listStaff({
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
        search: query || undefined,
        per_page: PER_PAGE,
        page: pageNumber,
      }),
    [role, status, query],
  );

  const load = useCallback(
    async (isRefresh = false) => {
      const id = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchPage(1);
        if (id !== requestId.current) return;
        setRows(res.data ?? []);
        setRoles(res.available_roles ?? []);
        setShops(res.shops ?? []);
        setPage(res.current_page || 1);
        setLastPage(res.last_page || 1);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (id !== requestId.current) return;
        const message = apiErrorMessage(err, 'Could not load your staff.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (page >= lastPage || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await fetchPage(page + 1);
      if (id !== requestId.current) return;
      setRows(prev => {
        const seen = new Set(prev.map(member => member.id));
        return [...prev, ...(res.data ?? []).filter(m => !seen.has(m.id))];
      });
      setPage(res.current_page || page + 1);
      setLastPage(res.last_page || 1);
      setTotal(res.total ?? total);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load more staff.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const revoke = (member: StaffMember) => {
    Alert.alert(
      `Remove ${member.name}?`,
      'They keep their account but can no longer use the supplier app for your shop. Suspend them instead to pause access for a while.',
      [
        {text: 'Keep', style: 'cancel'},
        {
          text: 'Remove access',
          style: 'destructive',
          onPress: async () => {
            setRevokingId(member.id);
            try {
              await revokeStaff(member.id);
              Toast.show({type: 'success', text1: `${member.name} removed`});
              await load();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: apiErrorMessage(err, "Couldn't remove this staff member."),
              });
            } finally {
              setRevokingId(null);
            }
          },
        },
      ],
    );
  };

  const openForm = (member?: StaffMember) =>
    navigation.navigate(Route.StaffFormScreen, {member, roles, shops});

  const filtered = role !== 'all' || status !== 'all' || !!query;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Staff"
        subtitle={
          loading && !rows.length
            ? 'Managers and riders'
            : `${pluralize(total, 'team member')} · managers and riders`
        }
        right={
          <TouchableOpacity onPress={() => openForm()} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            <AppInput
              compact
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, email or phone"
              autoCapitalize="none"
            />
            {/* Role and status share one scrolling row; tapping the selected
                status again goes back to all statuses. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              {ROLE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{selected: role === option.value}}
                  onPress={() => setRole(option.value)}>
                  <Pill
                    label={option.label}
                    tone={role === option.value ? 'primary' : 'neutral'}
                  />
                </TouchableOpacity>
              ))}
              <View style={styles.chipDivider} />
              {STATUS_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{selected: status === option.value}}
                  onPress={() =>
                    setStatus(status === option.value ? 'all' : option.value)
                  }>
                  <Pill
                    label={option.label}
                    tone={status === option.value ? 'primary' : 'neutral'}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            {loading && rows.length > 0 && (
              <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
            )}
          </View>
        }
        renderItem={({item}) => (
          <StaffCard
            member={item}
            revoking={revokingId === item.id}
            onPress={() => openForm(item)}
            onRevoke={() => revoke(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : error ? (
            <EmptyState
              title="Couldn't load your staff"
              message={error}
              actionLabel="Try again"
              onAction={() => load()}
            />
          ) : (
            <EmptyState
              title={filtered ? 'Nobody matches' : 'No staff yet'}
              message={
                filtered
                  ? 'Try another search, or clear the filters.'
                  : 'Add a manager to run the shop with you, or riders to deliver orders.'
              }
              actionLabel={filtered ? undefined : 'Add staff'}
              onAction={() => openForm()}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <LoadMoreFooter
              shown={rows.length}
              total={total}
              hasMore={page < lastPage}
              loading={loadingMore}
              onLoadMore={loadMore}
              noun="team members"
            />
            <Text style={styles.note}>
              Remove only ends their access to your shop — their account and
              order history stay. Suspend to pause access for a while.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addButtonText: {color: Colors.white, fontSize: 12.5, fontWeight: '800'},

  body: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 9},
  filters: {gap: 10, marginBottom: 1},
  chips: {gap: 6, alignItems: 'center', paddingRight: 16},
  chipDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  inlineLoader: {alignSelf: 'flex-start'},
  loader: {paddingVertical: 40},
  footer: {gap: 10},
  note: {
    fontSize: 11.5,
    color: Colors.textMuted,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
});

export default StaffScreen;
