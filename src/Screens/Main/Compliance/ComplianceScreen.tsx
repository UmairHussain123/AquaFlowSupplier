import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {CheckIcon} from '../../../Component/Icons/TabIcons';
import {formatHolidayDate} from '../../../helper/dateHelper';
import {
  complianceStatusLabel,
  daysUntil,
  getComplianceSummary,
  type ComplianceSummary,
} from '../../../Server/Compliance/ComplianceApi';

/**
 * SC2 — Compliance centre.
 *
 * Documents are held and verified by ops: the Aquago Supplier API exposes no
 * document endpoints, so this screen shows the evidence state and routes a
 * renewal into a support ticket, which is the channel that does exist.
 */
const ComplianceScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setSummary(await getComplianceSummary());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <ScreenLoader />;

  const startRenewal = (documentName: string) =>
    navigation.navigate(Route.CreateTicketScreen, {
      category: 'general',
      subject: `Document renewal — ${documentName}`,
    });

  return (
    <View style={styles.screen}>
      <AppHeader title="Compliance" />

      <ScrollView contentContainerStyle={styles.body}>
        {!!summary?.banner && (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>{summary.banner.message}</Text>
            <Text style={styles.bannerBody}>
              If it expires, your shop stops receiving new orders until ops
              approve the new report. Reminders go out at 30, 14, 7 and 1 day.
            </Text>
            <AppButton
              title="Start a renewal"
              variant="dark"
              small
              onPress={() => startRenewal('Lab water test')}
              style={styles.bannerAction}
            />
          </View>
        )}

        <Card flush>
          {summary?.documents.map((doc, index) => {
            const days = daysUntil(doc.valid_till);
            const expiring = doc.status === 'expiring' || doc.status === 'expired';

            return (
              <View
                key={doc.id}
                style={[
                  styles.docRow,
                  index < (summary?.documents.length ?? 0) - 1 && styles.docDivider,
                ]}>
                <View style={[styles.docGlyph, expiring && styles.docGlyphWarn]}>
                  {expiring ? (
                    <Text style={styles.docGlyphWarnText}>!</Text>
                  ) : (
                    <CheckIcon color={Colors.success} size={14} />
                  )}
                </View>

                <View style={styles.flex}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text
                    style={[styles.docMeta, expiring && styles.docMetaWarn]}>
                    {doc.valid_till
                      ? `valid till ${formatHolidayDate(doc.valid_till.slice(0, 10))}${
                          days !== null && days <= 30 ? ` · ${days}d left` : ''
                        }`
                      : complianceStatusLabel(doc.status)}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => startRenewal(doc.name)}>
                  <Text style={styles.docAction}>
                    {expiring ? 'Renew' : 'Replace'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>What customers see</Text>
          <View style={styles.publicLine}>
            <Text style={styles.publicText}>{summary?.customerVisible}</Text>
          </View>
          <Text style={styles.helper}>
            Your documents themselves are never shown publicly — only the
            evidence type and valid-through date.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Version history</Text>
          <View style={styles.history}>
            {summary?.history.map(entry => (
              <Text key={`${entry.date}-${entry.action}`} style={styles.historyLine}>
                {entry.date} · {entry.action}
              </Text>
            ))}
          </View>
        </Card>

        <InfoNote>
          Uploading and approving evidence happens on the ops side. Raising a
          renewal here opens a support ticket so ops know a new document is
          coming.
        </InfoNote>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  banner: {backgroundColor: Colors.warningBg, borderRadius: 16, padding: 15, gap: 8},
  bannerTitle: {fontSize: 14.5, fontWeight: '800', color: Colors.warningText},
  bannerBody: {fontSize: 12.5, color: Colors.warningText2, lineHeight: 19},
  bannerAction: {marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 18},

  docRow: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docDivider: {borderBottomWidth: 1, borderBottomColor: Colors.borderSoft2},
  docGlyph: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docGlyphWarn: {backgroundColor: Colors.warningBg},
  docGlyphWarnText: {fontSize: 14, fontWeight: '800', color: Colors.warningText},
  docName: {fontSize: 14, fontWeight: '800', color: Colors.text},
  docMeta: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  docMetaWarn: {color: Colors.warningText},
  docAction: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},

  cardTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  publicLine: {
    backgroundColor: Colors.successBg,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  publicText: {fontSize: 12.5, color: Colors.successText, lineHeight: 19},
  helper: {fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 9},

  history: {gap: 6, marginTop: 10},
  historyLine: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});

export default ComplianceScreen;
