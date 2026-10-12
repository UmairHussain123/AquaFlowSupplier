import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../../Constant/Colors';
import {pluralize} from '../../helper/helperFunction';
import type {ShopProduct} from '../../Server/Product/ProductsApi';

/** How many low-stock listings the card names before it just says "+N more". */
export const RESTOCK_PREVIEW = 4;

/**
 * "Restock soon" — the dark card listing what is at or under its low-stock
 * threshold. `total` is null when the listings couldn't be read.
 */
const RestockCard: React.FC<{
  items: ShopProduct[];
  total: number | null;
  onManage: () => void;
}> = ({items, total, onManage}) => {
  const shown = items.slice(0, RESTOCK_PREVIEW);
  const more = total !== null ? Math.max(0, total - shown.length) : 0;

  return (
    <LinearGradient
      colors={[Colors.heroFrom, Colors.heroTo]}
      start={{x: 0.1, y: 0}}
      end={{x: 0.9, y: 1}}
      style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.kicker}>Restock soon</Text>
        {!!total && (
          <Text style={styles.count}>{pluralize(total, 'listing')}</Text>
        )}
      </View>

      {total === null ? (
        <Text style={styles.muted}>Couldn't check your stock right now.</Text>
      ) : shown.length === 0 ? (
        <Text style={styles.muted}>
          Every listing is above its low-stock threshold.
        </Text>
      ) : (
        <View style={styles.rows}>
          {shown.map(item => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>
                {item.product?.name ?? item.sku ?? `Listing #${item.id}`}
              </Text>
              <Text style={styles.left}>{item.stock_quantity ?? 0} left</Text>
            </View>
          ))}
          {more > 0 && <Text style={styles.muted}>+{more} more</Text>}
        </View>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={onManage}
        style={styles.action}>
        <Text style={styles.actionText}>Manage stock</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {borderRadius: 20, padding: 16, overflow: 'hidden'},
  head: {flexDirection: 'row', alignItems: 'center', gap: 8},
  kicker: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textOnDark2,
  },
  count: {fontSize: 12, fontWeight: '800', color: Colors.openText},
  rows: {gap: 7, marginTop: 10},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10},
  name: {flex: 1, fontSize: 13.5, color: Colors.white},
  left: {fontSize: 13.5, fontWeight: '800', color: Colors.white},
  muted: {fontSize: 12.5, color: Colors.textOnDark, marginTop: 8},
  action: {
    alignSelf: 'flex-start',
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionText: {fontSize: 12.5, fontWeight: '800', color: Colors.white},
});

export default RestockCard;
