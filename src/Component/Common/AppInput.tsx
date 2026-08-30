import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import ErrorText from '../Error/ErrorText';

type Props = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  /** Takes formik's `handleBlur('field')` directly — see the call site below. */
  onBlur?: (event?: any) => void;
  placeholder?: string;
  /** Formik widens this to arrays/objects for nested fields; only strings render. */
  error?: string | false | null | any;
  keyboardType?: KeyboardTypeOptions;
  secure?: boolean;
  multiline?: boolean;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Money, codes and coordinates render in the mono face, as in the design. */
  mono?: boolean;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
  maxLength?: number;
};

const AppInput: React.FC<Props> = ({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  keyboardType,
  secure = false,
  multiline = false,
  editable = true,
  autoCapitalize = 'sentences',
  mono = false,
  suffix,
  style,
  maxLength,
}) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={[styles.wrap, style]}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
          !editable && styles.fieldDisabled,
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Formik's handleBlur is written for the DOM: it destructures
            // event.target.{name,id}, which React Native's blur event has no
            // equivalent of. handleBlur('field') curries the field name in
            // already, so a minimal DOM-shaped stand-in is all it needs.
            onBlur?.({target: {name: '', id: ''}});
          }}
          placeholder={placeholder}
          placeholderTextColor={Colors.textFaint}
          keyboardType={keyboardType}
          secureTextEntry={hidden}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          style={[
            styles.input,
            mono && {fontFamily: Fonts.mono},
            multiline && styles.inputMultiline,
          ]}
        />

        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}

        {secure && (
          <TouchableOpacity
            onPress={() => setHidden(prev => !prev)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ErrorText error={error} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {gap: 7},
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.fieldBg,
  },
  fieldMultiline: {minHeight: 104, alignItems: 'flex-start', paddingVertical: 13},
  fieldFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
  },
  fieldError: {borderColor: Colors.danger},
  fieldDisabled: {backgroundColor: Colors.surface3},
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.text,
    padding: 0,
  },
  inputMultiline: {textAlignVertical: 'top', minHeight: 76},
  suffix: {fontSize: 13, color: Colors.textMuted, fontWeight: '700'},
  toggle: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
});

export default AppInput;
