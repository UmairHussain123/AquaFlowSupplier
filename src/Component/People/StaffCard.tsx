import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../../Constant/Colors';
import Card from '../Common/Card';
import StatusBadge from '../Common/StatusBadge';
import {formatPhoneDisplay} from '../../helper/phoneHelper';
import {formatDateTime} from '../../helper/dateHelper';
import {initials} from '../../helper/helperFunction';
import {
  staffRoleLabel,
  type StaffMember,
} from '../../Server/Staff/StaffApi';

/**
 * One manager or rider in three tight lines: who and where, how to reach
 * them, and when they last signed in — with Edit / Remove as text actions
 * rather than a full-width button row.
 */
const StaffCard: React.FC<{
  member: StaffMember;
  revoking?: boolean;
  onPress: () => void;
  onRevoke: () => void;
}> = ({member, revoking = false, onPress, onRevoke}) => {
  const contact = [
    member.email,
    member.phone ? formatPhoneDisplay(member.phone) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const assignments = member.assignments ?? [];
  const role = assignments.length
    ? assignments.map(a => staffRoleLabel(a.role)).join(', ')
    : null;
  const shops = assignments
    .map(a => a.shop_name ?? `Shop #${a.shop_id}`)
    .join(', ');

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(member.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {member.name || '—'}
            </Text>
            <Text style={styles.assignment} numberOfLines={1}>
              {role ? (
                <>
                  <Text style={styles.role}>{role}</Text>
                  {` · ${shops}`}
                </>
              ) : (
                'No shop assigned'
              )}
            </Text>
          </View>
          <StatusBadge status={member.status} uppercase={false} />
        </View>

        {!!contact && (
          <Text style={styles.contact} numberOfLines={1}>
            {contact}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.meta} numberOfLines={1}>
            Last sign-in{' '}
            {member.last_login_at
              ? formatDateTime(member.last_login_at)
              : 'never'}
          </Text>
          <TouchableOpacity
            onPress={onPress}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 4}}>
            <Text style={styles.edit}>Edit</Text>
          </TouchableOpacity>
          <View style={styles.dot} />
          {revoking ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <TouchableOpacity
              onPress={onRevoke}
              hitSlop={{top: 8, bottom: 8, left: 4, right: 8}}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {padding: 12, borderRadius: 16},
  flex: {flex: 1},
  head: {flexDirection: 'row', alignItems: 'center', gap: 10},
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 13, fontWeight: '800', color: Colors.primary},
  name: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  assignment: {fontSize: 12, color: Colors.textSecondary, marginTop: 1},
  role: {fontWeight: '800', color: Colors.slate},
  contact: {fontSize: 12, color: Colors.textSecondary, marginTop: 8},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft2,
  },
  meta: {flex: 1, fontSize: 11.5, color: Colors.textMuted},
  edit: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
  dot: {width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.borderIdle},
  remove: {fontSize: 12.5, fontWeight: '800', color: Colors.danger},
});

export default StaffCard;
