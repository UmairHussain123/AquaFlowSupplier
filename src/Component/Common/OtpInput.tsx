import React, {useRef} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';

/**
 * The delivery OTP boxes from SB4. One hidden input drives every box so paste
 * and autofill land correctly, and the boxes are just a rendering of the value.
 */
const OtpInput: React.FC<{
  value: string;
  onChange: (next: string) => void;
  length?: number;
  editable?: boolean;
}> = ({value, onChange, length = 4, editable = true}) => {
  // RN 0.87 types the ref as an internal instance type that isn't exported.
  const inputRef = useRef<any>(null);
  const digits = Array.from({length}, (_, index) => value[index] ?? '');

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        editable={editable}
        style={styles.hidden}
        autoFocus={false}
      />

      <View style={styles.boxes} onTouchEnd={() => inputRef.current?.focus()}>
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[styles.box, !!digit && styles.boxFilled]}>
            <TextInput
              pointerEvents="none"
              editable={false}
              value={digit || '–'}
              style={[styles.digit, !digit && styles.digitEmpty]}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {position: 'relative'},
  hidden: {
    position: 'absolute',
    opacity: 0,
    height: 62,
    width: '100%',
    zIndex: 2,
  },
  boxes: {flexDirection: 'row', gap: 11},
  box: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.fieldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {borderColor: Colors.primary, backgroundColor: Colors.primarySoft},
  digit: {
    fontFamily: Fonts.mono,
    fontSize: 26,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    padding: 0,
  },
  digitEmpty: {color: Colors.otpIdle},
});

export default OtpInput;
