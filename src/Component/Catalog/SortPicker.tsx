import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import AppModal from '../Common/AppModal';
import {CheckIcon} from '../Icons/TabIcons';

export type SortOption = {value: string; label: string; short: string};

/** A "Sort · Price ↑" chip that opens a sheet of sort orders. */
const SortPicker: React.FC<{
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}> = ({options, value, onChange}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value) ?? options[0];

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Sort: ${selected?.label ?? ''}`}
        onPress={() => setOpen(true)}
        style={styles.chip}>
        <Text style={styles.chipText} numberOfLines={1}>
          Sort · {selected?.short ?? '—'}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <AppModal
        visible={open}
        title="Sort listings"
        onClose={() => setOpen(false)}>
        <View style={styles.list}>
          {options.map((option, index) => {
            const active = option.value === selected?.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={[styles.option, index > 0 && styles.optionDivider]}>
                <Text
                  style={[styles.optionText, active && styles.optionActive]}>
                  {option.label}
                </Text>
                {active && <CheckIcon color={Colors.primary} size={16} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </AppModal>
    </>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 190,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.slate,
    flexShrink: 1,
  },
  caret: {fontSize: 10, color: Colors.textMuted},
  list: {marginHorizontal: -20},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  optionDivider: {borderTopWidth: 1, borderTopColor: Colors.borderSoft2},
  optionText: {flex: 1, fontSize: 14.5, fontWeight: '600', color: Colors.text},
  optionActive: {fontWeight: '800', color: Colors.primary},
});

export default SortPicker;
