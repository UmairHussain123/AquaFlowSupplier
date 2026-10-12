import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import AppButton from './AppButton';

/**
 * The foot of a paged list: "Showing 20 of 134" plus a Load more button while
 * there is another page to fetch.
 */
const LoadMoreFooter: React.FC<{
  shown: number;
  /** Omit for cursor-paged lists that don't report a total. */
  total?: number;
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  noun?: string;
}> = ({shown, total, hasMore, loading = false, onLoadMore, noun = 'items'}) => {
  if (!shown) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.count}>
        {total !== undefined
          ? `Showing ${shown} of ${total} ${noun}`
          : `Showing ${shown} ${noun}`}
      </Text>
      {hasMore && (
        <AppButton
          title="Load more"
          variant="secondary"
          small
          block={false}
          loading={loading}
          onPress={onLoadMore}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', gap: 10, paddingVertical: 8},
  count: {fontSize: 12, color: Colors.textMuted, fontWeight: '600'},
});

export default LoadMoreFooter;
