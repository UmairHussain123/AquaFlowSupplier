import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import Card from '../Common/Card';
import {ChevronRight} from '../Icons/TabIcons';

/**
 * Open jar/deposit claims against the shop — they cost money if ignored.
 * `count` is null when the disputes couldn't be read; `more` means the page
 * was full, so there may be others beyond it.
 */
const OpenDisputesCard: React.FC<{
  count: number | null;
  more?: boolean;
  onPress: () => void;
}> = ({count, more = false, onPress}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.85}
    onPress={onPress}>
    <Card>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.title}>Open disputes</Text>
          <Text style={styles.helper}>
            {count === null
              ? "Couldn't check your disputes right now."
              : count > 0
              ? 'Jar and deposit claims waiting on ops.'
              : 'No claims open against this shop.'}
          </Text>
        </View>
        <Text style={[styles.value, !!count && styles.valueWarn]}>
          {count === null ? '—' : `${count}${more ? '+' : ''}`}
        </Text>
        <ChevronRight color={Colors.textMuted} size={16} />
      </View>
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  flex: {flex: 1},
  title: {fontSize: 14, fontWeight: '800', color: Colors.text},
  helper: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
  value: {fontSize: 20, fontWeight: '800', color: Colors.text},
  valueWarn: {color: Colors.warningText},
});

export default OpenDisputesCard;
