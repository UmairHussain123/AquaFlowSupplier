import React, {useCallback, useState} from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import AddPayoutAccountSheet from '../../../Component/Money/AddPayoutAccountSheet';
import PayoutAccountBadges from '../../../Component/Money/PayoutAccountBadges';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {formatDateTime} from '../../../helper/dateHelper';
import {
  deletePayoutAccount,
  describeAccount,
  isAccountLocked,
  listPayoutAccounts,
  type ManagedPayoutAccount,
} from '../../../Server/Settlements/SettlementsApi';

/**
 * The bank accounts and wallets settlements are paid into. Owner only.
 *
 * A new account always starts unverified and only Aqua Flow ops can verify it.
 * The API refuses (422) to remove an account that is locked for review or has
 * payouts against it — that message is shown as-is.
 */
const PayoutAccountsScreen: React.FC = () => {
  const {isOwner} = useSupplierRoles();

  const [accounts, setAccounts] = useState<ManagedPayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isOwner) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      try {
        setAccounts(await listPayoutAccounts());
        setError(null);
      } catch (err) {
        const message = apiErrorMessage(
          err,
          "Couldn't load your payout accounts.",
        );
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOwner],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = (account: ManagedPayoutAccount) => {
    Alert.alert(
      'Remove this payout account?',
      `${
        account.account_title ?? 'This account'
      } will no longer receive settlements.`,
      [
        {text: 'Keep it', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(account.id);
            try {
              await deletePayoutAccount(account.id);
              Toast.show({type: 'success', text1: 'Payout account removed'});
              setAccounts(prev => prev.filter(row => row.id !== account.id));
              load();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: apiErrorMessage(err, "Couldn't remove this account."),
              });
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  const addButton = isOwner ? (
    <TouchableOpacity
      onPress={() => setShowAdd(true)}
      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
      <Text style={styles.headerAction}>Add</Text>
    </TouchableOpacity>
  ) : undefined;

  if (!isOwner) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Payout accounts" />
        <EmptyState
          title="Only the owner can see this"
          message="Payout accounts belong to the supplier account owner. Ask them to add or change where settlements are paid."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Payout accounts"
        subtitle="Where your settlements are paid"
        right={addButton}
      />

      {loading ? (
        <ScreenLoader />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          }
          renderItem={({item}) => {
            const locked = isAccountLocked(item);
            const details =
              describeAccount(item) ??
              item.wallet_provider ??
              'No bank details';

            return (
              <Card>
                <View style={styles.head}>
                  <View style={styles.flex}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.account_title ?? 'Untitled account'}
                    </Text>
                    <Text style={styles.details}>{details}</Text>
                    {!!item.wallet_provider && !!describeAccount(item) && (
                      <Text style={styles.details}>
                        Wallet · {item.wallet_provider}
                      </Text>
                    )}
                    {!!item.iban && (
                      <Text style={styles.iban}>{item.iban}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => remove(item)}
                    disabled={removingId === item.id}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Text
                      style={[
                        styles.remove,
                        removingId === item.id && styles.removeBusy,
                      ]}>
                      {removingId === item.id ? 'Removing…' : 'Remove'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.badges}>
                  <PayoutAccountBadges
                    verified={item.is_verified}
                    locked={locked}
                  />
                </View>

                {!item.is_verified && (
                  <Text style={styles.warning}>
                    Payouts stay on hold until Aqua Flow verifies this account.
                  </Text>
                )}
                {locked && (
                  <Text style={styles.muted}>
                    Locked for review until {formatDateTime(item.locked_until)}.
                  </Text>
                )}
              </Card>
            );
          }}
          ListEmptyComponent={
            error ? (
              <EmptyState
                title="Couldn't load your payout accounts"
                message={error}
                actionLabel="Try again"
                onAction={() => load()}
              />
            ) : (
              <EmptyState
                title="No payout account yet"
                message="Add the bank account or wallet you want settlements paid into."
                actionLabel="Add payout account"
                onAction={() => setShowAdd(true)}
              />
            )
          }
          ListFooterComponent={
            <InfoNote>
              A new account starts unverified — only Aqua Flow can verify it,
              and nothing is paid into an unverified account. An account that is
              locked for review or already has payouts can't be removed.
            </InfoNote>
          }
        />
      )}

      <AddPayoutAccountSheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          setShowAdd(false);
          Toast.show({
            type: 'success',
            text1: 'Payout account added',
            text2: 'It will be reviewed before any payout.',
          });
          load();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},
  headerAction: {fontSize: 13.5, fontWeight: '800', color: Colors.primary},

  head: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  title: {fontSize: 15, fontWeight: '800', color: Colors.text},
  details: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 3},
  iban: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 3,
  },
  remove: {fontSize: 12.5, fontWeight: '800', color: Colors.danger},
  removeBusy: {color: Colors.textMuted},
  badges: {marginTop: 11},
  warning: {
    fontSize: 12,
    color: Colors.warningText,
    fontWeight: '600',
    marginTop: 9,
    lineHeight: 17,
  },
  muted: {fontSize: 12, color: Colors.textMuted, marginTop: 5},
});

export default PayoutAccountsScreen;
