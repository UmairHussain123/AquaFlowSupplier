import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
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
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import ChipGroup from '../../../Component/Common/ChipGroup';
import EmptyState from '../../../Component/Common/EmptyState';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import Pill from '../../../Component/Common/Pill';
import ProductCard from '../../../Component/Cards/ProductCard';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import SortPicker, {
  type SortOption,
} from '../../../Component/Catalog/SortPicker';
import {usePagedList} from '../../../hooks/usePagedList';
import {PlusIcon} from '../../../Component/Icons/TabIcons';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useDebounce} from '../../../hooks/useDebounce';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {
  resetCatalogFilters,
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
  type ProductBrand,
  type ProductCategory,
  type ShopProduct,
  type ShopProductListParams,
} from '../../../Server/Product/ProductsApi';
import {
  apiErrorMessage,
  formatMoney,
  toNumber,
} from '../../../helper/helperFunction';

const PER_PAGE = 20;

type SortBy = NonNullable<ShopProductListParams['sort_by']>;
type ListedFilter = 'true' | 'false';

/** The portal's sort menu: each field both ways. */
const SORT_OPTIONS: SortOption[] = [
  {value: 'id:desc', label: 'Recently added — newest first', short: 'Newest'},
  {value: 'id:asc', label: 'Recently added — oldest first', short: 'Oldest'},
  {value: 'price:desc', label: 'Price — high to low', short: 'Price ↓'},
  {value: 'price:asc', label: 'Price — low to high', short: 'Price ↑'},
  {
    value: 'stock_quantity:desc',
    label: 'Stock — high to low',
    short: 'Stock ↓',
  },
  {value: 'stock_quantity:asc', label: 'Stock — low to high', short: 'Stock ↑'},
  {
    value: 'created_at:desc',
    label: 'Date created — newest first',
    short: 'Created ↓',
  },
  {
    value: 'created_at:asc',
    label: 'Date created — oldest first',
    short: 'Created ↑',
  },
];

const LISTED_OPTIONS: {value: ListedFilter; label: string}[] = [
  {value: 'true', label: 'Listed'},
  {value: 'false', label: 'Hidden'},
];

/** Adds what's new to a chip list without ever dropping an option. */
const mergeOptions = <T extends {id: number; name: string}>(
  prev: T[],
  next: T[],
): T[] => {
  const byId = new Map(prev.map(item => [item.id, item]));
  let changed = false;
  next.forEach(item => {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
      changed = true;
    }
  });
  if (!changed) return prev;
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * SB5 — the shop's listings, their stock and the deposits attached to them.
 * Owners and managers only.
 *
 * The supplier API has no category/brand browse endpoint, so those chips are
 * built from the listings themselves — accumulated across every page loaded
 * for this shop, so narrowing the list never makes an option disappear.
 */
const CatalogScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();

  const {
    catalogSearch,
    catalogCategoryId,
    catalogBrandId,
    catalogLowStockOnly,
  } = useSelector((state: any) => state.filter);

  const [listed, setListed] = useState<ListedFilter | null>(null);
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);

  const search = useDebounce((catalogSearch ?? '').trim(), 400);

  const params = useMemo<ShopProductListParams>(() => {
    const [sortBy, sortOrder] = sort.split(':') as [SortBy, 'asc' | 'desc'];
    return {
      search: search || undefined,
      category_id: catalogCategoryId ?? undefined,
      brand_id: catalogBrandId ?? undefined,
      is_active: listed ?? undefined,
      low_stock: catalogLowStockOnly ? 'true' : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }, [
    catalogBrandId,
    catalogCategoryId,
    catalogLowStockOnly,
    listed,
    search,
    sort,
  ]);

  const fetchPage = useMemo(
    () =>
      shopId && isShopManager
        ? (page: number) =>
            listShopProducts(shopId, {...params, per_page: PER_PAGE, page})
        : null,
    [isShopManager, params, shopId],
  );

  const list = usePagedList<ShopProduct>(
    fetchPage,
    JSON.stringify({shopId, ...params}),
    'Could not load your catalog.',
  );
  const {reload, rows: listings, setRows: setListings} = list;

  // Runs on focus (an edit elsewhere may have changed a listing) and again
  // whenever a filter changes, since that gives `reload` a new identity.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // A different shop has different categories and brands.
  useEffect(() => {
    setCategories([]);
    setBrands([]);
  }, [shopId]);

  useEffect(() => {
    // Rows from the previous shop can still be on screen right after a switch.
    const own = listings.filter(
      listing => String(listing.shop_id) === String(shopId),
    );
    setCategories(prev => mergeOptions(prev, collectCategories(own)));
    setBrands(prev => mergeOptions(prev, collectBrands(own)));
  }, [listings, shopId]);

  const depositLines = useMemo(
    () =>
      listings
        .filter(listing => toNumber(listing.deposit_amount) > 0)
        .map(listing => ({
          key: listing.id,
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
      prev.map(row =>
        row.id === listing.id ? {...row, is_active: next} : row,
      ),
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

  const filtersActive = Boolean(
    catalogSearch ||
      catalogCategoryId ||
      catalogBrandId ||
      listed ||
      catalogLowStockOnly,
  );

  const clearFilters = () => {
    dispatch(resetCatalogFilters());
    setListed(null);
  };

  const lowStockCount = listings.filter(isLowStock).length;
  const addProduct = () => navigation.navigate(Route.ProductFormScreen, {});

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Catalog</Text>
      {isShopManager && !!shopId && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={addProduct}
          style={styles.add}>
          <LinearGradient
            colors={[Colors.gradFrom, Colors.gradTo]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <PlusIcon color={Colors.white} size={15} />
          <Text style={styles.addText}>Add product</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!isShopManager) {
    return (
      <View style={styles.screen}>
        {header}
        <EmptyState
          title="Catalog is for owners and managers"
          message="Products, prices and stock are managed by the shop owner or a manager. Your deliveries are on the Orders tab."
        />
      </View>
    );
  }

  if (!shopId) {
    return (
      <View style={styles.screen}>
        {header}
        <EmptyState
          title="No shop selected"
          message="Pick a shop on the Shop tab to see its catalog."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}

      {list.loading ? (
        <ScreenLoader />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={() => reload('refresh')}
            />
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
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chips}>
                <TouchableOpacity
                  onPress={() =>
                    dispatch(setCatalogLowStock(!catalogLowStockOnly))
                  }>
                  <Pill
                    label={`Low stock${
                      lowStockCount ? ` · ${lowStockCount}` : ''
                    }`}
                    tone={catalogLowStockOnly ? 'warning' : 'neutral'}
                  />
                </TouchableOpacity>

                {LISTED_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    accessibilityState={{selected: listed === option.value}}
                    onPress={() =>
                      setListed(listed === option.value ? null : option.value)
                    }>
                    <Pill
                      label={option.label}
                      tone={listed === option.value ? 'primary' : 'neutral'}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {categories.length > 0 && (
                <ChipGroup
                  options={categories.map(category => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  value={catalogCategoryId ?? null}
                  onChange={value => dispatch(setCatalogCategory(value))}
                />
              )}

              {brands.length > 0 && (
                <ChipGroup
                  options={brands.map(brand => ({
                    value: brand.id,
                    label: brand.name,
                  }))}
                  value={catalogBrandId ?? null}
                  onChange={value => dispatch(setCatalogBrand(value))}
                />
              )}

              <View style={styles.countRow}>
                <Text style={styles.count}>
                  {list.total} listing{list.total === 1 ? '' : 's'}
                </Text>
                {list.fetching && (
                  <ActivityIndicator color={Colors.primary} size="small" />
                )}
                <View style={styles.flex} />
                {filtersActive && (
                  <TouchableOpacity
                    onPress={clearFilters}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Text style={styles.clear}>Clear filters</Text>
                  </TouchableOpacity>
                )}
                <SortPicker
                  options={SORT_OPTIONS}
                  value={sort}
                  onChange={setSort}
                />
              </View>
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
            list.error ? (
              <EmptyState
                title="Couldn't load your catalog"
                message={list.error}
                actionLabel="Try again"
                onAction={() => reload('refresh')}
              />
            ) : filtersActive ? (
              <EmptyState
                title="No listings match these filters"
                message="Try a different search, or clear the filters to see everything."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <EmptyState
                title="No listings yet"
                message="Add the jars and bottles this shop sells, with their price, deposit and stock."
                actionLabel="Add your first product"
                onAction={addProduct}
              />
            )
          }
          ListFooterComponent={
            listings.length ? (
              <View style={styles.footer}>
                <LoadMoreFooter
                  shown={listings.length}
                  total={list.total}
                  hasMore={list.hasMore}
                  loading={list.loadingMore}
                  onLoadMore={list.loadMore}
                  noun="listings"
                />

                <Card>
                  <Text style={styles.cardTitle}>
                    Container & deposit settings
                  </Text>
                  <View style={styles.depositLines}>
                    {depositLines.length ? (
                      depositLines.map(line => (
                        <KeyValueRow
                          key={line.key}
                          label={line.label}
                          value={line.value}
                        />
                      ))
                    ) : (
                      <Text style={styles.muted}>
                        No listing shown here takes a refundable deposit.
                      </Text>
                    )}
                    <KeyValueRow
                      label="Return modes in use"
                      value={
                        Array.from(
                          new Set(
                            listings.map(l => returnModeLabel(l.return_mode)),
                          ),
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
                  onPress={() =>
                    navigation.navigate(Route.ContainerLedgerScreen)
                  }>
                  <Card>
                    <Text style={styles.link}>
                      Jar deposits — who's holding your jars
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
  flex: {flex: 1},
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
    zIndex: 2,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Colors.text,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 15,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  addText: {color: Colors.white, fontSize: 13.5, fontWeight: '800'},

  body: {padding: 18, gap: 12, paddingBottom: 30},
  filters: {gap: 10, marginBottom: 2},
  chips: {gap: 7, paddingRight: 20},
  countRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  count: {fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary},
  clear: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},

  footer: {gap: 12, marginTop: 2},
  cardTitle: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  depositLines: {gap: 9, marginTop: 11, marginBottom: 11},
  muted: {fontSize: 12, color: Colors.textMuted, lineHeight: 18},
  link: {fontSize: 14, fontWeight: '800', color: Colors.primary},
});

export default CatalogScreen;
