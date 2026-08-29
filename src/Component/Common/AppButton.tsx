import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {Colors} from '../../Constant/Colors';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'dark'
  | 'ghost';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Fills the row it sits in — the default for the sticky footer buttons. */
  block?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  left?: React.ReactNode;
};

const PALETTE: Record<
  ButtonVariant,
  {bg: string; fg: string; border?: string}
> = {
  primary: {bg: Colors.primary, fg: Colors.white},
  secondary: {bg: Colors.white, fg: Colors.textSecondary, border: Colors.border},
  success: {bg: Colors.success, fg: Colors.white},
  danger: {bg: Colors.white, fg: Colors.danger, border: Colors.dangerBorder},
  dark: {bg: Colors.primaryDark, fg: Colors.white},
  ghost: {bg: Colors.surface3, fg: Colors.slate},
};

const AppButton: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  block = true,
  small = false,
  style,
  left,
}) => {
  const palette = PALETTE[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        small ? styles.small : styles.regular,
        block && styles.block,
        {
          backgroundColor: palette.bg,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border ?? Colors.transparent,
        },
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <View style={styles.content}>
          {left}
          <Text
            style={[
              styles.label,
              small && styles.labelSmall,
              {color: palette.fg},
            ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  regular: {height: 52, paddingHorizontal: 18},
  small: {height: 40, paddingHorizontal: 14, borderRadius: 11},
  block: {flex: 1},
  disabled: {opacity: 0.5},
  content: {flexDirection: 'row', alignItems: 'center', gap: 8},
  label: {fontSize: 16, fontWeight: '800'},
  labelSmall: {fontSize: 13},
});

export default AppButton;
