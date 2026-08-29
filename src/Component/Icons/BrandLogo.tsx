import React from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Colors} from '../../Constant/Colors';

/**
 * The Aqua Flow mark from the design: a blue "A" with a wave through it, sat on
 * a white rounded tile.
 */
const BrandLogo: React.FC<{size?: number; tile?: boolean}> = ({
  size = 30,
  tile = true,
}) => {
  const glyph = (
    <Svg viewBox="0 0 110 116" width={size * 0.54} height={size * 0.64}>
      <Path
        d="M55 12L96 104M55 12L14 104"
        fill="none"
        stroke="#0b3f80"
        strokeWidth={14}
        strokeLinecap="round"
      />
      <Path
        d="M30 72C38 62 47 84 55 74C63 64 72 84 80 74"
        fill="none"
        stroke="#2f9fe0"
        strokeWidth={12}
        strokeLinecap="round"
      />
    </Svg>
  );

  if (!tile) return glyph;

  return (
    <View
      style={[
        styles.tile,
        {width: size, height: size, borderRadius: size * 0.3},
      ]}>
      {glyph}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
});

export default BrandLogo;
