import React, {useEffect, useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {apiErrorMessage} from '../../helper/helperFunction';
import AppButton from '../Common/AppButton';
import AppInput from '../Common/AppInput';
import AppModal from '../Common/AppModal';
import SelectField from '../Common/SelectField';

/** The preset that opens the free-text field. */
const OTHER = 'Other';

/**
 * The portal's ReasonModal as a bottom sheet: one required written reason plus
 * a confirm button. Passing `presets` turns the field into a picker with an
 * "Other" escape hatch (the reject flow's preset reasons). `onSubmit` throws to
 * keep the sheet open and show the API's message in it.
 */
const ReasonSheet: React.FC<{
  visible: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  dismissLabel?: string;
  danger?: boolean;
  presets?: string[];
  maxLength?: number;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}> = ({
  visible,
  title,
  description,
  label,
  placeholder,
  submitLabel,
  dismissLabel = 'Cancel',
  danger = false,
  presets,
  maxLength = 255,
  onSubmit,
  onClose,
}) => {
  const firstPreset = presets?.[0] ?? OTHER;
  const [preset, setPreset] = useState<string>(firstPreset);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Every opening starts clean — a reason typed for one order shouldn't carry over.
  useEffect(() => {
    if (!visible) return;
    setPreset(firstPreset);
    setText('');
    setError(null);
  }, [visible, firstPreset]);

  const needsText = !presets?.length || preset === OTHER;

  const close = () => {
    if (!submitting) onClose();
  };

  const submit = async () => {
    const value = needsText ? text.trim() : preset;
    if (!value) {
      setError('A reason is required.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(apiErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      title={title}
      subtitle={description}
      onClose={close}
      footer={
        <>
          <AppButton
            title={dismissLabel}
            variant="secondary"
            onPress={close}
            disabled={submitting}
          />
          <AppButton
            title={submitLabel}
            variant={danger ? 'danger' : 'primary'}
            onPress={submit}
            loading={submitting}
          />
        </>
      }>
      {!!presets?.length && (
        <SelectField
          label={label}
          value={preset}
          options={presets.map(item => ({value: item, label: item}))}
          onChange={value => setPreset(String(value))}
        />
      )}
      {needsText && (
        <AppInput
          label={presets?.length ? 'Tell ops what happened' : label}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          maxLength={maxLength}
          multiline
        />
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </AppModal>
  );
};

const styles = StyleSheet.create({
  error: {
    fontSize: 12.5,
    color: Colors.danger,
    fontWeight: '600',
    lineHeight: 19,
  },
});

export default ReasonSheet;
