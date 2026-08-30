import React from 'react';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

type IconProps = {size?: number; color: string};

export const HomeIcon: React.FC<IconProps> = ({size = 22, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M3.5 10.5 12 3.5l8.5 7v9a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinejoin="round"
    />
  </Svg>
);

export const OrdersIcon: React.FC<IconProps> = ({size = 22, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect
      x={4}
      y={3}
      width={16}
      height={18}
      rx={3}
      fill="none"
      stroke={color}
      strokeWidth={1.9}
    />
    <Path
      d="M8 8.5h8M8 12.5h8M8 16.5h5"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);

/** A water jar — the catalog tab. */
export const CatalogIcon: React.FC<IconProps> = ({size = 22, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M9 2.5h6v2.2l2.6 2.6c.6.6.9 1.4.9 2.2v9.4a2.6 2.6 0 0 1-2.6 2.6H8.1A2.6 2.6 0 0 1 5.5 18.9V9.5c0-.8.3-1.6.9-2.2L9 4.7z"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M6 13c1.6-1.6 3.2.8 4.8-.8s3.2.8 4.8-.8"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

export const MoneyIcon: React.FC<IconProps> = ({size = 22, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect
      x={2.5}
      y={5.5}
      width={19}
      height={13}
      rx={3}
      fill="none"
      stroke={color}
      strokeWidth={1.9}
    />
    <Circle cx={12} cy={12} r={2.6} fill="none" stroke={color} strokeWidth={1.9} />
    <Path d="M6 9v6M18 9v6" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
  </Svg>
);

export const ShopIcon: React.FC<IconProps> = ({size = 22, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M4 9.5 5.4 4.5h13.2L20 9.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-4 0z"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M5.5 11.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7.5"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronRight: React.FC<IconProps> = ({size = 16, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m9 5 7 7-7 7"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronLeft: React.FC<IconProps> = ({size = 20, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m15 5-7 7 7 7"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({size = 14, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="m5 12.5 4.5 4.5L19 7"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({size = 18, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 5v14M5 12h14"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  </Svg>
);

export const MinusIcon: React.FC<IconProps> = ({size = 18, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

export const BellIcon: React.FC<IconProps> = ({size = 20, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinejoin="round"
    />
    <Path
      d="M10 18a2 2 0 0 0 4 0"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);

export const PinIcon: React.FC<IconProps> = ({size = 16, color}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={10} r={2.6} fill="none" stroke={color} strokeWidth={1.9} />
  </Svg>
);
