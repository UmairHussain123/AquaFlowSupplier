import React, {useRef} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';

/**
 * The delivery OTP boxes from SB4. One hidden input drives every box so paste
 * and autofill land correctly, and the boxes are just a rendering of the value.
 *
 * The API issues the customer a 6-digit delivery code, so six boxes is the
 * default — anything shorter can't hold the code the customer is reading out.
 */
const OtpInput: React.FC<{
  value: string;
  onChange: (next: string) => void;
  length?: number;
  editable?: boolean;
}> = ({value, onChange, length = 6, editable = true}) => {
  // RN 0.87 types the ref as an internal instance type that isn't exported.
  const inputRef = useRef<any>(null);
  const digits = Array.from({length}, (_, index) => value[index] ?? '');
  // Six boxes don't fit at the four-box sizing on a 360dp phone, so anything
  // longer than four tightens the gap and the digit.
  const compact = length > 4;

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

      <View
        style={[styles.boxes, compact && styles.boxesCompact]}
        onTouchEnd={() => inputRef.current?.focus()}>
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.box,
              compact && styles.boxCompact,
              !!digit && styles.boxFilled,
            ]}>
            <TextInput
              pointerEvents="none"
              editable={false}
              value={digit || '–'}
              style={[
                styles.digit,
                compact && styles.digitCompact,
                !digit && styles.digitEmpty,
              ]}
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
  boxesCompact: {gap: 7},
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
  boxCompact: {height: 56, borderRadius: 13},
  boxFilled: {borderColor: Colors.primary, backgroundColor: Colors.primarySoft},
  digit: {
    fontFamily: Fonts.mono,
    fontSize: 26,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    padding: 0,
  },
  digitCompact: {fontSize: 22},
  digitEmpty: {color: Colors.otpIdle},
});

export default OtpInput;
