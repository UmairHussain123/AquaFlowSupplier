import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {formatMoney, toNumber} from '../../helper/helperFunction';
import {
  isLowStock,
  isOutOfStock,
  productLabel,
  productSize,
  returnModeLabel,
  type ShopProduct,
} from '../../Server/Product/ProductsApi';
import AppSwitch from '../Common/AppSwitch';
import Card from '../Common/Card';

/** One catalog listing (SB5): the size badge, price/deposit line, the listed
 *  toggle, and a stock strip that turns amber when it hits the threshold. */
const ProductCard: React.FC<{
  listing: ShopProduct;
  onPress: () => void;
  onAdjustStock: () => void;
  onToggleActive: (next: boolean) => void;
  busy?: boolean;
}> = ({listing, onPress, onAdjustStock, onToggleActive, busy}) => {
  const out = isOutOfStock(listing);
  const low = isLowStock(listing);
  const deposit = toNumber(listing.deposit_amount);

  return (
    <Card style={out ? styles.dimmed : undefined}>
      <View style={styles.head}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={styles.headMain}>
          <View style={[styles.badge, out && styles.badgeDim]}>
            <Text style={[styles.badgeText, out && styles.badgeTextDim]}>
              {productSize(listing.product)}
            </Text>
          </View>

          <View style={styles.titles}>
            <Text style={styles.title} numberOfLines={1}>
              {productLabel(listing)}
            </Text>
            {out ? (
              <Text style={styles.outText}>
                Out of stock · hidden from customers
              </Text>
            ) : (
              <Text style={styles.subtitle} numberOfLines={1}>
                {formatMoney(listing.price)}
                {deposit > 0 ? ` · deposit ${formatMoney(deposit)}` : ''} ·{' '}
                {returnModeLabel(listing.return_mode)}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <AppSwitch
          value={listing.is_active}
          onValueChange={onToggleActive}
          disabled={busy}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onAdjustStock}
        style={[styles.stock, low && styles.stockLow]}>
        <Text style={[styles.stockLabel, low && styles.stockLabelLow]}>
          Stock {listing.stock_quantity}
          {low && !out ? ' · low' : ''}
        </Text>
        <Text style={styles.adjust}>Adjust</Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  dimmed: {opacity: 0.65},
  head: {flexDirection: 'row', alignItems: 'center', gap: 12},
  headMain: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12},
  badge: {
    width: 46,
    height: 54,
    borderRadius: 11,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDim: {backgroundColor: Colors.surface2},
  badgeText: {fontFamily: Fonts.mono, fontSize: 11, color: Colors.primary},
  badgeTextDim: {color: Colors.textMuted},
  titles: {flex: 1},
  title: {fontSize: 15, fontWeight: '800', color: Colors.text},
  subtitle: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 2},
  outText: {
    fontSize: 12.5,
    color: Colors.danger,
    fontWeight: '700',
    marginTop: 2,
  },
  stock: {
    marginTop: 12,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockLow: {backgroundColor: Colors.warningBg},
  stockLabel: {fontSize: 13, fontWeight: '800', color: Colors.slate},
  stockLabelLow: {color: Colors.warningText},
  adjust: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
});

export default ProductCard;
