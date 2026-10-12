import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import CustomerCard from '../../../Component/People/CustomerCard';
import FilterRow from '../../../Component/People/FilterRow';
import RestrictedScreen from '../../../Component/People/RestrictedScreen';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useDebounce} from '../../../hooks/useDebounce';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {formatPhoneDisplay} from '../../../helper/phoneHelper';
import {
  grantCustomerAppAccess,
  listCustomerTypes,
  listShopCustomers,
  type CustomerSource,
  type CustomerType,
  type ShopCustomer,
} from '../../../Server/Customers/CustomersApi';

const PER_PAGE = 20;

type SourceFilter = 'all' | CustomerSource;
type AccessFilter = 'all' | 'yes' | 'no';

const SOURCE_OPTIONS: {value: SourceFilter; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'shop', label: 'Added by shop'},
  {value: 'app', label: 'Ordered via app'},
];

const ACCESS_OPTIONS: {value: AccessFilter; label: string}[] = [
  {value: 'all', label: 'Any'},
  {value: 'yes', label: 'Has app access'},
  {value: 'no', label: 'No app access'},
];

/**
 * The shop's customer book — walk-in regulars and delivery households the
 * shop adds itself, plus app customers recorded automatically once they order.
 * Owners and managers only; a rider would get a 403.
 */
const CustomersScreen: React.FC = () => {
  const {isShopManager} = useSupplierRoles();
  const shopId = useActiveShopId();

  if (!isShopManager) {
    return (
      <RestrictedScreen
        title="Customers"
        heading="For owners and managers"
        message="The customer book is for shop owners and managers. Ask your shop owner if you need a customer's details."
      />
    );
  }

  if (!shopId) {
    return (
      <RestrictedScreen
        title="Customers"
        heading="No shop yet"
        message="No shop is linked to this account yet, so there is no customer book to show."
      />
    );
  }

  return <CustomerBook shopId={shopId} />;
};

/**
 * The list itself. Cursor-paged (`next_cursor`), so "Load more" appends the
 * next slice and there is no total to show.
 */
const CustomerBook: React.FC<{shopId: number}> = ({shopId}) => {
  const navigation = useNavigation<any>();

  const [types, setTypes] = useState<CustomerType[]>([]);
  const [typeFilter, setTypeFilter] = useState<number | 'all'>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [access, setAccess] = useState<AccessFilter>('all');
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 350);

  const [rows, setRows] = useState<ShopCustomer[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grantingId, setGrantingId] = useState<number | null>(null);

  // Bumped on every fresh load so a slow response for old filters is dropped.
  const requestId = useRef(0);

  useEffect(() => {
    listCustomerTypes()
      .then(setTypes)
      .catch(() => {
        // The type filter and the form fall back to what the rows carry.
      });
  }, []);

  const fetchPage = useCallback(
    (cursor?: string) =>
      listShopCustomers(shopId, {
        customer_type_id: typeFilter === 'all' ? undefined : typeFilter,
        source: source === 'all' ? undefined : source,
        has_app_access: access === 'all' ? undefined : access === 'yes',
        search: query || undefined,
        cursor,
        per_page: PER_PAGE,
      }),
    [shopId, typeFilter, source, access, query],
  );

  const load = useCallback(
    async (isRefresh = false) => {
      const id = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const page = await fetchPage();
        if (id !== requestId.current) return;
        setRows(page.data ?? []);
        setNextCursor(page.next_cursor ?? null);
      } catch (err) {
        if (id !== requestId.current) return;
        const message = apiErrorMessage(err, 'Could not load your customers.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      if (id !== requestId.current) return;
      setRows(prev => [...prev, ...(page.data ?? [])]);
      setNextCursor(page.next_cursor ?? null);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load more customers.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const grantAccess = (customer: ShopCustomer) => {
    Alert.alert(
      'Give app access?',
      `${customer.name} will be able to order through the customer app with ${formatPhoneDisplay(
        customer.phone,
      )}. They sign in with a one-time code sent to that number.`,
      [
        {text: 'Not now', style: 'cancel'},
        {
          text: 'Give access',
          onPress: async () => {
            setGrantingId(customer.id);
            try {
              const updated = await grantCustomerAppAccess(shopId, customer.id);
              setRows(prev =>
                prev.map(row => (row.id === updated.id ? updated : row)),
              );
              Toast.show({
                type: 'success',
                text1: `${customer.name} can now use the app`,
              });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: apiErrorMessage(err, 'Could not give app access.'),
              });
            } finally {
              setGrantingId(null);
            }
          },
        },
      ],
    );
  };

  const openForm = (customer?: ShopCustomer) =>
    navigation.navigate(Route.CustomerFormScreen, {customer, types});

  const typeOptions: {value: number | 'all'; label: string}[] = [
    {value: 'all', label: 'All'},
    ...types.map(type => ({value: type.id, label: type.name})),
  ];

  const filtered =
    typeFilter !== 'all' || source !== 'all' || access !== 'all' || !!query;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Customers"
        subtitle="Regulars, households and app customers"
        right={
          <TouchableOpacity onPress={() => openForm()} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            <AppInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or phone"
              autoCapitalize="none"
            />
            {types.length > 0 && (
              <FilterRow
                label="Type"
                options={typeOptions}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            )}
            <FilterRow
              label="Source"
              options={SOURCE_OPTIONS}
              value={source}
              onChange={setSource}
            />
            <FilterRow
              label="App access"
              options={ACCESS_OPTIONS}
              value={access}
              onChange={setAccess}
            />
            {loading && rows.length > 0 && (
              <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
            )}
          </View>
        }
        renderItem={({item}) => (
          <CustomerCard
            customer={item}
            granting={grantingId === item.id}
            onPress={() => openForm(item)}
            onGrantAccess={() => grantAccess(item)}
            onNewOrder={() =>
              navigation.navigate(Route.NewOrderScreen, {
                customerId: item.id,
                customerName: item.name,
              })
            }
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : error ? (
            <EmptyState
              title="Couldn't load customers"
              message={error}
              actionLabel="Try again"
              onAction={() => load()}
            />
          ) : (
            <EmptyState
              title="No customers found"
              message={
                filtered
                  ? 'Nobody matches these filters. Clear them to see the whole book.'
                  : 'Add your regulars here. App customers appear automatically after they order.'
              }
              actionLabel={filtered ? undefined : 'Add customer'}
              onAction={() => openForm()}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <LoadMoreFooter
              shown={rows.length}
              hasMore={!!nextCursor}
              loading={loadingMore}
              onLoadMore={loadMore}
              noun="customers"
            />
            <InfoNote>
              App customers' numbers are always masked and never searchable, so
              the book can't be used to find out who owns a number. Giving a
              hand-added customer app access creates their account (or links an
              existing one) and they sign in with a one-time code.
            </InfoNote>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addButtonText: {color: Colors.white, fontSize: 12.5, fontWeight: '800'},

  body: {padding: 18, gap: 12, paddingBottom: 30},
  filters: {gap: 12, marginBottom: 2},
  inlineLoader: {alignSelf: 'flex-start'},
  loader: {paddingVertical: 40},
  footer: {gap: 12},
});

export default CustomersScreen;
