import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import AppButton from '../Common/AppButton';
import Card from '../Common/Card';
import Pill from '../Common/Pill';
import {formatPhoneDisplay} from '../../helper/phoneHelper';
import {formatDateTime} from '../../helper/dateHelper';
import type {ShopCustomer} from '../../Server/Customers/CustomersApi';

/**
 * One customer in the shop's book. Hand-added (`shop`) rows with a number on
 * file carry the "Give app access" and "New order" actions; app customers only
 * ever show a masked number, so there is nothing to act on.
 */
const CustomerCard: React.FC<{
  customer: ShopCustomer;
  granting?: boolean;
  onPress: () => void;
  onGrantAccess: () => void;
  onNewOrder: () => void;
}> = ({customer, granting = false, onPress, onGrantAccess, onNewOrder}) => {
  const fromShop = customer.source === 'shop';
  const canGrant = fromShop && !customer.has_app_access && !!customer.phone;
  const canOrder = fromShop && !!customer.phone;
  const where = [customer.address_line, customer.area].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card>
        <View style={styles.head}>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {customer.name || '—'}
            </Text>
            <Text style={styles.type}>
              {customer.customer_type_name ?? customer.customer_type ?? '—'}
            </Text>
          </View>
          <Text style={styles.phone}>
            {formatPhoneDisplay(customer.phone, 'No phone')}
          </Text>
        </View>

        {!!where && (
          <Text style={styles.where} numberOfLines={2}>
            {where}
          </Text>
        )}

        <View style={styles.pills}>
          <Pill
            label={fromShop ? 'Added by shop' : 'Ordered via app'}
            tone={fromShop ? 'neutral' : 'primary'}
          />
          {customer.has_app_access && fromShop && <Pill label="App access" tone="success" />}
        </View>

        {customer.has_app_access && fromShop && !!customer.app_access_granted_at && (
          <Text style={styles.hint}>
            App access since {formatDateTime(customer.app_access_granted_at)}
          </Text>
        )}

        {fromShop && !customer.phone && (
          <Text style={styles.hint}>
            Add a mobile number to give app access or place an order for them.
          </Text>
        )}

        {(canGrant || canOrder) && (
          <View style={styles.actions}>
            {canGrant && (
              <AppButton
                title="Give app access"
                variant="secondary"
                small
                loading={granting}
                onPress={onGrantAccess}
              />
            )}
            {canOrder && (
              <AppButton title="New order" small onPress={onNewOrder} />
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  head: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  name: {fontSize: 15, fontWeight: '800', color: Colors.text},
  type: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 2},
  phone: {fontFamily: Fonts.mono, fontSize: 12.5, color: Colors.slate},
  where: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 8, lineHeight: 18},
  pills: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
  hint: {fontSize: 11.5, color: Colors.textMuted, marginTop: 8, lineHeight: 17},
  actions: {flexDirection: 'row', gap: 8, marginTop: 12},
});

export default CustomerCard;
