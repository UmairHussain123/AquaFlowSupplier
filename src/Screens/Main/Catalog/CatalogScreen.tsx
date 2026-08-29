import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import Pill from '../../../Component/Common/Pill';
import ProductCard from '../../../Component/Cards/ProductCard';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {PlusIcon} from '../../../Component/Icons/TabIcons';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useDebounce} from '../../../hooks/useDebounce';
import {
  setCatalogBrand,
  setCatalogCategory,
  setCatalogLowStock,
  setCatalogSearch,
} from '../../../Redux/slices/filterSlice';
import {
  collectBrands,
  collectCategories,
  isLowStock,
  listShopProducts,
  productLabel,
  returnModeLabel,
  updateShopProduct,
  type ShopProduct,
} from '../../../Server/Product/ProductsApi';
import {apiErrorMessage, formatMoney, toNumber} from '../../../helper/helperFunction';

/**
 * SB5 — the shop's listings, their stock and the deposits attached to them.
 *
 * The filter dropdowns are built from whatever the current listings carry: the
 * supplier API has no catalog/category/brand browse endpoint (those are
 * admin-only), so there is nothing else to populate them from.
 */
const CatalogScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();

  const {catalogSearch, catalogCategoryId, catalogBrandId, catalogLowStockOnly} =
    useSelector((state: any) => state.filter);

  const [listings, setListings] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const search = useDebounce(catalogSearch, 400);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!shopId) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      try {
        const page = await listShopProducts(shopId, {
          search: search || undefined,
          category_id: catalogCategoryId ?? undefined,
          brand_id: catalogBrandId ?? undefined,
          low_stock: catalogLowStockOnly ? 'true' : undefined,
          per_page: 100,
          sort_by: 'created_at',
          sort_order: 'desc',
        });
        setListings(page.data ?? []);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: apiErrorMessage(error, 'Could not load your catalog.'),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [catalogBrandId, catalogCategoryId, catalogLowStockOnly, search, shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const categories = useMemo(() => collectCategories(listings), [listings]);
  const brands = useMemo(() => collectBrands(listings), [listings]);

  const depositLines = useMemo(
    () =>
      listings
        .filter(listing => toNumber(listing.deposit_amount) > 0)
        .map(listing => ({
          label: `${productLabel(listing)} deposit`,
          value: formatMoney(listing.deposit_amount),
        })),
    [listings],
  );

  const toggleActive = async (listing: ShopProduct, next: boolean) => {
    if (!shopId) return;
    setBusyId(listing.id);

    // Optimistic — the toggle should feel instant, and a failure puts it back.
    setListings(prev =>
      prev.map(row => (row.id === listing.id ? {...row, is_active: next} : row)),
    );

    try {
      await updateShopProduct(shopId, listing.id, {is_active: next});
    } catch (error) {
      setListings(prev =>
        prev.map(row =>
          row.id === listing.id ? {...row, is_active: !next} : row,
        ),
      );
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not update the listing.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const lowStockCount = listings.filter(isLowStock).length;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalog</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate(Route.ProductFormScreen, {})}
          style={styles.add}>
          <PlusIcon color={Colors.white} size={15} />
          <Text style={styles.addText}>Add product</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScreenLoader />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListHeaderComponent={
            <View style={styles.filters}>
              <AppInput
                value={catalogSearch}
                onChangeText={value => dispatch(setCatalogSearch(value))}
                placeholder="Search by name or SKU"
                autoCapitalize="none"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}>
                <TouchableOpacity
                  onPress={() =>
                    dispatch(setCatalogLowStock(!catalogLowStockOnly))
                  }>
                  <Pill
                    label={`Low stock${lowStockCount ? ` · ${lowStockCount}` : ''}`}
                    tone={catalogLowStockOnly ? 'warning' : 'neutral'}
                  />
                </TouchableOpacity>

                {categories.map(category => (
                  <TouchableOpacity
                    key={`c-${category.id}`}
                    onPress={() =>
                      dispatch(
                        setCatalogCategory(
                          catalogCategoryId === category.id ? null : category.id,
                        ),
                      )
                    }>
                    <Pill
                      label={category.name}
                      tone={catalogCategoryId === category.id ? 'primary' : 'neutral'}
                    />
                  </TouchableOpacity>
                ))}

                {brands.map(brand => (
                  <TouchableOpacity
                    key={`b-${brand.id}`}
                    onPress={() =>
                      dispatch(
                        setCatalogBrand(
                          catalogBrandId === brand.id ? null : brand.id,
                        ),
                      )
                    }>
                    <Pill
                      label={brand.name}
                      tone={catalogBrandId === brand.id ? 'primary' : 'neutral'}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
          renderItem={({item}) => (
            <ProductCard
              listing={item}
              busy={busyId === item.id}
              onPress={() =>
                navigation.navigate(Route.ProductFormScreen, {listing: item})
              }
              onAdjustStock={() =>
                navigation.navigate(Route.AdjustStockScreen, {listing: item})
              }
              onToggleActive={next => toggleActive(item, next)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No listings yet"
              message="Add the jars and bottles this shop sells, with their price, deposit and stock."
              actionLabel="Add your first product"
              onAction={() => navigation.navigate(Route.ProductFormScreen, {})}
            />
          }
          ListFooterComponent={
            listings.length ? (
              <View style={styles.footer}>
                <Card>
                  <Text style={styles.cardTitle}>Container & deposit settings</Text>
                  <View style={styles.depositLines}>
                    {depositLines.length ? (
                      depositLines.map(line => (
                        <KeyValueRow
                          key={line.label}
                          label={line.label}
                          value={line.value}
                        />
                      ))
                    ) : (
                      <Text style={styles.muted}>
                        No listing on this shop takes a refundable deposit.
                      </Text>
                    )}
                    <KeyValueRow
                      label="Return modes in use"
                      value={
                        Array.from(
                          new Set(listings.map(l => returnModeLabel(l.return_mode))),
                        ).join(', ') || '—'
                      }
                    />
                  </View>
                  <Text style={styles.muted}>
                    Deposit changes apply to future orders only — order history
                    keeps its own snapshot.
                  </Text>
                </Card>

                <TouchableOpacity
                  onPress={() => navigation.navigate(Route.ContainerLedgerScreen)}>
                  <Card>
                    <Text style={styles.link}>
                      Container ledger — who's holding your jars
                    </Text>
                  </Card>
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Colors.text,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  addText: {color: Colors.white, fontSize: 13, fontWeight: '800'},

  body: {padding: 20, gap: 12, paddingBottom: 30},
  filters: {gap: 10, marginBottom: 2},
  chips: {gap: 7, paddingRight: 20},

  footer: {gap: 12, marginTop: 2},
  cardTitle: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  depositLines: {gap: 9, marginTop: 11, marginBottom: 11},
  muted: {fontSize: 12, color: Colors.textMuted, lineHeight: 18},
  link: {fontSize: 14, fontWeight: '800', color: Colors.primary},
});

export default CatalogScreen;
