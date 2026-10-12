import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {useDebounce} from '../../hooks/useDebounce';
import {apiErrorMessage} from '../../helper/helperFunction';
import {
  catalogProductLabel,
  listCatalogProducts,
  type CatalogPickerProduct,
} from '../../Server/Product/ProductsApi';
import AppInput from '../Common/AppInput';

const PER_PAGE = 10;

const productMeta = (product: CatalogPickerProduct): string =>
  [product.brand?.name, product.category?.name].filter(Boolean).join(' · ');

/**
 * Search the platform catalog and pick the product a new listing will sell.
 * Passing the shop id makes every row carry `is_listed`, so products the shop
 * already sells are greyed out instead of failing on save.
 */
const CatalogProductPicker: React.FC<{
  shopId: number;
  selected: CatalogPickerProduct | null;
  onSelect: (product: CatalogPickerProduct | null) => void;
  /** Formik's field error — only a string renders. */
  error?: string | false | null | any;
}> = ({shopId, selected, onSelect, error}) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CatalogPickerProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const query = useDebounce(search.trim(), 300);

  useEffect(() => {
    if (selected) return;
    let active = true;
    setLoading(true);
    setLoadError(null);

    listCatalogProducts({
      shop_id: shopId,
      search: query || undefined,
      per_page: PER_PAGE,
    })
      .then(page => {
        if (!active) return;
        const rows = page.data ?? [];
        setResults(rows);
        setTotal(page.total ?? rows.length);
      })
      .catch(err => {
        if (active) {
          setLoadError(
            apiErrorMessage(err, "Couldn't load the catalog. Try again."),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, selected, shopId]);

  if (selected) {
    const meta = productMeta(selected);
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Catalog product</Text>
        <View style={styles.selected}>
          <View style={styles.flex}>
            <Text style={styles.selectedTitle}>
              {catalogProductLabel(selected)}
            </Text>
            <Text style={styles.meta}>
              {meta || '—'}
              {selected.container_type_id ? ' · returnable container' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onSelect(null)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.change}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <AppInput
        label="Catalog product"
        value={search}
        onChangeText={setSearch}
        placeholder="Search the catalog by name"
        autoCapitalize="none"
        error={error}
      />

      <View style={[styles.list, !!error && styles.listError]}>
        {loadError ? (
          <Text style={styles.loadErrorText}>{loadError}</Text>
        ) : !results.length ? (
          <View style={styles.status}>
            {loading && (
              <ActivityIndicator color={Colors.primary} size="small" />
            )}
            <Text style={styles.statusText}>
              {loading ? 'Searching…' : 'No catalog products match.'}
            </Text>
          </View>
        ) : (
          results.map((product, index) => {
            const meta = productMeta(product);
            return (
              <TouchableOpacity
                key={product.id}
                disabled={product.is_listed}
                activeOpacity={0.7}
                onPress={() => onSelect(product)}
                style={[
                  styles.row,
                  index < results.length - 1 && styles.rowDivider,
                  product.is_listed && styles.rowListed,
                ]}>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {catalogProductLabel(product)}
                  </Text>
                  {!!meta && (
                    <Text style={styles.meta} numberOfLines={1}>
                      {meta}
                    </Text>
                  )}
                </View>
                {product.is_listed ? (
                  <Text style={styles.listedTag}>Already listed</Text>
                ) : (
                  <Text style={styles.pick}>Pick</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {!loadError && results.length > 0 && total > results.length && (
        <Text style={styles.hint}>
          Showing {results.length} of {total} — search to narrow it down.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  wrap: {gap: 8},
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 15,
    backgroundColor: Colors.primaryTint2,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  selectedTitle: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  meta: {fontSize: 12, color: Colors.textSecondary, marginTop: 3},
  change: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},

  list: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  listError: {borderColor: Colors.danger},
  loadErrorText: {
    fontSize: 12.5,
    color: Colors.danger,
    padding: 14,
    fontWeight: '600',
  },
  status: {flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14},
  statusText: {fontSize: 12.5, color: Colors.textMuted},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: {borderBottomWidth: 1, borderBottomColor: Colors.borderSoft2},
  rowListed: {opacity: 0.5},
  rowTitle: {fontSize: 13.5, fontWeight: '700', color: Colors.text},
  listedTag: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  pick: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
  hint: {fontSize: 11.5, color: Colors.textMuted},
});

export default CatalogProductPicker;
