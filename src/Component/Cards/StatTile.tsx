import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** The translucent stat tiles in the dark dashboard header (SB1). */
export const HeaderStat: React.FC<{value: string; label: string}> = ({
  value,
  label,
}) => (
  <View style={styles.headerTile}>
    <Text style={styles.headerValue} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.headerLabel}>{label}</Text>
  </View>
);

/** The white stat cards below it — "19L jar stock · 6 left". */
export const StatTile: React.FC<{
  label: string;
  value: string;
  tone?: 'neutral' | 'warn' | 'danger';
}> = ({label, value, tone = 'neutral'}) => (
  <View style={styles.tile}>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text
      style={[
        styles.tileValue,
        tone === 'danger' && {color: Colors.danger},
        tone === 'warn' && {color: Colors.warningText},
      ]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  headerTile: {
    flex: 1,
    backgroundColor: Colors.whiteAlpha10,
    borderRadius: 16,
    padding: 12,
  },
  headerValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.white,
  },
  headerLabel: {fontSize: 11, color: Colors.textOnDark, marginTop: 2},

  tile: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 13,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 8},
    elevation: 2,
  },
  tileLabel: {fontSize: 11.5, color: Colors.textMuted, fontWeight: '700'},
  tileValue: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 3,
  },
});

export default StatTile;
