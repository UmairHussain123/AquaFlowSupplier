import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * The v2 water artwork. Everything is drawn rather than photographed so the
 * app ships no image assets, scales to any density and can be recoloured.
 */

/** The small jar that sits in catalog thumbnails and order item rows. */
export const JarGlyph: React.FC<{size?: number; dim?: boolean}> = ({
  size = 26,
  dim = false,
}) => (
  <Svg width={size} height={size * 1.29} viewBox="0 0 34 44">
    <Path
      d="M12 2h10v4l3.4 3.6A8 8 0 0 1 27.6 15V36a6 6 0 0 1-6 6H12.4a6 6 0 0 1-6-6V15a8 8 0 0 1 2.2-5.4L12 6V2Z"
      fill={dim ? '#DDE5ED' : '#A9DBF3'}
      stroke={dim ? '#C0CCD9' : '#6DB9E0'}
      strokeWidth={1.6}
    />
    <Rect
      x={10}
      y={20}
      width={14}
      height={7}
      rx={2.5}
      fill="#FFFFFF"
      fillOpacity={dim ? 0.5 : 0.85}
    />
  </Svg>
);

/** Three sealed bottles — the pack listings and the empty catalog state. */
export const BottlePackGlyph: React.FC<{size?: number}> = ({size = 30}) => (
  <Svg width={size} height={size} viewBox="0 0 44 44">
    <Rect x={6} y={12} width={9} height={26} rx={3} fill="#BFE3F7" stroke="#7FC4E8" strokeWidth={1.4} />
    <Rect x={17.5} y={8} width={9} height={30} rx={3} fill="#A9DBF3" stroke="#6DB9E0" strokeWidth={1.4} />
    <Rect x={29} y={12} width={9} height={26} rx={3} fill="#BFE3F7" stroke="#7FC4E8" strokeWidth={1.4} />
  </Svg>
);

/** The big 19L jar behind the sign-in header. */
export const WaterJarArt: React.FC<{width?: number}> = ({width = 188}) => (
  <Svg width={width} height={width * 1.3} viewBox="0 0 200 260">
    <Defs>
      <LinearGradient id="jarBody" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#EAF9FF" stopOpacity={0.95} />
        <Stop offset="0.45" stopColor="#9AD8F4" stopOpacity={0.85} />
        <Stop offset="1" stopColor="#2E86C4" stopOpacity={0.9} />
      </LinearGradient>
      <LinearGradient id="jarWater" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#7FD4F2" stopOpacity={0.75} />
        <Stop offset="1" stopColor="#1B6FB5" stopOpacity={0.85} />
      </LinearGradient>
    </Defs>
    <Rect x={84} y={6} width={34} height={16} rx={5} fill="#12B5CE" />
    <Rect x={88} y={22} width={26} height={20} rx={4} fill="#BFE7F7" fillOpacity={0.9} />
    <Path
      d="M60 60c0-10 8-18 18-18h46c10 0 18 8 18 18l8 22c3 9 5 18 5 27v104c0 15-12 27-27 27H74c-15 0-27-12-27-27V109c0-9 2-18 5-27l8-22Z"
      fill="url(#jarBody)"
    />
    <Path
      d="M50 132h100v110c0 15-12 27-27 27H77c-15 0-27-12-27-27V132Z"
      fill="url(#jarWater)"
    />
    <Rect x={66} y={152} width={68} height={42} rx={10} fill="#FFFFFF" fillOpacity={0.22} />
    <Path
      d="M74 66c-6 12-9 25-9 39v128"
      stroke="#FFFFFF"
      strokeOpacity={0.5}
      strokeWidth={5}
      strokeLinecap="round"
      fill="none"
    />
    <Circle cx={112} cy={176} r={7} fill="#FFFFFF" fillOpacity={0.4} />
    <Circle cx={96} cy={204} r={4.5} fill="#FFFFFF" fillOpacity={0.34} />
    <Circle cx={120} cy={216} r={3} fill="#FFFFFF" fillOpacity={0.3} />
  </Svg>
);

/** The concentric ripple that sits behind the dark headers and money hero. */
export const RippleArt: React.FC<{size?: number; color?: string}> = ({
  size = 150,
  color = '#FFFFFF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={60} r={46} fill="none" stroke={color} strokeWidth={2} />
    <Circle cx={60} cy={60} r={30} fill="none" stroke={color} strokeWidth={2} />
    <Circle cx={60} cy={60} r={14} fill={color} />
  </Svg>
);
