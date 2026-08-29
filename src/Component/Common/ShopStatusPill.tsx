import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** The green "● Open" pill in the dark dashboard header. */
const ShopStatusPill: React.FC<{label: string; open: boolean}> = ({
  label,
  open,
}) => (
  <View
    style={[
      styles.pill,
      {backgroundColor: open ? Colors.success : Colors.whiteAlpha18},
    ]}>
    <View style={styles.dot} />
    <Text style={styles.text}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 5,
  },
  dot: {width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white},
  text: {fontSize: 12.5, fontWeight: '800', color: Colors.white},
});

export default ShopStatusPill;
