import React, {useEffect, useState} from 'react';
import {ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';

import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import Route from '../../Constant/NavigationStrings';
import AppButton from '../../Component/Common/AppButton';
import Card from '../../Component/Common/Card';
import EmptyState from '../../Component/Common/EmptyState';
import Pill from '../../Component/Common/Pill';
import {formatDateTime} from '../../helper/dateHelper';
import {getSubmittedApplication} from '../../helper/opsDraft';
import type {SupplierApplication} from '../../Server/AuthType/authType';

/**
 * SA6 — application status.
 *
 * `POST /supplier/apply` returns the application; there is no
 * `GET /supplier/applications/{id}` on the supplier API, so the screen shows
 * the submitted copy held on the device. Ops decisions arrive by email, and
 * once approved the same credentials sign in on SA1.
 */
type Stage = {label: string; detail?: string; state: 'done' | 'current' | 'todo'};

const stagesFor = (application: SupplierApplication): Stage[] => {
  const status = application.status?.toLowerCase() ?? 'submitted';
  const reviewed = !!application.reviewed_at;
  const approved = status === 'approved' || status === 'active';
  const changes = status === 'changes_required' || status === 'rejected';

  return [
    {
      label: 'Submitted',
      detail: formatDateTime(application.submitted_at),
      state: 'done',
    },
    {
      label: 'Under review',
      detail: reviewed
        ? `${formatDateTime(application.reviewed_at)}${
            application.reviewed_by ? ` · ${application.reviewed_by}` : ''
          }`
        : `Waiting ${application.waiting_days} day${
            application.waiting_days === 1 ? '' : 's'
          }`,
      state: reviewed ? 'done' : 'current',
    },
    {
      label: changes ? 'Changes required' : 'Decision',
      detail: changes
        ? application.rejection_reason ?? 'Waiting for your reupload'
        : 'Ops decision',
      state: changes ? 'current' : approved ? 'done' : 'todo',
    },
    {
      label: 'Approved & shop activation',
      state: approved ? 'done' : 'todo',
    },
  ];
};

const ApplicationStatusScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const [application, setApplication] = useState<SupplierApplication | null>(
    route?.params?.application ?? null,
  );
  const [loading, setLoading] = useState(!route?.params?.application);

  useEffect(() => {
    if (application) return;
    getSubmittedApplication<SupplierApplication>().then(saved => {
      setApplication(saved);
      setLoading(false);
    });
  }, [application]);

  if (loading) return <View style={styles.screen} />;

  if (!application) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="No application on this device"
          message="Apply to become a supplier, or sign in if ops have already approved your shop."
          actionLabel="Back to sign in"
          onAction={() => navigation.replace(Route.Login)}
        />
      </View>
    );
  }

  const stages = stagesFor(application);
  const changes =
    application.status === 'changes_required' || application.status === 'rejected';
  const missingDocs =
    application.documents.required - application.documents.uploaded;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Your application</Text>
          <Pill
            label={application.status.replace(/_/g, ' ')}
            tone={changes ? 'warning' : 'primary'}
            uppercase
          />
        </View>
        <Text style={styles.headerMeta}>
          SUP-{application.id} · submitted {formatDateTime(application.submitted_at)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {changes && (
          <View style={styles.attention}>
            <Text style={styles.attentionTitle}>
              {application.rejection_reason
                ? 'Ops need something changed'
                : 'Items need your attention'}
            </Text>
            {!!application.rejection_reason && (
              <View style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  {application.rejection_reason}
                </Text>
              </View>
            )}
            {missingDocs > 0 && (
              <View style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>
                  {missingDocs} document{missingDocs === 1 ? '' : 's'} still to be
                  handed to ops.
                </Text>
              </View>
            )}
          </View>
        )}

        <Card>
          {stages.map((stage, index) => (
            <View key={stage.label} style={styles.stageRow}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    stage.state === 'done' && styles.nodeDone,
                    stage.state === 'current' && styles.nodeCurrent,
                  ]}
                />
                {index < stages.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      stage.state === 'done' && styles.lineDone,
                    ]}
                  />
                )}
              </View>

              <View style={styles.stageText}>
                <Text
                  style={[
                    styles.stageLabel,
                    stage.state === 'todo' && styles.stageLabelTodo,
                    stage.state === 'current' && styles.stageLabelCurrent,
                  ]}>
                  {stage.label}
                </Text>
                {!!stage.detail && (
                  <Text style={styles.stageDetail}>{stage.detail}</Text>
                )}
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Proposed shop</Text>
          <Text style={styles.shopName}>
            {application.proposed_shop.public_name}
            {application.proposed_shop.branch_name
              ? ` · ${application.proposed_shop.branch_name}`
              : ''}
          </Text>
          <Text style={styles.shopLine}>
            {application.proposed_shop.address_line}
          </Text>
          <Text style={styles.shopMeta}>
            {application.proposed_shop.area} · {application.proposed_shop.city}
          </Text>
          <Text style={styles.shopMeta}>
            {application.proposed_shop.latitude},{' '}
            {application.proposed_shop.longitude}
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Documents</Text>
          <Text style={styles.shopLine}>
            {application.documents.uploaded} of {application.documents.required}{' '}
            received by ops.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>While you wait</Text>
          <Text style={styles.shopLine}>
            Nothing goes live until approval. Once ops approve, sign in with the
            same email and password — your catalog, hours and delivery zones are
            set up from Shop settings.
          </Text>
        </Card>

        <AppButton
          title="Back to sign in"
          variant="dark"
          onPress={() => navigation.replace(Route.Login)}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  header: {backgroundColor: Colors.primaryDark, padding: 20, gap: 12},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  headerTitle: {flex: 1, fontSize: 16.5, fontWeight: '800', color: Colors.white},
  headerMeta: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textOnDark,
  },

  body: {padding: 20, gap: 13, paddingBottom: 34},

  attention: {backgroundColor: Colors.warningBg, borderRadius: 16, padding: 15, gap: 9},
  attentionTitle: {fontSize: 14.5, fontWeight: '800', color: Colors.warningText},
  bulletRow: {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    marginTop: 6,
  },
  bulletText: {flex: 1, fontSize: 13, color: Colors.warningText2, lineHeight: 20},

  stageRow: {flexDirection: 'row', gap: 12},
  rail: {alignItems: 'center', width: 16},
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.borderIdle,
  },
  nodeDone: {backgroundColor: Colors.success, borderColor: Colors.success},
  nodeCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.warning,
    borderColor: Colors.warningRing,
    borderWidth: 4,
  },
  line: {flex: 1, width: 2, backgroundColor: '#E7EDF4'},
  lineDone: {backgroundColor: Colors.success},
  stageText: {flex: 1, paddingBottom: 15},
  stageLabel: {fontSize: 14, fontWeight: '800', color: Colors.text},
  stageLabelTodo: {color: Colors.textFaint, fontWeight: '700'},
  stageLabelCurrent: {color: Colors.warningText},
  stageDetail: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},

  cardTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  shopName: {fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 8},
  shopLine: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },
  shopMeta: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

export default ApplicationStatusScreen;
