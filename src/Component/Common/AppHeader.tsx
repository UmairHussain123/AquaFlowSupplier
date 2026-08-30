import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {ChevronLeft} from '../Icons/TabIcons';

type Props = {
  title: string;
  subtitle?: string;
  /** Rendered on the right — a timer pill, an action link, a badge. */
  right?: React.ReactNode;
  showBack?: boolean;
  mono?: boolean;
};

/** The white "‹ Title" bar the stack screens in the design share. */
const AppHeader: React.FC<Props> = ({
  title,
  subtitle,
  right,
  showBack = true,
  mono = false,
}) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.wrap}>
      {showBack && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          style={styles.back}>
          <ChevronLeft color={Colors.text} size={20} />
        </TouchableOpacity>
      )}

      <View style={styles.titles}>
        <Text
          numberOfLines={1}
          style={[styles.title, mono && {fontFamily: Fonts.mono, fontSize: 14}]}>
          {title}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
    zIndex: 2,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {flex: 1},
  title: {fontSize: 16.5, fontWeight: '800', color: Colors.text},
  subtitle: {fontSize: 12, color: Colors.textSecondary, marginTop: 3},
});

export default AppHeader;
