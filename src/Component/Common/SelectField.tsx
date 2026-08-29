import React, {useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../../Constant/Colors';
import ErrorText from '../Error/ErrorText';
import {CheckIcon} from '../Icons/TabIcons';

export type SelectOption = {value: string | number; label: string; hint?: string};

/** A tap-to-open picker sheet — RN has no native select, and the design uses
 *  a plain field that opens a list. */
const SelectField: React.FC<{
  label?: string;
  placeholder?: string;
  value: string | number | null;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  error?: string | false | null | any;
  disabled?: boolean;
}> = ({label, placeholder = 'Select', value, options, onChange, error, disabled}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          !!error && styles.fieldError,
          disabled && styles.fieldDisabled,
        ]}>
        <Text
          numberOfLines={1}
          style={[styles.value, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <ErrorText error={error} />

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdrop}
          onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {!!label && <Text style={styles.sheetTitle}>{label}</Text>}
            <FlatList
              data={options}
              keyExtractor={item => String(item.value)}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}>
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    {!!item.hint && (
                      <Text style={styles.optionHint}>{item.hint}</Text>
                    )}
                  </View>
                  {item.value === value && (
                    <CheckIcon color={Colors.primary} size={16} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {gap: 6},
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  field: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  fieldError: {borderColor: Colors.danger},
  fieldDisabled: {backgroundColor: Colors.surface3},
  value: {flex: 1, fontSize: 14.5, fontWeight: '600', color: Colors.text},
  placeholder: {color: Colors.textFaint, fontWeight: '500'},
  caret: {color: Colors.textMuted, fontSize: 12},

  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingBottom: 26,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft2,
  },
  optionText: {flex: 1},
  optionLabel: {fontSize: 14.5, fontWeight: '700', color: Colors.text},
  optionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
});

export default SelectField;
