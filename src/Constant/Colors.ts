/**
 * Aqua Flow Supplier palette — taken straight from the v2 design
 * (Aqua Flow Supplier App v2.dc.html) so every screen shares one source of
 * truth. The brand and status hues are unchanged from v1; v2 only lightens the
 * canvas, adds the teal→blue gradient ramp and the tinted surfaces that go
 * with it.
 */
export const Colors = {
  // Brand
  primary: '#0F62B8',
  primaryDark: '#0B1B2B',
  primaryTint: '#E8F1FB',
  primaryTint2: '#F0F6FD',
  primarySoft: '#F3F8FE',
  accentTeal: '#12B5CE',

  // v2 gradients — primary actions, hero panels and the success footer
  gradFrom: '#12B5CE',
  gradTo: '#0F62B8',
  heroFrom: '#0E3E68',
  heroTo: '#0B1B2B',
  heroGlow: 'rgba(18,181,206,0.34)',
  successFrom: '#1FA97A',
  successTo: '#16855A',

  // Surfaces
  white: '#FFFFFF',
  surface: '#EEF6FC',
  surfaceSoft: '#F1F6FB',
  fieldBg: '#F4F9FD',
  noteSoft: '#F1F7FC',
  surface2: '#EDF2F7',
  surface3: '#F1F5F9',
  mapSurface: '#EAF0F6',

  // Text
  text: '#0B1B2B',
  textSecondary: '#64778C',
  textMuted: '#8B9BAD',
  textFaint: '#A3B1BF',
  textOnDark: '#9FB6CC',
  textOnDark2: '#8FA6C2',
  slate: '#42576C',
  slate2: '#3C567A',

  // Lines
  border: '#E1E8F0',
  borderSoft: '#EDF1F6',
  borderSoft2: '#F2F5F9',
  borderDashed: '#C9D5E1',
  borderIdle: '#DDE5ED',
  borderCircle: '#B9C4D1',

  // Status — success
  success: '#16855A',
  successBg: '#E9F7F0',
  successText: '#14603D',
  successText2: '#2E5A45',

  // Status — the "Open" pill on the dark v2 header
  openTint: 'rgba(53,210,230,0.16)',
  openDot: '#35D2E6',
  openText: '#7FE3F2',

  // Status — warning
  warning: '#C98A18',
  warningBg: '#FFF3DC',
  warningText: '#8A5A0C',
  warningText2: '#6B4A11',
  warningRing: '#FDF2DE',

  // Status — danger
  danger: '#C23A3A',
  dangerBg: '#FDECEC',
  dangerBorder: '#F0D2D2',

  // Misc
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(11,27,43,0.45)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha18: 'rgba(255,255,255,0.18)',
  whiteAlpha45: 'rgba(255,255,255,0.45)',
  otpIdle: '#C6D1DE',
  chipIdle: '#DCE5EE',
};

export default Colors;
