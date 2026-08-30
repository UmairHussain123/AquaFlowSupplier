import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** "New orders  (2)" — a bold title with an optional count badge and action. */
const SectionHeader: React.FC<{
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
}> = ({title, count, actionLabel, onAction}) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {count !== undefined && count > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    )}
    <View style={styles.spacer} />
    {!!actionLabel && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.action}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 9},
  title: {fontSize: 16, fontWeight: '800', color: Colors.text},
  spacer: {flex: 1},
  badge: {
    backgroundColor: Colors.dangerBg,
    borderRadius: 999,
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'center',
  },
  badgeText: {color: Colors.danger, fontSize: 11.5, fontWeight: '800'},
  action: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
});

export default SectionHeader;
