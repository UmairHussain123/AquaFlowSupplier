import React, {useCallback, useMemo, useState} from 'react';
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
import DisputeCard from '../../../Component/Cards/DisputeCard';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {setDisputeTab} from '../../../Redux/slices/filterSlice';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  isDisputeLive,
  listShopDisputes,
  type Dispute,
} from '../../../Server/Disputes/DisputesApi';

/**
 * Jar disputes.
 *
 * The list endpoint takes no status filter, so the Live / Closed tabs partition
 * the current page locally: open + investigating are Live, resolved + rejected
 * are Closed.
 */
const DisputesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const tab = useSelector((state: any) => state.filter.disputeTab);

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!shopId) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      try {
        const page = await listShopDisputes(shopId, {per_page: 50});
        setDisputes(page.data ?? []);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: apiErrorMessage(error, 'Could not load your disputes.'),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(
    () =>
      disputes.filter(dispute =>
        tab === 'live' ? isDisputeLive(dispute) : !isDisputeLive(dispute),
      ),
    [disputes, tab],
  );

  const liveCount = disputes.filter(isDisputeLive).length;

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Disputes"
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate(Route.RaiseDisputeScreen, {})}
            style={styles.newButton}>
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
            {(['live', 'closed'] as const).map(key => {
              const active = key === tab;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => dispatch(setDisputeTab(key))}
                  style={[styles.tab, active && styles.tabActive]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {key === 'live'
                      ? `Live${liveCount ? ` · ${liveCount}` : ''}`
                      : 'Closed'}
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
          <EmptyState
            title={tab === 'live' ? 'No open disputes' : 'Nothing closed yet'}
            message={
              tab === 'live'
                ? 'Raise a claim when a jar count, damage or deposit does not add up.'
                : 'Decided disputes land here with the ops notes.'
            }
            actionLabel={tab === 'live' ? 'Raise a dispute' : undefined}
            onAction={() => navigation.navigate(Route.RaiseDisputeScreen, {})}
          />
        }
        ListFooterComponent={
          <InfoNote>
            Investigating and deciding is done by ops. You raise the claim and
            watch for the decision, which arrives as a status, notes and any
            financial adjustment.
          </InfoNote>
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
});

export default DisputesScreen;
