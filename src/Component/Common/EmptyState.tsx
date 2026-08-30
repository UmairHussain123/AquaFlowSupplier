import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {JarGlyph} from '../Icons/Illustrations';
import AppButton from './AppButton';

const EmptyState: React.FC<{
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({title, message, actionLabel, onAction}) => (
  <View style={styles.wrap}>
    <View style={styles.glyph}>
      <JarGlyph size={28} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
    {!!actionLabel && (
      <AppButton
        title={actionLabel}
        onPress={onAction}
        variant="secondary"
        small
        block={false}
        style={styles.action}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', paddingVertical: 46, paddingHorizontal: 24},
  glyph: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {fontSize: 15.5, fontWeight: '800', color: Colors.text},
  message: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
  action: {marginTop: 14},
});

export default EmptyState;
