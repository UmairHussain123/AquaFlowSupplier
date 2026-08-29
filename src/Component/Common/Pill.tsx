import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';

export type PillTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

const TONES: Record<PillTone, {bg: string; fg: string}> = {
  neutral: {bg: Colors.surface3, fg: Colors.slate},
  primary: {bg: Colors.primaryTint, fg: Colors.primary},
  success: {bg: Colors.successBg, fg: Colors.successText},
  warning: {bg: Colors.warningBg, fg: Colors.warningText},
  danger: {bg: Colors.dangerBg, fg: Colors.danger},
  muted: {bg: Colors.surface3, fg: Colors.textMuted},
};

/** The small rounded chips: "COD Rs 1,030", "2 empties", "AWAITING OPS". */
const Pill: React.FC<{
  label: string;
  tone?: PillTone;
  mono?: boolean;
  uppercase?: boolean;
}> = ({label, tone = 'neutral', mono = false, uppercase = false}) => {
  const palette = TONES[tone];
  return (
    <View style={[styles.pill, {backgroundColor: palette.bg}]}>
      <Text
        style={[
          styles.text,
          {color: palette.fg},
          mono && {fontFamily: Fonts.mono},
          uppercase && styles.uppercase,
        ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {fontSize: 11.5, fontWeight: '700'},
  uppercase: {textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: '800'},
});

export default Pill;
