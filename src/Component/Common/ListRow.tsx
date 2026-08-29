import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {ChevronRight} from '../Icons/TabIcons';

/** One "Hours & holidays  ›" row inside a grouped card. */
const ListRow: React.FC<{
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
  danger?: boolean;
}> = ({title, subtitle, onPress, right, last = false, danger = false}) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.7 : 1}
    onPress={onPress}
    disabled={!onPress}
    style={[styles.row, !last && styles.divider]}>
    <View style={styles.text}>
      <Text style={[styles.title, danger && {color: Colors.danger}]}>
        {title}
      </Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {right ?? (onPress ? <ChevronRight color={Colors.textMuted} size={16} /> : null)}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {borderBottomWidth: 1, borderBottomColor: Colors.borderSoft2},
  text: {flex: 1},
  title: {fontSize: 14, fontWeight: '800', color: Colors.text},
  subtitle: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
});

export default ListRow;
