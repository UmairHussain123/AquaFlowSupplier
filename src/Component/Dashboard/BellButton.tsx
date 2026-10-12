import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {unreadBadgeLabel} from '../../hooks/useUnreadNotifications';
import {BellIcon} from '../Icons/TabIcons';

/** The bell on the dark dashboard header, with the unread count on top of it. */
const BellButton: React.FC<{count: number; onPress: () => void}> = ({
  count,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={
      count > 0 ? `Notifications, ${count} unread` : 'Notifications'
    }
    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
    style={styles.bell}>
    <BellIcon color={Colors.white} size={20} />
    {count > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{unreadBadgeLabel(count)}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  bell: {padding: 4},
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.heroFrom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {fontSize: 10, fontWeight: '800', color: Colors.white},
});

export default BellButton;
