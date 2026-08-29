import React, {useCallback, useMemo, useState} from 'react';
import {
  Platform,
  ScrollView,
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
import AppSwitch from '../../../Component/Common/AppSwitch';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {getOpsDraft} from '../../../helper/opsDraft';
import {
  DAY_NAMES,
  WEEK_ORDER,
  formatTime,
  invalidDays,
  listBusinessHours,
  setBusinessHours,
  weekFromApi,
  weekToPayload,
  type BusinessHourInput,
} from '../../../Server/ShopSettings/ShopSettingsApi';

/**
 * Opening hours.
 *
 * The PUT replaces the whole week, so all seven days always go out; the editor
 * also back-fills any day the API omits so a shop that never set hours still
 * gets a full week to edit. A shop with no hours at all is pre-filled from the
 * application draft the supplier filled in on SA5.
 */
const BusinessHoursScreen: React.FC = () => {
  const shopId = useActiveShopId();

  const [week, setWeek] = useState<BusinessHourInput[]>([]);
  const [original, setOriginal] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{
    day: number;
    field: 'opens_at' | 'closes_at';
  } | null>(null);

  const load = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    try {
      const hours = await listBusinessHours(shopId);
      let next = weekFromApi(hours);

      // Nothing configured yet — start from what they told us when applying.
      if (!hours.length) {
        const draft = await getOpsDraft();
        if (draft) {
          next = next.map(day => ({
            day_of_week: day.day_of_week,
            is_closed: !draft.openDays.includes(day.day_of_week),
            opens_at: draft.opensAt,
            closes_at: draft.closesAt,
          }));
        }
      }

      setWeek(next);
      setOriginal(JSON.stringify(weekFromApi(hours)));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not load your opening hours.'),
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

  const problems = useMemo(() => invalidDays(week), [week]);
  const dirty = JSON.stringify(week) !== original;

  const setDay = (day: number, patch: Partial<BusinessHourInput>) =>
    setWeek(prev =>
      prev.map(row => (row.day_of_week === day ? {...row, ...patch} : row)),
    );

  const save = async () => {
    if (!shopId) return;
    if (problems.length) {
      Toast.show({
        type: 'error',
        text1: 'Check these days',
        text2: problems.join(', '),
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await setBusinessHours(shopId, weekToPayload(week));
      const next = weekFromApi(saved);
      setWeek(next);
      setOriginal(JSON.stringify(next));
      Toast.show({type: 'success', text1: 'Opening hours saved'});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not save your opening hours.'),
      });
    } finally {
      setSaving(false);
    }
  };

  /** "09:00" -> a Date the picker understands, and back again. */
  const timeToDate = (value?: string) => {
    const [h, m] = (value ?? '09:00').split(':').map(Number);
    const date = new Date();
    date.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
    return date;
  };

  const dateToTime = (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes(),
    ).padStart(2, '0')}`;

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader title="Opening hours" />

      <ScrollView contentContainerStyle={styles.body}>
        {WEEK_ORDER.map(dayIndex => {
          const day = week.find(row => row.day_of_week === dayIndex);
          if (!day) return null;
          const closed = !!day.is_closed;

          return (
            <Card key={dayIndex}>
              <View style={styles.dayHead}>
                <Text style={styles.dayName}>{DAY_NAMES[dayIndex]}</Text>
                <Text style={styles.dayState}>{closed ? 'Closed' : 'Open'}</Text>
                <AppSwitch
                  value={!closed}
                  onValueChange={open => setDay(dayIndex, {is_closed: !open})}
                />
              </View>

              {!closed && (
                <View style={styles.times}>
                  <TouchableOpacity
                    style={styles.time}
                    onPress={() => setPicker({day: dayIndex, field: 'opens_at'})}>
                    <Text style={styles.timeText}>
                      {formatTime(day.opens_at ?? null)}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.arrow}>→</Text>

                  <TouchableOpacity
                    style={styles.time}
                    onPress={() => setPicker({day: dayIndex, field: 'closes_at'})}>
                    <Text style={styles.timeText}>
                      {formatTime(day.closes_at ?? null)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        })}

        {!!problems.length && (
          <InfoNote tone="warning">
            {problems.join(', ')} {problems.length === 1 ? 'is' : 'are'} open but
            missing a time, or close before they open.
          </InfoNote>
        )}

        <InfoNote>
          Saving replaces the whole week. Use Holidays to close a single date
          without touching these hours.
        </InfoNote>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title="Save week"
          onPress={save}
          loading={saving}
          disabled={!dirty || !!problems.length}
        />
      </View>

      {!!picker && (
        <DateTimePicker
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
          value={timeToDate(
            week.find(row => row.day_of_week === picker.day)?.[picker.field],
          )}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setPicker(null);
            if (event.type === 'dismissed' || !date) return;
            setDay(picker.day, {[picker.field]: dateToTime(date)} as any);
            if (Platform.OS === 'ios') setPicker(null);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20, gap: 11, paddingBottom: 30},

  dayHead: {flexDirection: 'row', alignItems: 'center', gap: 12},
  dayName: {flex: 1, fontSize: 14.5, fontWeight: '800', color: Colors.text},
  dayState: {fontSize: 12.5, color: Colors.textSecondary},

  times: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12},
  time: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {fontFamily: Fonts.mono, fontSize: 14, color: Colors.text},
  arrow: {color: Colors.textMuted},

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
});

export default BusinessHoursScreen;
