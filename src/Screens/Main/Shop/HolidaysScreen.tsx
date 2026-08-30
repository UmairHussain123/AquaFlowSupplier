import React, {useCallback, useState} from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import AppModal from '../../../Component/Common/AppModal';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import Pill from '../../../Component/Common/Pill';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {dateKey, formatHolidayDate, todayKey} from '../../../helper/dateHelper';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  addHoliday,
  deleteHoliday,
  holidayDateKey,
  isPastHoliday,
  listHolidays,
  sortHolidays,
  type Holiday,
} from '../../../Server/ShopSettings/ShopSettingsApi';

/** One-off closed days. A holiday closes the shop for the whole day regardless
 *  of its opening hours. */
const HolidaysScreen: React.FC = () => {
  const shopId = useActiveShopId();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    try {
      setHolidays(sortHolidays(await listHolidays(shopId)));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load your holidays.'),
      });
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const submit = async () => {
    if (!shopId) return;
    const key = dateKey(date);

    if (key < todayKey()) {
      setError('Pick today or a future date.');
      return;
    }
    // Catch the duplicate before the request goes out.
    if (holidays.some(holiday => holidayDateKey(holiday) === key)) {
      setError('That day is already marked as a holiday.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const created = await addHoliday(shopId, {
        date: key,
        reason: reason.trim() || undefined,
      });
      setHolidays(sortHolidays([...holidays, created]));
      setAdding(false);
      setReason('');
      Toast.show({type: 'success', text1: 'Holiday added'});
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add the holiday.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = (holiday: Holiday) => {
    if (!shopId) return;
    Alert.alert(
      'Remove this holiday?',
      `${formatHolidayDate(holidayDateKey(holiday))} will follow your normal hours again.`,
      [
        {text: 'Keep it', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHoliday(shopId, holiday.id);
              setHolidays(prev => prev.filter(row => row.id !== holiday.id));
              Toast.show({type: 'success', text1: 'Holiday removed'});
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: apiErrorMessage(err, 'Could not remove the holiday.'),
              });
            }
          },
        },
      ],
    );
  };

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Holidays"
        right={
          <TouchableOpacity onPress={() => setAdding(true)}>
            <Text style={styles.add}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={holidays}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.body}
        renderItem={({item}) => {
          const past = isPastHoliday(item);
          return (
            <Card>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={[styles.date, past && styles.datePast]}>
                    {formatHolidayDate(holidayDateKey(item))}
                  </Text>
                  {!!item.reason && <Text style={styles.reason}>{item.reason}</Text>}
                </View>

                {past ? (
                  <Pill label="Passed" tone="muted" />
                ) : (
                  <TouchableOpacity onPress={() => remove(item)}>
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No holidays set"
            message="Mark a day closed and customers can't order from you on it, whatever your opening hours say."
            actionLabel="Add a holiday"
            onAction={() => setAdding(true)}
          />
        }
        ListFooterComponent={
          holidays.length ? (
            <InfoNote>
              A holiday closes the shop for the whole day. Active orders placed
              before it stay alive.
            </InfoNote>
          ) : undefined
        }
      />

      <AppModal
        visible={adding}
        title="Add a holiday"
        subtitle="The shop stops taking new orders for the whole day."
        onClose={() => {
          setAdding(false);
          setError(null);
        }}
        footer={
          <>
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={() => setAdding(false)}
            />
            <AppButton title="Add holiday" onPress={submit} loading={saving} />
          </>
        }>
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowPicker(true)}>
          <Text style={styles.datePickerLabel}>Date</Text>
          <Text style={styles.datePickerValue}>
            {formatHolidayDate(dateKey(date))}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            value={date}
            minimumDate={new Date()}
            onChange={(event, picked) => {
              if (Platform.OS !== 'ios') setShowPicker(false);
              if (event.type === 'dismissed' || !picked) return;
              setDate(picked);
            }}
          />
        )}

        <AppInput
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Optional — Eid, maintenance…"
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  add: {fontSize: 13, fontWeight: '800', color: Colors.primary},
  body: {padding: 20, gap: 11, paddingBottom: 30},

  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  date: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  datePast: {color: Colors.textMuted},
  reason: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
  remove: {fontSize: 12.5, fontWeight: '800', color: Colors.danger},

  datePicker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    backgroundColor: Colors.fieldBg,
    padding: 13,
    gap: 4,
  },
  datePickerLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  datePickerValue: {fontFamily: Fonts.mono, fontSize: 14.5, color: Colors.text},

  error: {fontSize: 12.5, color: Colors.danger, fontWeight: '600'},
});

export default HolidaysScreen;
