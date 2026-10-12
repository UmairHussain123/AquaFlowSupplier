import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {useFocusEffect} from '@react-navigation/native';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import ListRow from '../../../Component/Common/ListRow';
import QuantityStepper from '../../../Component/Common/QuantityStepper';
import QuickCustomerForm from '../../../Component/Order/QuickCustomerForm';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useDebounce} from '../../../hooks/useDebounce';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage, formatMoney, toNumber} from '../../../helper/helperFunction';
import {
  formatPakistaniPhone,
  formatPhoneDisplay,
  isPakistaniMobile,
  phoneDigits,
} from '../../../helper/phoneHelper';
import {
  listShopCustomers,
  type ShopCustomer,
} from '../../../Server/Customers/CustomersApi';
import {createOrder} from '../../../Server/Order/OrdersApi';
import {
  listShopProducts,
  productLabel,
  productSize,
  type ShopProduct,
} from '../../../Server/Product/ProductsApi';

/** How many search matches the picker lists before asking for a narrower search. */
const VISIBLE_CUSTOMERS = 8;

/**
 * The shop places an order for a customer who isn't using the app — the
 * portal's orders/new. Owner or manager only. The order starts out accepted,
 * has no delivery OTP and reserves stock straight away.
 *
 * Route params `{customerId?, customerName?}` preselect a customer (the
 * customers list passes both, so the name search finds the row however long
 * the book is).
 */
const NewOrderScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();

  if (!isShopManager || !shopId) {
    return (
      <View style={styles.screen}>
        <AppHeader title="New order" />
        <EmptyState
          title={isShopManager ? 'No shop yet' : 'Not available'}
          message={
            isShopManager
              ? 'No shop is linked to your account yet.'
              : 'Only shop owners and managers can place an order for a customer.'
          }
        />
      </View>
    );
  }

  return <NewOrderForm shopId={shopId} navigation={navigation} route={route} />;
};

