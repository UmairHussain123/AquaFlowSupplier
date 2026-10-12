import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {formatMoney, pluralize} from '../../helper/helperFunction';
import {
  formatPeriod,
  type Settlement,
} from '../../Server/Settlements/SettlementsApi';
import StatusBadge from '../Common/StatusBadge';
import {ChevronRight} from '../Icons/TabIcons';

/** One settlement in a list: period, net payable, order count and status. */
const SettlementRow: React.FC<{
  settlement: Settlement;
  onPress: () => void;
  last?: boolean;
}> = ({settlement, onPress, last = false}) => {
  const count = settlement.lines_count;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, !last && styles.divider]}>
      <View style={styles.flex}>
        <View style={styles.line}>
          <Text style={styles.period} numberOfLines={1}>
            {formatPeriod(settlement.period_start, settlement.period_end)}
          </Text>
          <Text style={styles.net}>{formatMoney(settlement.net_payable)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.meta} numberOfLines={1}>
            {typeof count === 'number' ? `${pluralize(count, 'order')} · ` : ''}
            gross {formatMoney(settlement.gross_amount)}
          </Text>
          <StatusBadge status={settlement.status} />
        </View>
      </View>
      <ChevronRight color={Colors.textMuted} size={16} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, gap: 6},
  row: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {borderBottomWidth: 1, borderBottomColor: Colors.borderSoft2},
  line: {flexDirection: 'row', alignItems: 'center', gap: 10},
  period: {flex: 1, fontSize: 14, fontWeight: '800', color: Colors.text},
  net: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  meta: {flex: 1, fontSize: 12, color: Colors.textSecondary},
});

export default SettlementRow;
