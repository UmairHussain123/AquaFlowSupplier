import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import StatusBadge from '../../../Component/Common/StatusBadge';
import {CheckIcon} from '../../../Component/Icons/TabIcons';
import {useActiveShop} from '../../../hooks/useActiveShop';
import {selectUser} from '../../../Redux/slices/userSlice';
import {
  REQUIRED_DOCUMENTS,
  accountStatusMessage,
  getSupplierAccountStatus,
  listingStatus,
} from '../../../Server/Compliance/ComplianceApi';

/**
 * SC2 — Compliance centre.
 *
 * The API exposes no supplier-facing document endpoints yet (no document list,
 * no expiry dates, no upload route), so — like the web portal — this screen
 * shows only what the app actually knows: the shop's listing status and the
 * supplier account's approval status. Anything document-related goes to ops as
 * a support ticket, which is the channel that does exist.
 */
const ComplianceScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const shop = useActiveShop();
  const user = useSelector(selectUser);
  const userId = user?.id ?? null;

  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setAccountStatus(await getSupplierAccountStatus(userId, true));
      } catch {
        // The account row just stays hidden — the listing status still shows.
        setAccountStatus(null);
      } finally {
        setAccountLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const listing = listingStatus(shop);
  const accountMessage = accountStatusMessage(accountStatus);

  const raiseTicket = () =>
    navigation.navigate(Route.CreateTicketScreen, {
      category: 'general',
      subject:
        shop && !listing.listed
          ? `Listing ${shop.status} — ${shop.public_name}`
          : 'Compliance document update',
    });

  return (
    <View style={styles.screen}>
      <AppHeader title="Compliance" subtitle="What Aqua Flow keeps on file" />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }>
        <Card>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.glyph,
                listing.tone === 'success'
                  ? styles.glyphSuccess
                  : listing.tone === 'danger'
                  ? styles.glyphDanger
                  : styles.glyphWarn,
              ]}>
              {listing.tone === 'success' ? (
                <CheckIcon color={Colors.success} size={15} />
              ) : (
                <Text
                  style={[
                    styles.glyphText,
                    listing.tone === 'danger' && styles.glyphTextDanger,
                  ]}>
                  !
                </Text>
              )}
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Listing status</Text>
              <Text style={styles.copy}>{listing.message}</Text>
            </View>
            {!!shop?.status && <StatusBadge status={shop.status} />}
          </View>

          <View style={styles.accountRow}>
            <View style={styles.flex}>
              <Text style={styles.accountLabel}>Supplier account</Text>
              {!!accountMessage && (
                <Text style={styles.copy}>{accountMessage}</Text>
              )}
            </View>
            {accountLoading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : accountStatus ? (
              <StatusBadge status={accountStatus} />
            ) : (
              <Text style={styles.unknown}>—</Text>
            )}
          </View>

          <Text style={styles.helper}>
            Ops suspend a shop when a required document lapses. If your status
            changes and you don't know why, raise a support ticket and ops will
            tell you which document they need.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>
            Documents Aqua Flow keeps on file
          </Text>
          <Text style={styles.helper}>
            These were collected with your application. The app can't yet show
            their approval state or expiry dates — that view is still being
            built.
          </Text>
          <View style={styles.docs}>
            {REQUIRED_DOCUMENTS.map(doc => (
              <View key={doc.name} style={styles.doc}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docWhy}>{doc.why}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Need to send a new document?</Text>
          <Text style={styles.copy}>
            Uploading from the app isn't available yet. Raise a support ticket
            and ops will take the file, renew it and update your record.
          </Text>
          <AppButton
            title="Raise a support ticket"
            small
            block={false}
            onPress={raiseTicket}
            style={styles.action}
          />
        </Card>

        <InfoNote>
          Your documents themselves are never shown to customers.
        </InfoNote>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  statusRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  glyph: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphSuccess: {backgroundColor: Colors.successBg},
  glyphWarn: {backgroundColor: Colors.warningBg},
  glyphDanger: {backgroundColor: Colors.dangerBg},
  glyphText: {fontSize: 14, fontWeight: '800', color: Colors.warningText},
  glyphTextDanger: {color: Colors.danger},

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  accountLabel: {fontSize: 13.5, fontWeight: '800', color: Colors.text},
  unknown: {fontSize: 13, color: Colors.textMuted},

  cardTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  copy: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 3,
  },
  helper: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 10,
  },

  docs: {gap: 8, marginTop: 12},
  doc: {
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  docName: {fontSize: 13.5, fontWeight: '800', color: Colors.text},
  docWhy: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},

  action: {marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 18},
});

export default ComplianceScreen;
