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
          <ChevronLeft color={Colors.text} size={18} />
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
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
    zIndex: 2,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {flex: 1},
  title: {fontSize: 16, fontWeight: '800', color: Colors.text},
  subtitle: {fontSize: 11.5, color: Colors.textSecondary, marginTop: 1},
});

export default AppHeader;
