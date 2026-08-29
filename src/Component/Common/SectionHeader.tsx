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
    backgroundColor: Colors.danger,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  badgeText: {color: Colors.white, fontSize: 12, fontWeight: '800'},
  action: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
});

export default SectionHeader;
