import React, {useCallback, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage, formatMoney, pluralize} from '../../../helper/helperFunction';
import {
  getContainerLedger,
  type ContainerLedger,
} from '../../../Server/Container/ContainerApi';

/**
 * Who is holding the shop's jars, and how much deposit sits against them.
 * Folded up from the orders that carry a deposit — there is no ledger endpoint
 * on the supplier API.
 */
const ContainerLedgerScreen: React.FC = () => {
  const shopId = useActiveShopId();
  const [ledger, setLedger] = useState<ContainerLedger | null>(null);
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
        setLedger(await getContainerLedger(shopId));
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: apiErrorMessage(error, 'Could not load the container ledger.'),
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

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader title="Container ledger" />

      <FlatList
        data={ledger?.rows ?? []}
        keyExtractor={item => String(item.customerId)}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <Card>
            <View style={styles.totals}>
              <View style={styles.flex}>
                <Text style={styles.totalLabel}>Jars on loan</Text>
                <Text style={styles.totalValue}>{ledger?.totalJars ?? 0}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.totalLabel}>Deposits held</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(ledger?.totalDeposits ?? 0)}
                </Text>
              </View>
            </View>
          </Card>
        }
        renderItem={({item}) => (
          <Card>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.customer}>{item.customer}</Text>
                <Text style={styles.meta}>Last order {item.lastOrder}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.onLoan}>{pluralize(item.onLoan, 'jar')}</Text>
                <Text style={styles.deposit}>{formatMoney(item.depositHeld)}</Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No jars out on loan"
            message="Deposits show up here once a delivered order carries one."
          />
        }
        ListFooterComponent={
          <InfoNote>
            A jar counts as on loan while its deposit is still open. Returning it
            on a later order clears the line.
          </InfoNote>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  totals: {flexDirection: 'row', gap: 12},
  totalLabel: {fontSize: 11.5, color: Colors.textMuted, fontWeight: '700'},
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 3,
  },

  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rowRight: {alignItems: 'flex-end'},
  customer: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  meta: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
  onLoan: {fontFamily: Fonts.mono, fontSize: 13.5, color: Colors.text},
  deposit: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.warningText,
    marginTop: 2,
  },
});

export default ContainerLedgerScreen;
