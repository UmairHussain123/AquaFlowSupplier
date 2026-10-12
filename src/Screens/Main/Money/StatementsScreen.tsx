import React, {useCallback, useEffect} from 'react';
import {FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {usePagedList} from '../../../hooks/usePagedList';
import SettlementRow from '../../../Component/Money/SettlementRow';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {
  listSettlements,
  type Settlement,
} from '../../../Server/Settlements/SettlementsApi';

const PER_PAGE = 15;

/** Every settlement, newest first, a page at a time. Owner only. */
const StatementsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {isOwner} = useSupplierRoles();

  const fetchPage = useCallback(
    (page: number) => listSettlements({per_page: PER_PAGE, page}),
    [],
  );

  const list = usePagedList<Settlement>(
    isOwner ? fetchPage : null,
    'settlements',
    'Could not load your statements.',
  );
  const {reload} = list;

  // A stack screen that nothing else edits — loading once on mount keeps the
  // pages already shown when coming back from a settlement.
  useEffect(() => {
    reload();
  }, [reload]);

  if (!isOwner) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Statements" />
        <EmptyState
          title="Only the owner can see this"
          message="Settlement statements are visible to the supplier account owner only."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Statements"
        subtitle="All shops on your supplier profile"
      />

      {list.loading ? (
        <ScreenLoader />
      ) : (
        <FlatList
          data={list.rows}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={() => reload('refresh')}
            />
          }
          renderItem={({item}) => (
            <Card flush>
              <SettlementRow
                settlement={item}
                last
                onPress={() =>
                  navigation.navigate(Route.SettlementDetailScreen, {
                    settlementId: item.id,
                  })
                }
              />
            </Card>
          )}
          ListEmptyComponent={
            list.error ? (
              <EmptyState
                title="Couldn't load your statements"
                message={list.error}
                actionLabel="Try again"
                onAction={() => reload('refresh')}
              />
            ) : (
              <EmptyState
                title="No statements yet"
                message="Aqua Flow settles completed orders on a weekly cycle. Each closed cycle shows up here."
              />
            )
          }
          ListFooterComponent={
            list.rows.length ? (
              <View style={styles.footer}>
                <LoadMoreFooter
                  shown={list.rows.length}
                  total={list.total}
                  hasMore={list.hasMore}
                  loading={list.loadingMore}
                  onLoadMore={list.loadMore}
                  noun="settlements"
                />
                <InfoNote>
                  Tap a settlement to see its orders, the commission on each and
                  the payouts made against it.
                </InfoNote>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20, gap: 12, paddingBottom: 30},
  footer: {gap: 12},
});

export default StatementsScreen;
