import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

export type NoteTone = 'info' | 'warning' | 'neutral' | 'success';

const TONES: Record<NoteTone, {bg: string; fg: string}> = {
  info: {bg: Colors.primaryTint2, fg: Colors.slate2},
  warning: {bg: Colors.warningBg, fg: Colors.warningText2},
  neutral: {bg: Colors.surface2, fg: Colors.textSecondary},
  success: {bg: Colors.successBg, fg: Colors.successText},
};

/** The tinted explainer boxes that sit under most of the forms. */
const InfoNote: React.FC<{children: React.ReactNode; tone?: NoteTone}> = ({
  children,
  tone = 'info',
}) => {
  const palette = TONES[tone];
  return (
    <View style={[styles.note, {backgroundColor: palette.bg}]}>
      <Text style={[styles.text, {color: palette.fg}]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  note: {borderRadius: 18, padding: 14},
  text: {fontSize: 12.5, lineHeight: 19},
});

export default InfoNote;
