import {Platform} from 'react-native';

/**
 * The design uses Plus Jakarta Sans for UI text and IBM Plex Mono for money,
 * codes and timestamps. Neither ships with the OS, so until the TTFs are
 * dropped into assets/Fonts we fall back to the platform system faces — the
 * weights below keep the same visual rhythm the design relies on.
 */
export const Fonts = {
  regular: Platform.select({ios: 'System', android: 'sans-serif'}) as string,
  medium: Platform.select({ios: 'System', android: 'sans-serif-medium'}) as string,
  bold: Platform.select({ios: 'System', android: 'sans-serif'}) as string,
  mono: Platform.select({ios: 'Menlo', android: 'monospace'}) as string,
};

/** Font weights the design leans on — 800 for headings, 700 for labels. */
export const FontWeight = {
  regular: '400' as const,
  medium: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export default Fonts;
