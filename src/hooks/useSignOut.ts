import {useCallback, useRef, useState} from 'react';
import {Alert} from 'react-native';
import Toast from 'react-native-toast-message';
import {logoutRequest} from '../Server/User';
import {apiErrorMessage} from '../helper/helperFunction';

/**
 * "Log out?" confirm plus the logout call, shared by the Shop and Profile
 * screens. Taps while the confirm is open or the call is running are ignored,
 * and `signingOut` stays true until the app has moved to Login.
 */
export function useSignOut() {
  const [signingOut, setSigningOut] = useState(false);
  // A ref, not state: two taps in the same frame both read stale state.
  const busy = useRef(false);

  const signOut = useCallback(() => {
    if (busy.current) return;
    busy.current = true;

    const release = () => {
      busy.current = false;
    };

    Alert.alert(
      'Log out?',
      'You will need your email and password to sign back in.',
      [
        {text: 'Stay signed in', style: 'cancel', onPress: release},
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await logoutRequest();
              // Success resets to Login and unmounts this screen — nothing to undo.
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: apiErrorMessage(error, 'Signed out locally.'),
              });
              setSigningOut(false);
              release();
            }
          },
        },
      ],
      // Android: back button / tapping outside closes the dialog.
      {cancelable: true, onDismiss: release},
    );
  }, []);

  return {signOut, signingOut};
}
