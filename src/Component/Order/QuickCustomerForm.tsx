import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import AppButton from '../Common/AppButton';
import AppInput from '../Common/AppInput';
import SelectField from '../Common/SelectField';
import {apiErrorMessage} from '../../helper/helperFunction';
import {
  formatPakistaniPhone,
  isPakistaniMobile,
} from '../../helper/phoneHelper';
import {
  createShopCustomer,
  listCustomerTypes,
  type CustomerType,
  type ShopCustomer,
} from '../../Server/Customers/CustomersApi';

/** Searches that look like a phone number prefill the phone, not the name. */
const looksLikePhone = (value: string) => /^[+\d\s-]{3,}$/.test(value.trim());

/**
 * Add a customer without leaving New order: the few fields an order needs,
 * saved to the shop's book and handed straight back as the picked customer.
 * Notes and the rest stay on the full Customers form.
 */
const QuickCustomerForm: React.FC<{
  shopId: number;
  /** Whatever was typed in the search box — becomes the name or the phone. */
  initial: string;
  onCreated: (customer: ShopCustomer) => void;
  onCancel: () => void;
}> = ({shopId, initial, onCreated, onCancel}) => {
  const phoneFirst = looksLikePhone(initial);
  const [name, setName] = useState(phoneFirst ? '' : initial.trim());
  const [phone, setPhone] = useState(
    phoneFirst ? formatPakistaniPhone(initial) : '',
  );
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [types, setTypes] = useState<CustomerType[]>([]);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listCustomerTypes()
      .then(rows => {
        if (!active) return;
        setTypes(rows);
        // An order placed from here is delivered, so default to the
        // household "Delivery" type when the directory has one.
        const preferred = rows.find(type => type.slug === 'delivery') ?? rows[0];
        setTypeId(current => current ?? preferred?.id ?? null);
      })
      .catch(err => {
        if (active) {
          setError(apiErrorMessage(err, "Couldn't load customer types."));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (saving) return;
    if (!name.trim()) return setError('Enter the customer’s name.');
    if (phone && !isPakistaniMobile(phone)) {
      return setError('Enter the mobile as 03XX-XXXXXXX, or leave it blank.');
    }
    if (!typeId) return setError('Pick a customer type.');

    setError(null);
    setSaving(true);
    try {
      const created = await createShopCustomer(shopId, {
        name: name.trim(),
        phone: phone.trim() || null,
        customer_type_id: typeId,
        address_line: address.trim() || null,
        area: area.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't add this customer."));
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>New customer</Text>
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <AppInput
        compact
        label="Name"
        placeholder="Ali Khan"
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
      />
      <View style={styles.row}>
        <AppInput
          compact
          style={styles.col}
          label="Mobile"
          placeholder="03XX-XXXXXXX"
          keyboardType="phone-pad"
          mono
          maxLength={12}
          value={phone}
          onChangeText={value => setPhone(formatPakistaniPhone(value))}
        />
        {types.length > 1 && (
          <View style={styles.col}>
            <SelectField
              compact
              label="Type"
              value={typeId}
              options={types.map(type => ({
                value: type.id,
                label: type.name,
                hint: type.description ?? undefined,
              }))}
              onChange={value => setTypeId(Number(value))}
            />
          </View>
        )}
      </View>
      <View style={styles.row}>
        <AppInput
          compact
          style={styles.addressCol}
          label="Address (optional)"
          placeholder="House, street"
          value={address}
          onChangeText={setAddress}
          maxLength={255}
        />
        <AppInput
          compact
          style={styles.col}
          label="Area"
          placeholder="Clifton"
          value={area}
          onChangeText={setArea}
          maxLength={255}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <AppButton
        title="Add and use customer"
        small
        loading={saving}
        onPress={save}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryTint,
  },
  head: {flexDirection: 'row', alignItems: 'center'},
  title: {flex: 1, fontSize: 13.5, fontWeight: '800', color: Colors.text},
  cancel: {fontSize: 12.5, fontWeight: '800', color: Colors.textSecondary},
  row: {flexDirection: 'row', gap: 8, alignItems: 'flex-start'},
  col: {flex: 1},
  addressCol: {flex: 1.6},
  error: {fontSize: 12.5, color: Colors.danger, fontWeight: '600'},
});

export default QuickCustomerForm;
