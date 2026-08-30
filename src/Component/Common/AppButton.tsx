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
import LinearGradient from 'react-native-linear-gradient';
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

/**
 * v2 fills the two "go ahead" variants with the teal→blue (and green) ramp.
 * The gradient is an absolutely-positioned layer inside the same touchable, so
 * press handling, disabled state and layout are exactly as before.
 */
const GRADIENTS: Partial<Record<ButtonVariant, string[]>> = {
  primary: [Colors.gradFrom, Colors.gradTo],
  success: [Colors.successFrom, Colors.successTo],
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
  const gradient = GRADIENTS[variant];
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
        !!gradient && !isDisabled && styles.raised,
        isDisabled && styles.disabled,
        style,
      ]}>
      {!!gradient && (
        <LinearGradient
          colors={gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

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
    borderRadius: 16,
    overflow: 'hidden',
  },
  regular: {height: 54, paddingHorizontal: 18},
  small: {height: 42, paddingHorizontal: 14, borderRadius: 13},
  block: {flex: 1},
  raised: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.26,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 9},
    elevation: 3,
  },
  disabled: {opacity: 0.5},
  content: {flexDirection: 'row', alignItems: 'center', gap: 8},
  label: {fontSize: 16, fontWeight: '800'},
  labelSmall: {fontSize: 13},
});

export default AppButton;
