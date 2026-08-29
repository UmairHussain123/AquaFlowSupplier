import React, {useCallback, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import Route from '../../../Constant/NavigationStrings';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {ChevronRight} from '../../../Component/Icons/TabIcons';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage, formatMoney} from '../../../helper/helperFunction';
import {
  getPayoutHistory,
  getWeeklyEarnings,
  type PayoutRow,
  type WeeklyEarnings,
} from '../../../Server/Earnings/EarningsApi';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * SB6 — Money.
 *
 * Everything on this screen is computed from the shop's delivered orders; there
 * is no earnings or payout endpoint on the supplier API yet, so the breakdown
 * derives the same lines the design shows rather than inventing numbers.
 */
const MoneyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const shopId = useActiveShopId();

  const [week, setWeek] = useState<WeeklyEarnings | null>(null);
  const [history, setHistory] = useState<PayoutRow[]>([]);
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
        // The breakdown is the point of the screen — render it even if the
        // history call behind it fails.
        const [current, past] = await Promise.allSettled([
          getWeeklyEarnings(shopId),
          getPayoutHistory(shopId, 3),
        ]);

        if (current.status === 'rejected') throw current.reason;
        setWeek(current.value);
        setHistory(past.status === 'fulfilled' ? past.value : []);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: apiErrorMessage(error, 'Could not load your earnings.'),
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

  const peak = Math.max(1, ...(week?.daily ?? [1]));
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Money</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }>
        <LinearGradient
          colors={[Colors.accentTeal, Colors.primary]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <Text style={styles.heroLabel}>This week gross</Text>
              <Text style={styles.heroValue}>
                {formatMoney(week?.gross ?? 0)}
              </Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{week?.periodLabel ?? 'Mon–Sun'}</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {(week?.daily ?? []).map((value, index) => (
              <View key={index} style={styles.chartColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(6, (value / peak) * 100)}%`,
                      backgroundColor:
                        index === todayIndex
                          ? Colors.white
                          : Colors.whiteAlpha45,
                    },
                  ]}
                />
                <Text style={styles.chartLabel}>{DAY_LABELS[index]}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Card>
          <View style={styles.lines}>
            {(week?.lines ?? []).map(line => (
              <KeyValueRow
                key={line.label}
                label={line.label}
                value={`${line.value < 0 ? '− ' : line.tone === 'credit' ? '+ ' : ''}${formatMoney(
                  Math.abs(line.value),
                )}`}
                tone={line.tone}
              />
            ))}

            <View style={styles.rule} />

            <KeyValueRow
              label="Net payout"
              value={formatMoney(week?.net ?? 0)}
              strong
            />
          </View>
        </Card>

        <View style={styles.settlement}>
          <View style={styles.flex}>
            <Text style={styles.settlementTitle}>
              Next settlement {week?.settlementDate ?? '—'}
            </Text>
            <Text style={styles.settlementSub}>
              2-day dispute buffer before the transfer goes out
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate(Route.StatementsScreen)}>
            <Text style={styles.link}>Statements</Text>
          </TouchableOpacity>
        </View>

        {history.length ? (
          <Card flush>
            {history.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.historyRow,
                  index < history.length - 1 && styles.historyDivider,
                ]}>
                <Text style={styles.historyLabel}>{row.label}</Text>
                <Text
                  style={[
                    styles.historyValue,
                    {
                      color:
                        row.tone === 'debit' ? Colors.danger : Colors.success,
                    },
                  ]}>
                  {formatMoney(row.value)}
                </Text>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            title="No settled weeks yet"
            message="Once orders are delivered, each week's payout shows up here."
          />
        )}

        <InfoNote>
          Commission is 10% of water sales. Deposits are container liability and
          pass through to Aqua Flow, so they never carry commission.
        </InfoNote>

        <Card>
          <View style={styles.payoutRow}>
            <View style={styles.flex}>
              <Text style={styles.payoutTitle}>Payout account</Text>
              <Text style={styles.payoutSub}>
                Held by ops — changing it needs re-verification
              </Text>
            </View>
            <ChevronRight color={Colors.textMuted} size={16} />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10},
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.text,
  },
  body: {paddingHorizontal: 20, paddingBottom: 30, gap: 13},

  hero: {borderRadius: 20, padding: 19, gap: 15},
  heroTop: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  heroLabel: {
    fontSize: 11.5,
    color: '#CDEAF3',
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    color: Colors.white,
    marginTop: 4,
  },
  heroChip: {
    backgroundColor: Colors.whiteAlpha18,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroChipText: {fontSize: 11.5, fontWeight: '800', color: Colors.white},

  chart: {flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 86},
  chartColumn: {flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center'},
  bar: {width: '100%', borderRadius: 4},
  chartLabel: {
    fontSize: 10,
    color: '#CDEAF3',
    marginTop: 5,
    fontWeight: '700',
  },

  lines: {gap: 10},
  rule: {height: 1, backgroundColor: Colors.borderSoft, marginVertical: 2},

  settlement: {
    backgroundColor: Colors.successBg,
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settlementTitle: {fontSize: 13.5, fontWeight: '800', color: Colors.successText},
  settlementSub: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.successText2,
    marginTop: 3,
  },
  link: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},

  historyRow: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyDivider: {borderBottomWidth: 1, borderBottomColor: Colors.borderSoft2},
  historyLabel: {flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text},
  historyValue: {fontFamily: Fonts.mono, fontSize: 13},

  payoutRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  payoutTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  payoutSub: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
});

export default MoneyScreen;
