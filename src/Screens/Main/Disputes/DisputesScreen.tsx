import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import DisputeCard from '../../../Component/Cards/DisputeCard';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {setDisputeTab} from '../../../Redux/slices/filterSlice';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  isDisputeLive,
  listShopDisputes,
  type Dispute,
} from '../../../Server/Disputes/DisputesApi';

const PER_PAGE = 20;

type Tab = 'live' | 'closed' | 'all';

const TABS: {key: Tab; label: string}[] = [
  {key: 'live', label: 'Live'},
  {key: 'closed', label: 'Closed'},
  {key: 'all', label: 'All'},
];

/** open + investigating are Live, resolved + rejected are Closed. */
const matchesTab = (dispute: Dispute, tab: Tab) =>
  tab === 'all'
    ? true
    : tab === 'live'
    ? isDisputeLive(dispute)
    : !isDisputeLive(dispute);

/**
 * Jar disputes.
 *
 * The list endpoint takes no status filter, so the Live / Closed / All tabs
 * partition the pages loaded so far locally; "Load more" appends the next page.
 * Disputes are for owners and managers — a rider gets a no-access state.
 */
const DisputesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();
  const tab: Tab = useSelector((state: any) => state.filter.disputeTab) ?? 'live';

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped on every fresh load so a slow response can't overwrite a newer one.
  const requestId = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!shopId || !isShopManager) {
        setLoading(false);
        return;
      }
      const id = ++requestId.current;
      if (isRefresh) setRefreshing(true);

      try {
        const res = await listShopDisputes(shopId, {per_page: PER_PAGE, page: 1});
        if (id !== requestId.current) return;
        const rows = res.data ?? [];
        setDisputes(rows);
        setPage(res.current_page ?? 1);
        setLastPage(res.last_page ?? 1);
        setTotal(res.total ?? rows.length);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        const message = apiErrorMessage(err, 'Could not load your disputes.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [isShopManager, shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!shopId || loadingMore || page >= lastPage) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await listShopDisputes(shopId, {
        per_page: PER_PAGE,
        page: page + 1,
      });
      if (id !== requestId.current) return;
      // A dispute raised meanwhile shifts the pages — skip rows already shown.
      setDisputes(prev => [
        ...prev,
        ...(res.data ?? []).filter(row => !prev.some(seen => seen.id === row.id)),
      ]);
      setPage(res.current_page ?? page + 1);
      setLastPage(res.last_page ?? lastPage);
      setTotal(res.total ?? total);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load more disputes.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const visible = useMemo(
    () => disputes.filter(dispute => matchesTab(dispute, tab)),
    [disputes, tab],
  );

  const tabCount = (key: Tab) =>
    disputes.filter(dispute => matchesTab(dispute, key)).length;

  const raise = () => navigation.navigate(Route.RaiseDisputeScreen, {});

  if (!isShopManager) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Disputes" />
        <View style={styles.body}>
          <Card>
            <EmptyState
              title="For owners and managers"
              message="Jar disputes are raised and followed by the shop owner or manager. Tell them if a jar count or deposit doesn't add up."
            />
          </Card>
        </View>
      </View>
    );
  }

  if (!shopId) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Disputes" />
        <View style={styles.body}>
          <Card>
            <EmptyState
              title="No shop yet"
              message="No shop is linked to this account yet, so there are no disputes to show."
            />
          </Card>
        </View>
      </View>
    );
  }

  if (loading) return <ScreenLoader />;

  const emptyCopy: Record<Tab, {title: string; message: string}> = {
    live: {
      title: 'No open disputes',
      message: 'Raise a claim when a jar count, damage or deposit does not add up.',
    },
    closed: {
      title: 'Nothing closed yet',
      message: 'Decided disputes land here with the ops notes.',
    },
    all: {
      title: 'No disputes yet',
      message: 'Raise a claim when a jar count, damage or deposit does not add up.',
    },
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Disputes"
        subtitle="Jar count, damage and deposit claims"
        right={
          <TouchableOpacity onPress={raise} style={styles.newButton}>
            <Text style={styles.newButtonText}>Raise</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.tabs}>
            {TABS.map(({key, label}) => {
              const active = key === tab;
              const count = tabCount(key);
              return (
                <TouchableOpacity
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{selected: active}}
                  onPress={() => dispatch(setDisputeTab(key))}
                  style={[styles.tab, active && styles.tabActive]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {count ? `${label} · ${count}` : label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        renderItem={({item}) => (
          <DisputeCard
            dispute={item}
            onPress={() =>
              navigation.navigate(Route.DisputeDetailScreen, {disputeId: item.id})
            }
          />
        )}
        ListEmptyComponent={
          error && !disputes.length ? (
            <EmptyState
              title="Couldn't load your disputes"
              message={error}
              actionLabel="Try again"
              onAction={() => load(true)}
            />
          ) : (
            <EmptyState
              title={emptyCopy[tab].title}
              message={
                page < lastPage
                  ? `${emptyCopy[tab].message} Older disputes may be on the next page.`
                  : emptyCopy[tab].message
              }
              actionLabel={tab === 'closed' ? undefined : 'Raise a dispute'}
              onAction={raise}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <LoadMoreFooter
              shown={disputes.length}
              total={total}
              hasMore={page < lastPage}
              loading={loadingMore}
              onLoadMore={loadMore}
              noun="disputes"
            />
            <InfoNote>
              Investigating and deciding is done by ops. You raise the claim and
              watch for the decision, which arrives as a status, notes and any
              financial adjustment.
            </InfoNote>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  newButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  newButtonText: {color: Colors.white, fontSize: 12.5, fontWeight: '800'},

  body: {padding: 20, gap: 12, paddingBottom: 30},
  tabs: {flexDirection: 'row', gap: 18, paddingHorizontal: 2, marginBottom: 2},
  tab: {paddingBottom: 8, borderBottomWidth: 2.5, borderBottomColor: Colors.transparent},
  tabActive: {borderBottomColor: Colors.primary},
  tabText: {fontSize: 13.5, fontWeight: '600', color: Colors.textMuted},
  tabTextActive: {fontWeight: '800', color: Colors.text},
  footer: {gap: 12},
});

export default DisputesScreen;
