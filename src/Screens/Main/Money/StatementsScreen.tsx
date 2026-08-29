import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage, formatMoney} from '../../../helper/helperFunction';
import {
  getWeeklyEarnings,
  type WeeklyEarnings,
} from '../../../Server/Earnings/EarningsApi';

/** Week-by-week statements, each one the same breakdown the Money screen shows. */
const StatementsScreen: React.FC = () => {
  const shopId = useActiveShopId();
  const [weeks, setWeeks] = useState<WeeklyEarnings[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    try {
      const settled = await Promise.allSettled(
        Array.from({length: 6}, (_, index) => getWeeklyEarnings(shopId, index)),
      );
      setWeeks(
        settled
          .filter(
            (result): result is PromiseFulfilledResult<WeeklyEarnings> =>
              result.status === 'fulfilled',
          )
          .map(result => result.value)
          .filter(week => week.orders.length > 0),
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not load your statements.'),
      });
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader title="Statements" />

      <FlatList
        data={weeks}
        keyExtractor={item => item.periodLabel}
        contentContainerStyle={styles.body}
        renderItem={({item}) => (
          <Card>
            <View style={styles.head}>
              <Text style={styles.period}>{item.periodLabel}</Text>
              <Text style={styles.net}>{formatMoney(item.net)}</Text>
            </View>
            <Text style={styles.meta}>
              {item.orders.length} settled order
              {item.orders.length === 1 ? '' : 's'} · paid{' '}
              {item.settlementDate}
            </Text>

            <View style={styles.lines}>
              {item.lines.map(line => (
                <KeyValueRow
                  key={line.label}
                  label={line.label}
                  value={formatMoney(Math.abs(line.value))}
                  tone={line.tone}
                />
              ))}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No statements yet"
            message="A week appears here once it has at least one delivered order."
          />
        }
        ListFooterComponent={
          weeks.length ? (
            <InfoNote>
              Statements are built from delivered orders in the app. Ops issue the
              formal settlement note by email.
            </InfoNote>
          ) : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20, gap: 12, paddingBottom: 30},
  head: {flexDirection: 'row', alignItems: 'baseline', gap: 12},
  period: {flex: 1, fontSize: 15, fontWeight: '800', color: Colors.text},
  net: {fontFamily: Fonts.mono, fontSize: 16, fontWeight: '800', color: Colors.text},
  meta: {fontSize: 12, color: Colors.textSecondary, marginTop: 4},
  lines: {gap: 9, marginTop: 12},
});

export default StatementsScreen;
