import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';

import {Colors} from '../../Constant/Colors';
import Route from '../../Constant/NavigationStrings';
import {useActiveShop} from '../../hooks/useActiveShop';
import {selectUser} from '../../Redux/slices/userSlice';
import {getSupplierAccountStatus} from '../../Server/Compliance/ComplianceApi';
import type {Shop} from '../../Server/Shops/ShopsApi';

type BannerTone = 'danger' | 'warning';

interface Banner {
  key: string;
  tone: BannerTone;
  title: string;
  body: string;
}

/** Which banners apply for this supplier account status and shop. */
export const buildStatusBanners = (
  profileStatus: string | null,
  shop: Shop | null,
): Banner[] => {
  const banners: Banner[] = [];

  if (profileStatus === 'suspended') {
    banners.push({
      key: 'profile-suspended',
      tone: 'danger',
      title: 'Your supplier account is suspended',
      body: "Aqua Flow has suspended your supplier account. Customers can't order from your shops until it is lifted.",
    });
  } else if (profileStatus === 'expired') {
    banners.push({
      key: 'profile-expired',
      tone: 'warning',
      title: 'Your supplier approval has expired',
      body: 'Your compliance documents need renewing before Aqua Flow can keep your shops live.',
    });
  }

  if (shop?.status === 'suspended') {
    banners.push({
      key: 'shop-suspended',
      tone: 'danger',
      title: `${shop.public_name ?? 'Your shop'} is suspended`,
      body: "Customers can't find or order from this shop. You can't lift this yourself.",
    });
  } else if (shop?.status === 'paused') {
    banners.push({
      key: 'shop-paused',
      tone: 'warning',
      title: `${shop.public_name ?? 'Your shop'} has been paused by Aqua Flow`,
      body: 'Customers can\'t order until Aqua Flow resumes it. Turning "Accepting orders" on won\'t change this.',
    });
  }

  return banners;
};

const TONES: Record<BannerTone, {bg: string; bar: string; fg: string}> = {
  danger: {bg: Colors.dangerBg, bar: Colors.danger, fg: Colors.danger},
  warning: {bg: Colors.warningBg, bar: Colors.warning, fg: Colors.warningText},
};

/**
 * Tells the supplier when Aqua Flow — not the shop — has stopped them trading.
 *
 * The API never blocks a supplier in these states (they can still sign in and
 * use every screen); what changes is that customers stop seeing and ordering
 * from the shop. Without a banner the shop would simply sit silent, so the app
 * says why and points at support.
 */
const StatusBanners: React.FC = () => {
  const navigation = useNavigation<any>();
  const shop = useActiveShop();
  const user = useSelector(selectUser);
  const userId = user?.id ?? null;
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSupplierAccountStatus(userId)
        .then(status => {
          if (active) setProfileStatus(status);
        })
        .catch(() => {
          /* A banner is a hint — if the profile can't be read, show none. */
        });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  const banners = buildStatusBanners(profileStatus, shop);
  if (!banners.length) return null;

  return (
    <View style={styles.stack}>
      {banners.map(banner => {
        const palette = TONES[banner.tone];
        return (
          <View
            key={banner.key}
            accessibilityRole="alert"
            style={[styles.banner, {backgroundColor: palette.bg}]}>
            <View style={[styles.bar, {backgroundColor: palette.bar}]} />
            <View style={styles.flex}>
              <Text style={[styles.title, {color: palette.fg}]}>
                {banner.title}
              </Text>
              <Text style={[styles.body, {color: palette.fg}]}>
                {banner.body}{' '}
                <Text
                  accessibilityRole="link"
                  style={styles.link}
                  onPress={() => navigation.navigate(Route.SupportScreen)}>
                  Contact support
                </Text>
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {gap: 8},
  flex: {flex: 1},
  banner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bar: {width: 7, alignSelf: 'stretch', borderRadius: 4},
  title: {fontSize: 13.5, fontWeight: '800'},
  body: {fontSize: 12, lineHeight: 18, marginTop: 3, opacity: 0.92},
  link: {fontWeight: '800', textDecorationLine: 'underline'},
});

export default StatusBanners;
