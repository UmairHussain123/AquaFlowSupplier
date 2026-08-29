import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import StatusBadge from '../../../Component/Common/StatusBadge';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {formatDateTime} from '../../../helper/dateHelper';
import {apiErrorMessage, formatMoney} from '../../../helper/helperFunction';
import {getDispute, isDisputeLive, type Dispute} from '../../../Server/Disputes/DisputesApi';

/** One dispute and whatever ops have decided so far. */
const DisputeDetailScreen: React.FC<{route: any}> = ({route}) => {
  const shopId = useActiveShopId();
  const disputeId = route?.params?.disputeId;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId || !disputeId) return;
    try {
      setDispute(await getDispute(shopId, disputeId));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not load the dispute.'),
      });
    } finally {
      setLoading(false);
    }
  }, [disputeId, shopId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <ScreenLoader />;
  if (!dispute) return <View style={styles.screen} />;

  const live = isDisputeLive(dispute);

  return (
    <View style={styles.screen}>
      <AppHeader
        title={dispute.reference}
        subtitle={dispute.order_number ? `Order ${dispute.order_number}` : undefined}
        mono
        right={<StatusBadge status={dispute.status} />}
      />

      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Text style={styles.label}>Your claim</Text>
          <Text style={styles.claim}>{dispute.claim}</Text>
          <Text style={styles.meta}>
            Raised {formatDateTime(dispute.created_at)}
            {dispute.raised_by ? ` by ${dispute.raised_by.name}` : ''}
          </Text>
        </Card>

        <Card>
          <Text style={styles.label}>Money on hold</Text>
          <View style={styles.lines}>
            <KeyValueRow
              label="Deposit in question"
              value={formatMoney(dispute.deposit)}
              tone="warn"
            />
            <KeyValueRow
              label="Adjustment applied"
              value={
                dispute.financial_adjustment_amount
                  ? formatMoney(dispute.financial_adjustment_amount)
                  : 'Not decided yet'
              }
              tone={
                dispute.financial_adjustment_amount &&
                Number(dispute.financial_adjustment_amount) < 0
                  ? 'debit'
                  : 'credit'
              }
            />
          </View>
        </Card>

        {!!dispute.resolution_notes && (
          <Card>
            <Text style={styles.label}>Ops decision</Text>
            <Text style={styles.claim}>{dispute.resolution_notes}</Text>
          </Card>
        )}

        <InfoNote tone={live ? 'warning' : 'neutral'}>
          {live
            ? 'Ops are reviewing this. The deposit stays held until they decide, and any adjustment appears on that week’s settlement.'
            : 'This case is closed. Any adjustment above has already been applied to a settlement.'}
        </InfoNote>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20, gap: 12, paddingBottom: 30},
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  claim: {fontSize: 13.5, color: Colors.text, lineHeight: 21, marginTop: 9},
  meta: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 10,
  },
  lines: {gap: 9, marginTop: 11},
});

export default DisputeDetailScreen;
