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
  /** Tighter padding and a one-line subtitle, for long hub menus. */
  dense?: boolean;
}> = ({
  title,
  subtitle,
  onPress,
  right,
  last = false,
  danger = false,
  dense = false,
}) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.7 : 1}
    onPress={onPress}
    disabled={!onPress}
    style={[styles.row, dense && styles.rowDense, !last && styles.divider]}>
    <View style={styles.text}>
      <Text
        style={[
          styles.title,
          dense && styles.titleDense,
          danger && {color: Colors.danger},
        ]}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={styles.subtitle} numberOfLines={dense ? 1 : undefined}>
          {subtitle}
        </Text>
      )}
    </View>
    {right ?? (onPress ? <ChevronRight color={Colors.textMuted} size={16} /> : null)}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDense: {paddingVertical: 11},
  titleDense: {fontSize: 13.5},
  divider: {borderBottomWidth: 1, borderBottomColor: Colors.borderSoft2},
  text: {flex: 1},
  title: {fontSize: 14, fontWeight: '800', color: Colors.text},
  subtitle: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
});

export default ListRow;
