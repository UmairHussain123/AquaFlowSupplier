import React from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import Pill from '../../../Component/Common/Pill';
import {selectActiveShop} from '../../../Redux/slices/shopSlice';
import {selectUser} from '../../../Redux/slices/userSlice';
import {logoutRequest} from '../../../Server/User';
import {apiErrorMessage, initials} from '../../../helper/helperFunction';
import {shopLocationLabel} from '../../../Server/Shops/ShopsApi';

/** The signed-in account. Editing it is ops-side — the supplier API exposes no
 *  profile update endpoint. */
const ProfileScreen: React.FC = () => {
  const user = useSelector(selectUser);
  const shop = useSelector(selectActiveShop);

  const signOut = () => {
    Alert.alert('Log out?', 'You will need your email and password to sign back in.', [
      {text: 'Stay signed in', style: 'cancel'},
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutRequest();
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: apiErrorMessage(error, 'Signed out locally.'),
            });
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Profile" />

      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(user?.name)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{user?.name ?? '—'}</Text>
              <Text style={styles.email}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.roles}>
            {(user?.roles ?? []).map(role => (
              <Pill key={role} label={role.replace(/_/g, ' ')} tone="primary" />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Shop</Text>
          <View style={styles.lines}>
            <KeyValueRow label="Name" value={shop?.public_name ?? '—'} />
            <KeyValueRow label="Location" value={shopLocationLabel(shop)} />
            <KeyValueRow label="Phone" value={shop?.contact_phone ?? '—'} />
            <KeyValueRow
              label="Rating"
              value={
                shop?.rating_avg && Number(shop.rating_avg) > 0
                  ? `${Number(shop.rating_avg).toFixed(1)} ★`
                  : 'No ratings yet'
              }
            />
          </View>
        </Card>

        <InfoNote>
          Account and shop details are changed by Aqua Flow ops — raise a support
          ticket to have anything here updated.
        </InfoNote>

        <AppButton title="Log out" variant="danger" onPress={signOut} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  identity: {flexDirection: 'row', alignItems: 'center', gap: 13},
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 17, fontWeight: '800', color: Colors.primary},
  name: {fontSize: 16, fontWeight: '800', color: Colors.text},
  email: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 2},
  roles: {flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 12},

  cardTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  lines: {gap: 9, marginTop: 11},
});

export default ProfileScreen;
