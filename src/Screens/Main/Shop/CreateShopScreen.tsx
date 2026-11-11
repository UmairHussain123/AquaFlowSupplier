import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useDispatch} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import SelectField from '../../../Component/Common/SelectField';
import {PinIcon} from '../../../Component/Icons/TabIcons';
import {upsertShop} from '../../../Redux/slices/shopSlice';
import {createShop} from '../../../Server/Shops/ShopsApi';
import {listCities, type City} from '../../../Server/Cities/CitiesApi';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {formatPakistaniPhone} from '../../../helper/phoneHelper';
import {
  PermissionError,
  permissionAlert,
} from '../../../helper/permissionHelper';
import {formatCoordinate, getCurrentCoordinates} from '../../../helper/locationHelper';

/**
 * SC1b — Add a shop. Owner only: requests another branch under the signed-in
 * supplier account. It stays hidden from customers as `pending` until Aqua
 * Flow approves it — same request the portal's "Add shop" makes.
 *
 *   POST /supplier/shops
 *   GET  /supplier/cities
 */
const CreateShopScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useDispatch();

  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);

  const [publicName, setPublicName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [description, setDescription] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('');
  const [cityId, setCityId] = useState<number | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [capacityPerDay, setCapacityPerDay] = useState('');

  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    listCities()
      .then(data => {
        if (!active) return;
        setCities(data);
        if (data.length > 0) setCityId(current => current ?? data[0].id);
      })
      .catch(() => {
        // Not fatal — the field just stays empty and the submit guards on it.
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cityOptions = cities.map(city => ({
    value: city.id,
    label: city.is_active ? city.name : `${city.name} (not served yet)`,
    hint: city.province,
  }));

  /** Fills the pin from the device's GPS — the fields stay editable after. */
  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      setLatitude(formatCoordinate(coords.latitude));
      setLongitude(formatCoordinate(coords.longitude));
      Toast.show({type: 'success', text1: 'Pin set to your current location'});
    } catch (err) {
      const fallback = 'Could not read your location. Enter the pin by hand.';
      if (err instanceof PermissionError && err.openSettings) {
        permissionAlert('Location is off', err, fallback);
      } else {
        Toast.show({
          type: 'error',
          text1: err instanceof PermissionError ? err.message : fallback,
        });
      }
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (!publicName.trim()) return setError('Shop name is required.');
    if (!addressLine.trim()) return setError('Address is required.');
    if (!cityId) return setError('Pick a city.');
    if (!contactPhone.trim()) return setError('Contact phone is required.');

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!latitude.trim() || Number.isNaN(lat)) {
      return setError('Latitude must be a number.');
    }
    if (!longitude.trim() || Number.isNaN(lng)) {
      return setError('Longitude must be a number.');
    }

    setError(null);
    setSubmitting(true);
    try {
      const shop = await createShop({
        public_name: publicName.trim(),
        branch_name: branchName.trim() || undefined,
        description: description.trim() || undefined,
        address_line: addressLine.trim(),
        landmark: landmark.trim() || undefined,
        city_id: cityId,
        area: area.trim() || undefined,
        latitude: lat,
        longitude: lng,
        contact_phone: contactPhone.trim(),
        whatsapp_number: whatsappNumber.trim() || undefined,
        capacity_per_day: capacityPerDay.trim()
          ? Number(capacityPerDay)
          : undefined,
      });
      dispatch(upsertShop(shop));
      Toast.show({
        type: 'success',
        text1: `${shop.public_name} requested`,
        text2: 'Pending admin approval.',
      });
      navigation.goBack();
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't request this shop. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Add a shop" subtitle="Another branch, same account" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <InfoNote>
            Requests another branch under your supplier account. It stays
            hidden from customers as <Text style={styles.bold}>pending</Text>{' '}
            until Aqua Flow approves it.
          </InfoNote>

          <Text style={styles.sectionLabel}>Listing</Text>
          <Card style={styles.cardBody}>
            <AppInput
              compact
              label="Shop name"
              value={publicName}
              onChangeText={setPublicName}
            />
            <AppInput
              compact
              label="Branch (optional)"
              placeholder="e.g. DHA Phase 6"
              value={branchName}
              onChangeText={setBranchName}
            />
            <AppInput
              compact
              label="Description (optional)"
              placeholder="One line customers read on your listing"
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </Card>

          <View style={styles.cardHead}>
            <Text style={styles.sectionLabel}>Location</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={locating}
              onPress={useCurrentLocation}
              style={[styles.gpsButton, locating && styles.gpsBusy]}>
              <PinIcon color={Colors.primary} size={14} />
              <Text style={styles.gpsText}>
                {locating ? 'Locating…' : 'Use current location'}
              </Text>
            </TouchableOpacity>
          </View>
          <Card style={styles.cardBody}>
            <AppInput
              compact
              label="Address"
              multiline
              value={addressLine}
              onChangeText={setAddressLine}
            />
            <View style={styles.row}>
              <AppInput
                compact
                style={styles.col}
                label="Landmark (optional)"
                placeholder="Helps a rider find you"
                value={landmark}
                onChangeText={setLandmark}
              />
              <AppInput
                compact
                style={styles.col}
                label="Area (optional)"
                value={area}
                onChangeText={setArea}
              />
            </View>
            <SelectField
              compact
              label="City"
              placeholder={loadingCities ? 'Loading cities…' : 'Pick city'}
              value={cityId}
              options={cityOptions}
              disabled={loadingCities || !cityOptions.length}
              onChange={value => setCityId(Number(value))}
            />
            <View style={styles.row}>
              <AppInput
                compact
                style={styles.col}
                label="Latitude"
                placeholder="24.8607"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
                mono
              />
              <AppInput
                compact
                style={styles.col}
                label="Longitude"
                placeholder="67.0011"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
                mono
              />
            </View>
          </Card>

          <Text style={styles.sectionLabel}>Contact and capacity</Text>
          <Card style={styles.cardBody}>
            <View style={styles.row}>
              <AppInput
                compact
                style={styles.col}
                label="Contact phone"
                placeholder="03XX-XXXXXXX"
                value={contactPhone}
                onChangeText={text => setContactPhone(formatPakistaniPhone(text))}
                keyboardType="phone-pad"
                maxLength={12}
                mono
              />
              <AppInput
                compact
                style={styles.col}
                label="WhatsApp (optional)"
                placeholder="03XX-XXXXXXX"
                value={whatsappNumber}
                onChangeText={text => setWhatsappNumber(formatPakistaniPhone(text))}
                keyboardType="phone-pad"
                maxLength={12}
                mono
              />
            </View>
            <AppInput
              compact
              label="Orders per day (optional)"
              placeholder="Leave empty for no cap"
              value={capacityPerDay}
              onChangeText={setCapacityPerDay}
              keyboardType="number-pad"
            />
          </Card>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Request shop"
          onPress={submit}
          loading={submitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16, gap: 7},
  bold: {fontWeight: '800'},
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 3,
    marginLeft: 3,
  },
  cardBody: {gap: 8},
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 27,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.primaryTint,
  },
  gpsBusy: {opacity: 0.6},
  gpsText: {fontSize: 11, fontWeight: '800', color: Colors.primary},
  row: {flexDirection: 'row', gap: 8, alignItems: 'flex-start'},
  col: {flex: 1},
  error: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.07,
    shadowRadius: 26,
    shadowOffset: {width: 0, height: -8},
    elevation: 12,
  },
});

export default CreateShopScreen;
