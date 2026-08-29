import {StyleSheet} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import {Colors} from './Colors';
import {Fonts} from './Fonts';

/**
 * Shared primitives lifted out of the design: the card, the pill, the section
 * label and the sticky footer repeat on nearly every screen.
 */
export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  screenWhite: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex1: {flex: 1},

  // The white rounded card with the soft shadow used everywhere in the design.
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 15,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 5},
    elevation: 2,
  },
  cardHighlighted: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  cardFlush: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 5},
    elevation: 2,
  },

  // "REGISTERED MOBILE NUMBER" style label above a field.
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    fontFamily: Fonts.regular,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.text,
  },
  mono: {
    fontFamily: Fonts.mono,
  },
  muted: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // Sticky action bar at the bottom of the form screens.
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    flexDirection: 'row',
    gap: 11,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderSoft,
  },

  w90: {
    width: wp('90%'),
    alignSelf: 'center',
  },
  pv: {paddingVertical: hp(1)},
  ph: {paddingHorizontal: hp(1)},
});

export default globalStyles;