const NewOrderForm: React.FC<{shopId: number; navigation: any; route: any}> = ({
  shopId,
  navigation,
  route,
}) => {
  const presetName: string = route?.params?.customerName ?? '';
  // Picked once from the first result set, then forgotten.
  const presetIdRef = useRef<number | null>(
    Number(route?.params?.customerId) || null,
  );

  // ---------- Customer ----------
  const [customerSearch, setCustomerSearch] = useState(presetName);
  const query = useDebounce(customerSearch.trim(), 300);
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [moreCustomers, setMoreCustomers] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customersAttempt, setCustomersAttempt] = useState(0);
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  // Results per search text, so backspacing to an earlier search is instant.
  const customerCache = useRef(
    new Map<string, {rows: ShopCustomer[]; more: boolean}>(),
  );

  // ---------- Products ----------
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // ---------- Delivery ----------
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only hand-added customers: an app customer orders for themselves, with their own OTP.
  // Asks for just the rows the picker shows — a 100-row page per keystroke
  // was most of the wait.
  useEffect(() => {
    const cached = customerCache.current.get(query);
    if (cached) {
      setCustomers(cached.rows);
      setMoreCustomers(cached.more);
      setCustomersError(null);
      setLoadingCustomers(false);
      return;
    }

    let active = true;
    setLoadingCustomers(true);
    listShopCustomers(shopId, {
      source: 'shop',
      search: query || undefined,
      per_page: VISIBLE_CUSTOMERS,
    })
      .then(page => {
        if (!active) return;
        const rows = page.data ?? [];
        const more = !!page.next_cursor;
        customerCache.current.set(query, {rows, more});
        setCustomers(rows);
        setMoreCustomers(more);
        setCustomersError(null);
      })
      .catch(err => {
        if (active) {
          setCustomersError(apiErrorMessage(err, "Couldn't load your customers."));
        }
      })
      .finally(() => {
        if (active) setLoadingCustomers(false);
      });
    return () => {
      active = false;
    };
  }, [customersAttempt, query, shopId]);

  useEffect(() => {
    if (loadingCustomers || presetIdRef.current === null) return;
    const match = customers.find(row => row.id === presetIdRef.current);
    if (match) setCustomer(match);
    presetIdRef.current = null;
  }, [customers, loadingCustomers]);

  // The customer's saved address is the starting point; the shop can change it for this order.
  useEffect(() => {
    setAddress(customer?.address_line ?? '');
    setArea(customer?.area ?? '');
  }, [customer]);

  const hasProducts = useRef(false);
  const loadProducts = useCallback(async () => {
    // A refresh on coming back keeps the list (and picked quantities) on screen.
    if (!hasProducts.current) setLoadingProducts(true);
    try {
      const page = await listShopProducts(shopId, {
        is_active: 'true',
        per_page: 100,
        sort_by: 'id',
        sort_order: 'asc',
      });
      const active = (page.data ?? []).filter(
        listing => listing.is_active !== false,
      );
      hasProducts.current = active.length > 0;
      setProducts(active);
      setProductsError(null);
    } catch (err) {
      setProductsError(apiErrorMessage(err, "Couldn't load your products."));
    } finally {
      setLoadingProducts(false);
    }
  }, [shopId]);

  // Re-read on focus, so a product added from here shows up on return.
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  const onCustomerCreated = (created: ShopCustomer) => {
    customerCache.current.clear();
    setCustomer(created);
    setAddingCustomer(false);
    setError(null);
    Toast.show({type: 'success', text1: `${created.name} added`});
  };

  /** Never below zero, never above what's on the shelf. */
  const setQuantity = (listing: ShopProduct, next: number) => {
    const max = Math.max(0, listing.stock_quantity ?? 0);
    setQuantities(prev => ({
      ...prev,
      [listing.id]: Math.max(0, Math.min(next, max)),
    }));
  };

  const lines = useMemo(
    () =>
      products
        .map(listing => ({listing, quantity: quantities[listing.id] ?? 0}))
        .filter(line => line.quantity > 0),
    [products, quantities],
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * toNumber(line.listing.price),
    0,
  );
  const deposit = lines.reduce(
    (sum, line) => sum + line.quantity * toNumber(line.listing.deposit_amount),
    0,
  );
  const fee = toNumber(deliveryFee);
  const total = subtotal + deposit + fee;

  /** The first problem with the form, or null when it can be sent. */
  const validate = (picked: ShopCustomer): string | null => {
    const contact = contactPhone.trim();
    if (contact && !isPakistaniMobile(contact)) {
      return 'Enter the contact phone as a mobile number, e.g. 0300-1234567.';
    }
    if (!picked.phone && !contact) {
      return `${picked.name} has no phone number — add one in Customers first, or enter a contact phone.`;
    }
    if (!lines.length) return 'Add at least one product.';
    if (!address.trim()) return 'Add a delivery address.';
    const rawFee = deliveryFee.trim();
    if (rawFee && (Number.isNaN(Number(rawFee)) || Number(rawFee) < 0)) {
      return 'Delivery fee must be a positive number.';
    }
    return null;
  };

  const submit = async () => {
    if (!customer) {
      setError('Choose a customer.');
      return;
    }
    const problem = validate(customer);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const contact = contactPhone.trim();
      const created = await createOrder(shopId, {
        shop_customer_id: customer.id,
        items: lines.map(line => ({
          shop_product_id: line.listing.id,
          quantity: line.quantity,
        })),
        delivery_fee: fee,
        address_line: address.trim(),
        area: area.trim() || undefined,
        contact_phone: contact ? phoneDigits(contact) : undefined,
      });
      Toast.show({
        type: 'success',
        text1: `Order ${created.order_number} placed`,
        text2: `For ${customer.name}`,
      });
      navigation.replace(Route.OrderDetailScreen, {orderId: created.id});
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't place this order. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const shownCustomers = customers.slice(0, VISIBLE_CUSTOMERS);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="New order"
        subtitle="For a customer who isn't using the app"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {/* ---------- Customer ---------- */}
          <Card>
            <Text style={styles.label}>Customer</Text>

            {customer ? (
              <View style={styles.picked}>
                <View style={styles.pickedHead}>
                  <Text style={styles.pickedName}>{customer.name}</Text>
                  <TouchableOpacity
                    onPress={() => setCustomer(null)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Text style={styles.link}>Change</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.meta}>
                  {formatPhoneDisplay(customer.phone, 'No phone')}
                </Text>
                {!!(customer.address_line || customer.area) && (
                  <Text style={styles.meta}>
                    {[customer.address_line, customer.area]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                )}
                {!customer.phone && (
                  <Text style={styles.error}>
                    {customer.name} has no phone number. Add one in Customers,
                    or enter a contact phone below.
                  </Text>
                )}
              </View>
            ) : addingCustomer ? (
              <QuickCustomerForm
                shopId={shopId}
                initial={customerSearch}
                onCreated={onCustomerCreated}
                onCancel={() => setAddingCustomer(false)}
              />
            ) : (
              <View style={styles.section}>
                <View style={styles.searchRow}>
                  <AppInput
                    compact
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    placeholder="Search by name or phone"
                    autoCapitalize="none"
                    style={styles.flex}
                  />
                  {loadingCustomers && (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  )}
                </View>

                {customersError ? (
                  <View style={styles.inlineError}>
                    <Text style={styles.error}>{customersError}</Text>
                    <TouchableOpacity
                      onPress={() => setCustomersAttempt(prev => prev + 1)}>
                      <Text style={styles.link}>Try again</Text>
                    </TouchableOpacity>
                  </View>
                ) : !loadingCustomers && !customers.length ? (
                  <Text style={styles.meta}>
                    {query
                      ? `No customer matches “${query}”.`
                      : 'No customers in your book yet.'}{' '}
                    App customers order for themselves, so they aren't listed.
                  </Text>
                ) : (
                  !!shownCustomers.length && (
                    <View style={styles.results}>
                      {shownCustomers.map((row, index) => (
                        <ListRow
                          key={row.id}
                          title={row.name}
                          subtitle={[
                            formatPhoneDisplay(row.phone, 'No phone'),
                            row.area,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          onPress={() => {
                            setCustomer(row);
                            setError(null);
                          }}
                          last={index === shownCustomers.length - 1}
                        />
                      ))}
                    </View>
                  )
                )}

                {moreCustomers && (
                  <Text style={styles.meta}>
                    Showing the first {shownCustomers.length} matches — keep
                    typing to narrow the list.
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.addCustomer}
                  onPress={() => {
                    setAddingCustomer(true);
                    setError(null);
                  }}>
                  <Text style={styles.addCustomerText}>
                    + New customer
                    {query && !customers.length ? ` “${query}”` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* ---------- Products ---------- */}
          <Card>
            <Text style={styles.label}>Products</Text>

            {loadingProducts ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.meta}>Loading products…</Text>
              </View>
            ) : productsError ? (
              <View style={styles.inlineError}>
                <Text style={styles.error}>{productsError}</Text>
                <TouchableOpacity onPress={loadProducts}>
                  <Text style={styles.link}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : !products.length ? (
              <View style={[styles.inlineError, styles.spaced]}>
                <Text style={styles.meta}>
                  This shop has no active products yet.
                </Text>
                <TouchableOpacity
                  style={styles.addCustomer}
                  onPress={() => navigation.navigate(Route.ProductFormScreen, {})}>
                  <Text style={styles.addCustomerText}>+ Add a product</Text>
                </TouchableOpacity>
              </View>
            ) : (
              products.map(listing => {
                const stock = Math.max(0, listing.stock_quantity ?? 0);
                const soldOut = stock <= 0;
                const depositEach = toNumber(listing.deposit_amount);
                return (
                  <View key={listing.id} style={styles.product}>
                    <Text style={styles.productName}>{productLabel(listing)}</Text>
                    <Text style={styles.meta}>
                      {productSize(listing.product)} · {formatMoney(listing.price)}
                      {depositEach > 0
                        ? ` + ${formatMoney(depositEach)} deposit`
                        : ''}
                      {' · '}
                      {soldOut ? 'out of stock' : `${stock} in stock`}
                    </Text>
                    <QuantityStepper
                      label={soldOut ? 'Out of stock' : 'Quantity'}
                      value={quantities[listing.id] ?? 0}
                      onChange={next => setQuantity(listing, next)}
                      max={stock}
                      disabled={soldOut}
                    />
                  </View>
                );
              })
            )}
          </Card>

          {/* ---------- Delivery ---------- */}
          <Card>
            <Text style={styles.label}>Delivery</Text>
            <View style={styles.section}>
              <AppInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="House, street, landmark"
                maxLength={255}
              />
              <AppInput
                label="Area (optional)"
                value={area}
                onChangeText={setArea}
                maxLength={255}
              />
              <AppInput
                label="Contact phone (optional)"
                value={contactPhone}
                onChangeText={value => setContactPhone(formatPakistaniPhone(value))}
                placeholder={
                  customer?.phone
                    ? formatPhoneDisplay(customer.phone)
                    : '03XX-XXXXXXX'
                }
                keyboardType="phone-pad"
                mono
              />
              <AppInput
                label="Delivery fee (Rs, optional)"
                value={deliveryFee}
                onChangeText={setDeliveryFee}
                placeholder="0"
                keyboardType="decimal-pad"
                mono
              />
            </View>
          </Card>

          {/* ---------- Summary ---------- */}
          <Card>
            <Text style={styles.label}>Summary</Text>

            {lines.length ? (
              <View style={styles.summaryLines}>
                {lines.map(line => (
                  <KeyValueRow
                    key={line.listing.id}
                    label={`${line.quantity} × ${productLabel(line.listing)}`}
                    value={formatMoney(line.quantity * toNumber(line.listing.price))}
                  />
                ))}
              </View>
            ) : (
              <Text style={[styles.meta, styles.spaced]}>
                No products added yet.
              </Text>
            )}

            <View style={styles.rule} />

            <View style={styles.summaryLines}>
              <KeyValueRow label="Subtotal" value={formatMoney(subtotal)} />
              <KeyValueRow
                label="Container deposit"
                value={formatMoney(deposit)}
                tone={deposit > 0 ? 'warn' : 'neutral'}
              />
              <KeyValueRow label="Delivery fee" value={formatMoney(fee)} />
              <View style={styles.rule} />
              <KeyValueRow
                label="Total (cash on delivery)"
                value={formatMoney(total)}
                strong
              />
            </View>
          </Card>

          <InfoNote>
            The order starts as accepted and is delivered without an OTP, since
            the customer isn't on the app. Stock is reserved straight away.
          </InfoNote>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {!!error && <Text style={styles.footerError}>{error}</Text>}
        <AppButton
          title={lines.length ? `Place order · ${formatMoney(total)}` : 'Place order'}
          onPress={submit}
          loading={submitting}
          style={styles.submit}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  section: {gap: 12, marginTop: 12},
  spaced: {marginTop: 10},
  meta: {fontSize: 12, color: Colors.textSecondary, lineHeight: 18},
  error: {fontSize: 12.5, color: Colors.danger, fontWeight: '600', lineHeight: 19},
  link: {fontSize: 13, fontWeight: '800', color: Colors.primary},

  searchRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  results: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    overflow: 'hidden',
  },
  inlineError: {gap: 8},
  addCustomer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primaryTint,
  },
  addCustomerText: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},

  picked: {gap: 4, marginTop: 10},
  pickedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickedName: {flex: 1, fontSize: 15, fontWeight: '800', color: Colors.text},

  loadingRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12},
  product: {
    gap: 6,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft2,
  },
  productName: {fontSize: 14, fontWeight: '800', color: Colors.text},

  summaryLines: {gap: 9, marginTop: 10},
  rule: {height: 1, backgroundColor: Colors.borderSoft, marginTop: 10},

  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.07,
    shadowRadius: 26,
    shadowOffset: {width: 0, height: -8},
    elevation: 12,
  },
  footerError: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.danger,
    backgroundColor: Colors.dangerBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    overflow: 'hidden',
    lineHeight: 18,
  },
  submit: {height: 56, borderRadius: 15},
});

export default NewOrderScreen;
