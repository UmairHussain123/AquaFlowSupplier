import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../../Constant/Colors';
import {formatMoney, pluralize} from '../../helper/helperFunction';
import {
  formatPeriod,
  type Settlement,
} from '../../Server/Settlements/SettlementsApi';
import StatusBadge from '../Common/StatusBadge';

/** The teal→blue panel heading a settlement: net payable, period and status. */
const SettlementHero: React.FC<{
  settlement: Settlement;
  label?: string;
  /** Lines on the detail response, else `lines_count` from the list row. */
  ordersCount?: number | null;
}> = ({settlement, label = 'Net payable', ordersCount}) => {
  const count = ordersCount ?? settlement.lines_count ?? null;

  return (
    <LinearGradient
      colors={[Colors.accentTeal, Colors.primary]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.hero}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>
            {formatMoney(settlement.net_payable)}
          </Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {formatPeriod(settlement.period_start, settlement.period_end)}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <StatusBadge status={settlement.status} />
        {count !== null && (
          <Text style={styles.meta}>{pluralize(count, 'order')} settled</Text>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  hero: {
    borderRadius: 24,
    padding: 19,
    gap: 14,
    shadowColor: Colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: {width: 0, height: 13},
    elevation: 4,
  },
  top: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  label: {
    fontSize: 11.5,
    color: '#CDEAF3',
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    color: Colors.white,
    marginTop: 4,
  },
  chip: {
    backgroundColor: Colors.whiteAlpha18,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '55%',
  },
  chipText: {fontSize: 11.5, fontWeight: '800', color: Colors.white},
  bottom: {flexDirection: 'row', alignItems: 'center', gap: 10},
  meta: {fontSize: 12, fontWeight: '700', color: '#CDEAF3'},
});

export default SettlementHero;
