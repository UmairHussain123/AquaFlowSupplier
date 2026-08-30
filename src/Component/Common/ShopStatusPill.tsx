import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

/**
 * The "● Open" pill. v2 gives it two readings: a translucent teal on the dark
 * dashboard header (`onDark`), and the green status tint everywhere it sits on
 * a white card.
 */
const ShopStatusPill: React.FC<{
  label: string;
  open: boolean;
  onDark?: boolean;
}> = ({label, open, onDark = false}) => {
  const palette = onDark
    ? open
      ? {bg: Colors.openTint, dot: Colors.openDot, fg: Colors.openText}
      : {bg: Colors.whiteAlpha10, dot: Colors.textOnDark, fg: Colors.textOnDark}
    : open
    ? {bg: Colors.successBg, dot: Colors.success, fg: Colors.successText}
    : {bg: Colors.surface3, dot: Colors.textMuted, fg: Colors.textMuted};

  return (
    <View style={[styles.pill, {backgroundColor: palette.bg}]}>
      <View style={[styles.dot, {backgroundColor: palette.dot}]} />
      <Text style={[styles.text, {color: palette.fg}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: {width: 7, height: 7, borderRadius: 4},
  text: {fontSize: 12, fontWeight: '800'},
});

export default ShopStatusPill;
