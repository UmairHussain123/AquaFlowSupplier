import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Route from '../../Constant/NavigationStrings';
import {Colors} from '../../Constant/Colors';
import BrandLogo from '../../Component/Icons/BrandLogo';
import {WaterJarArt} from '../../Component/Icons/Illustrations';
import {getToken} from '../../helper/TokenStorageHelper';
import {listShops} from '../../Server/Shops/ShopsApi';
import {setShops, shopsFailed} from '../../Redux/slices/shopSlice';
import {selectIsLoggedIn} from '../../Redux/slices/userSlice';
import {setPrivateApiToken} from '../../Server/Config';

/**
 * Decides where a cold start lands. The login response carries no shop info, so
 * this is also where the app resolves its shop_id from GET /supplier/shops —
 * every shop-scoped screen depends on it being in the store already.
 */
const SplashScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      await setPrivateApiToken();
      const token = await getToken();

      if (!token || !isLoggedIn) {
        if (!cancelled) navigation.replace(Route.Login);
        return;
      }

      try {
        const shops = await listShops();
        if (cancelled) return;
        dispatch(setShops(shops));
        navigation.replace(Route.Main);
      } catch {
        if (cancelled) return;
        dispatch(shopsFailed());
        // A dead token has already been cleared by the 401 interceptor, which
        // resets to Login on its own — only a network blip lands here.
        navigation.replace(Route.Main);
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isLoggedIn, navigation]);

  return (
    <View style={styles.wrap}>
      <View style={styles.art} pointerEvents="none">
        <WaterJarArt width={230} />
      </View>

      <BrandLogo size={72} />
      <Text style={styles.name}>
        Aqua Flow <Text style={styles.sub}>Supplier</Text>
      </Text>
      <ActivityIndicator color={Colors.primary} style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  art: {position: 'absolute', right: -54, bottom: -40, opacity: 0.16},
  name: {fontSize: 22, fontWeight: '800', color: Colors.text},
  sub: {color: Colors.textSecondary, fontWeight: '700'},
  spinner: {marginTop: 12},
});

export default SplashScreen;
